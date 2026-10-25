<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Category;
use App\Models\Cheque;
use App\Models\Debt;
use App\Models\Goal;
use App\Models\Installment;
use App\Models\Scenario;
use App\Models\Setting;
use App\Models\Transaction;
use App\Support\JalaliDate;

final class Forecast
{
    private const LIQUID_TYPES = ['cash', 'bank', 'card', 'wallet', 'savings'];

    public function __construct(
        private readonly Ledger $ledger,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function run(int $horizonDays = 90): array
    {
        $today = $this->ledger->today();
        $days = max(7, min(730, $horizonDays));
        $accounts = Account::query()
            ->whereIn('type', self::LIQUID_TYPES)
            ->where('archived', false)
            ->where('include_in_net_worth', true)
            ->orderBy('name')
            ->get();

        $balances = $this->ledger->balances();
        $accountBalances = [];
        $startBalance = 0;
        foreach ($accounts as $account) {
            $balance = $balances[$account->id] ?? 0;
            $accountBalances[$account->id] = $balance;
            $startBalance += $balance;
        }

        $spendingAccount = $this->primaryAccount($accounts, 'expense') ?? $accounts->first();
        $incomeAccount = $this->primaryAccount($accounts, 'income') ?? $spendingAccount;
        $fallbackAccountId = $spendingAccount?->id ?? 0;

        $history = [];
        for ($i = 3; $i >= 1; $i--) {
            $history[] = $today->addMonths(-$i);
        }

        $categoryMonths = [];
        $incomeMonths = [];
        $incomeDays = [];
        foreach ($history as $index => $month) {
            $from = $month->startOfMonth();
            $to = $month->endOfMonth();
            foreach ($this->ledger->categoryDirect('expense', $from, $to) as $categoryId => $amount) {
                $categoryMonths[$categoryId] ??= array_fill(0, count($history), 0);
                $categoryMonths[$categoryId][$index] = $amount;
            }
            $totals = $this->ledger->totalsBetween($from, $to);
            $incomeMonths[] = $totals['income'];
            foreach (Transaction::query()->where('kind', 'income')->whereBetween('date_jalali', [$from->toString(), $to->toString()])->get() as $transaction) {
                $date = JalaliDate::fromString($transaction->date_jalali);
                if ($date !== null) {
                    $incomeDays[] = $date->day;
                }
            }
        }

        $loanInterestCategoryId = Category::query()->where('slug', 'loan_interest')->value('id');
        if ($loanInterestCategoryId !== null) {
            unset($categoryMonths[$loanInterestCategoryId]);
        }

        $medians = [];
        $lows = [];
        $highs = [];
        foreach ($categoryMonths as $values) {
            $medians[] = $this->median($values);
            $lows[] = $this->quantile($values, 0.25);
            $highs[] = $this->quantile($values, 0.75);
        }
        $baselineMonthly = (int) array_sum($medians);
        $baselineLow = (int) array_sum($lows);
        $baselineHigh = (int) array_sum($highs);
        $spreadMonthly = max(0, $baselineHigh - $baselineLow);
        $salaryMonthly = (int) $this->median($incomeMonths);
        $salaryPayday = $incomeDays === [] ? 30 : min(29, max(1, (int) round($this->median($incomeDays))));

        /** @var array<string, list<array<string, mixed>>> $events */
        $events = [];
        $addEvent = function (JalaliDate $date, array $event) use (&$events, $today, $days): void {
            if ($date->isBefore($today)) {
                $date = $today;
            }
            $offset = $today->diffDays($date);
            if ($offset > $days) {
                return;
            }
            $events[$date->toString()][] = $event;
        };

        foreach (Installment::query()->with('loan')->get() as $installment) {
            $loan = $installment->loan;
            if ($loan === null || $loan->status !== 'active' || $installment->paid_txn_id !== null) {
                continue;
            }
            $due = JalaliDate::fromString($installment->deferred_to_jalali ?? $installment->due_jalali);
            if ($due === null) {
                continue;
            }
            $state = $this->ledger->installmentState($installment, $loan, $today);
            $accountId = $this->accountExists($accounts, $loan->account_id)
                ? $loan->account_id
                : $fallbackAccountId;
            $addEvent($due, [
                'type' => 'installment',
                'title' => "قسط {$installment->number} {$loan->lender}",
                'amount' => (int) $installment->amount + $state['penalty'],
                'direction' => 'out',
                'account_id' => $accountId,
                'ref_id' => $installment->id,
            ]);
        }

        foreach (Cheque::query()->where('status', 'pending')->get() as $cheque) {
            $due = JalaliDate::fromString($cheque->due_jalali);
            if ($due === null) {
                continue;
            }
            $accountId = $this->accountExists($accounts, $cheque->account_id)
                ? (int) $cheque->account_id
                : $fallbackAccountId;
            $addEvent($due, [
                'type' => 'cheque',
                'title' => 'چک '.$cheque->counterparty,
                'amount' => (int) $cheque->amount,
                'direction' => $cheque->direction === 'issued' ? 'out' : 'in',
                'account_id' => $accountId,
                'ref_id' => $cheque->id,
            ]);
        }

        foreach (Debt::query()->with('person')->where('status', 'active')->get() as $debt) {
            $due = JalaliDate::fromString($debt->due_jalali);
            $outstanding = $this->ledger->debtOutstanding($debt);
            if ($due === null || $outstanding <= 0) {
                continue;
            }
            $accountId = $this->accountExists($accounts, $debt->account_id)
                ? (int) $debt->account_id
                : $fallbackAccountId;
            $addEvent($due, [
                'type' => 'debt',
                'title' => ($debt->direction === 'lent' ? 'دریافت طلب از ' : 'پرداخت بدهی به ').($debt->person?->name ?? 'شخص'),
                'amount' => $outstanding,
                'direction' => $debt->direction === 'lent' ? 'in' : 'out',
                'account_id' => $accountId,
                'ref_id' => $debt->id,
            ]);
        }

        $currentMonthIndex = $today->year * 12 + ($today->month - 1);
        foreach (Scenario::query()->where('active', true)->get() as $scenario) {
            $startIndex = $currentMonthIndex + $scenario->start_month_offset;
            $duration = max(1, $scenario->duration_months);
            for ($i = 0; $i < $duration; $i++) {
                $monthIndex = $startIndex + $i;
                if ($monthIndex < $currentMonthIndex) {
                    continue;
                }
                $year = intdiv($monthIndex, 12);
                $month = $monthIndex % 12 + 1;
                $date = new JalaliDate($year, $month, 1);
                if ($date->isBefore($today)) {
                    $date = $today;
                }
                if ($scenario->monthly_delta !== 0) {
                    $addEvent($date, [
                        'type' => 'scenario',
                        'title' => $scenario->name,
                        'amount' => abs((int) $scenario->monthly_delta),
                        'direction' => (int) $scenario->monthly_delta >= 0 ? 'in' : 'out',
                        'account_id' => $fallbackAccountId,
                        'ref_id' => $scenario->id,
                    ]);
                }
            }
            if ($scenario->one_time_delta !== 0) {
                $year = intdiv($startIndex, 12);
                $month = $startIndex % 12 + 1;
                $date = new JalaliDate($year, $month, 1);
                if ($date->isBefore($today)) {
                    $date = $today;
                }
                $addEvent($date, [
                    'type' => 'scenario',
                    'title' => $scenario->name,
                    'amount' => abs((int) $scenario->one_time_delta),
                    'direction' => (int) $scenario->one_time_delta >= 0 ? 'in' : 'out',
                    'account_id' => $fallbackAccountId,
                    'ref_id' => $scenario->id,
                ]);
            }
        }

        $points = [];
        $shortfalls = [];
        $lowestBalance = $startBalance;
        $lowestPoint = null;
        $projectedMonthIncome = 0;
        $projectedMonthExpense = 0;
        $currentMonthKey = $today->monthKey();
        $shortfallSeen = [];
        $inflation = max(0, (int) Setting::current()->inflation_percent);

        for ($offset = 0; $offset <= $days; $offset++) {
            $date = $today->addDays($offset);
            $dateKey = $date->toString();
            $dayEvents = $events[$dateKey] ?? [];
            $inflow = 0;
            $outflow = 0;
            $baseline = 0;

            if ($offset > 0 && $baselineMonthly > 0 && $spendingAccount !== null) {
                $daysInMonth = $date->monthDays();
                $factor = in_array($date->weekday(), [5, 6], true) ? 1.18 : 0.97;
                $baseline = (int) round(($baselineMonthly * $factor) / $daysInMonth);
                $accountBalances[$spendingAccount->id] -= $baseline;
                $outflow += $baseline;
            }

            if ($offset > 0 && $salaryMonthly > 0 && $date->day === $salaryPayday && $incomeAccount !== null) {
                $accountBalances[$incomeAccount->id] += $salaryMonthly;
                $inflow += $salaryMonthly;
                $dayEvents[] = [
                    'type' => 'salary',
                    'title' => 'درآمد ماهانه (تخمینی)',
                    'amount' => $salaryMonthly,
                    'direction' => 'in',
                    'account_id' => $incomeAccount->id,
                    'ref_id' => null,
                ];
            }

            foreach ($dayEvents as $event) {
                $accountId = (int) $event['account_id'];
                if (! array_key_exists($accountId, $accountBalances)) {
                    $accountBalances[$accountId] = 0;
                }
                $amount = max(0, (int) $event['amount']);
                if ($event['direction'] === 'in') {
                    $accountBalances[$accountId] += $amount;
                    $inflow += $amount;
                } else {
                    $accountBalances[$accountId] -= $amount;
                    $outflow += $amount;
                }
            }

            if (str_starts_with($dateKey, $currentMonthKey) && $offset > 0) {
                $projectedMonthIncome += $inflow;
                $projectedMonthExpense += $outflow;
            }

            $total = array_sum($accountBalances);
            if ($total < $lowestBalance) {
                $lowestBalance = $total;
            }

            $uncertainty = $baselineMonthly > 0 ? $spreadMonthly * sqrt($offset / 30) : 0;
            $point = [
                'offset' => $offset,
                'date' => $dateKey,
                'iso' => $date->toIso(),
                'balance' => (int) $total,
                'lower' => (int) ($total - $uncertainty),
                'upper' => (int) ($total + $uncertainty),
                'real' => (int) ($total / (1 + $inflation / 100) ** ($offset / 365)),
                'inflow' => $inflow,
                'outflow' => $outflow,
                'baseline' => $baseline,
                'events' => $dayEvents,
                'account_balances' => $accountBalances,
            ];
            if ($lowestPoint === null || $point['balance'] < $lowestPoint['balance']) {
                $lowestPoint = $point;
            }
            $points[] = $point;

            foreach ($accounts as $account) {
                $balance = $accountBalances[$account->id] ?? 0;
                if ($balance >= 0) {
                    unset($shortfallSeen[$account->id]);

                    continue;
                }
                if (isset($shortfallSeen[$account->id]) && $offset - $shortfallSeen[$account->id] < 7) {
                    continue;
                }
                $shortfallSeen[$account->id] = $offset;
                $suggested = $accounts
                    ->filter(fn (Account $candidate): bool => $candidate->id !== $account->id && ($accountBalances[$candidate->id] ?? 0) > abs($balance))
                    ->sortByDesc(fn (Account $candidate): int => $accountBalances[$candidate->id] ?? 0)
                    ->first();
                $shortfalls[] = [
                    'date' => $dateKey,
                    'offset' => $offset,
                    'account_id' => $account->id,
                    'account_name' => $account->name,
                    'amount' => abs($balance),
                    'reason' => $dayEvents === [] ? 'هزینه‌های روزانه' : implode('، ', array_column($dayEvents, 'title')),
                    'suggested_id' => $suggested?->id,
                    'suggested_name' => $suggested?->name,
                ];
            }
        }

        $unpaid = Installment::query()->whereNull('paid_txn_id')->get();
        $debtFree = null;
        foreach ($unpaid as $installment) {
            $due = $installment->deferred_to_jalali ?? $installment->due_jalali;
            if ($debtFree === null || strcmp($due, $debtFree) > 0) {
                $debtFree = $due;
            }
        }

        $actualMonth = $this->ledger->monthTotals();
        $goals = [];
        foreach (Goal::query()->get() as $goal) {
            $progress = $this->ledger->goalProgress($goal);
            $goals[] = ['goal' => $goal, ...$progress];
        }

        return [
            'points' => $points,
            'start_balance' => $startBalance,
            'end_balance' => $points[array_key_last($points)]['balance'] ?? $startBalance,
            'lowest_balance' => $lowestBalance,
            'lowest_point' => $lowestPoint,
            'shortfalls' => $shortfalls,
            'baseline_monthly' => $baselineMonthly,
            'baseline_low' => $baselineLow,
            'baseline_high' => $baselineHigh,
            'salary_monthly' => $salaryMonthly,
            'salary_payday' => $salaryPayday,
            'end_of_month_savings' => (int) round(
                $actualMonth['income'] + $projectedMonthIncome - $actualMonth['expense'] - $projectedMonthExpense
            ),
            'debt_free' => $debtFree,
            'average_monthly_net' => $this->ledger->averageMonthlyNet(3),
            'goals' => $goals,
        ];
    }

    private function primaryAccount($accounts, string $kind): ?Account
    {
        $counts = [];
        foreach (Transaction::query()->where('kind', $kind)->get() as $transaction) {
            $counts[$transaction->account_id] = ($counts[$transaction->account_id] ?? 0) + 1;
        }
        arsort($counts);
        $id = array_key_first($counts);

        return $id !== null ? $accounts->firstWhere('id', $id) : null;
    }

    private function accountExists($accounts, ?int $id): bool
    {
        return $id !== null && $accounts->contains(fn (Account $account): bool => $account->id === $id);
    }

    /**
     * @param  list<int>  $values
     */
    private function median(array $values): float
    {
        if ($values === []) {
            return 0.0;
        }
        sort($values);
        $count = count($values);
        $middle = intdiv($count, 2);

        return $count % 2 === 0
            ? (($values[$middle - 1] + $values[$middle]) / 2)
            : $values[$middle];
    }

    /**
     * @param  list<int>  $values
     */
    private function quantile(array $values, float $q): float
    {
        if ($values === []) {
            return 0.0;
        }
        sort($values);
        $position = (count($values) - 1) * $q;
        $base = (int) floor($position);
        $rest = $position - $base;

        return ($values[$base] ?? 0) + $rest * (($values[$base + 1] ?? $values[$base] ?? 0) - ($values[$base] ?? 0));
    }
}
