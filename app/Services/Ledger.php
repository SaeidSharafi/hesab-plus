<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Asset;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Cheque;
use App\Models\Debt;
use App\Models\Goal;
use App\Models\Installment;
use App\Models\Loan;
use App\Models\Lot;
use App\Models\Person;
use App\Models\Transaction;
use App\Support\JalaliDate;
use Illuminate\Support\Collection;

final class Ledger
{
    /** @var Collection<int, Transaction>|null */
    private ?Collection $transactionCache = null;

    /** @var Collection<int, Account>|null */
    private ?Collection $accountCache = null;

    /** @var array<int, int>|null */
    private ?array $balanceCache = null;

    /** @var Collection<int, Category>|null */
    private ?Collection $categoryCache = null;

    public function __construct(
        private readonly ?JalaliDate $today = null,
    ) {}

    public function today(): JalaliDate
    {
        return $this->today ?? JalaliDate::today();
    }

    // -----------------------------------------------------------------
    // Core derivation
    // -----------------------------------------------------------------

    /**
     * @return Collection<int, Transaction>
     */
    public function transactions(): Collection
    {
        return $this->transactionCache ??= Transaction::query()
            ->orderByDesc('date_jalali')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @return Collection<int, Account>
     */
    public function accounts(): Collection
    {
        return $this->accountCache ??= Account::query()->orderBy('name')->get();
    }

    /**
     * @return Collection<int, Category>
     */
    public function categories(): Collection
    {
        return $this->categoryCache ??= Category::query()->orderBy('name')->get();
    }

    public function transactionDelta(Transaction $transaction, int $accountId): int
    {
        $amount = max(0, (int) $transaction->amount);
        $fee = max(0, (int) $transaction->fee);

        if ($transaction->kind === 'expense') {
            return $transaction->account_id === $accountId ? -$amount : 0;
        }
        if ($transaction->kind === 'income') {
            return $transaction->account_id === $accountId ? $amount : 0;
        }
        if ($transaction->kind === 'transfer') {
            if ($transaction->account_id === $accountId) {
                return -($amount + $fee);
            }
            if ($transaction->to_account_id === $accountId) {
                return $amount;
            }

            return 0;
        }

        if ($transaction->account_id !== $accountId) {
            return 0;
        }

        return match ($transaction->cash_direction) {
            'in' => $amount - $fee,
            'out' => -($amount + $fee),
            default => 0,
        };
    }

    /**
     * @return array<int, int> account id => balance in Rial
     */
    public function balances(): array
    {
        if ($this->balanceCache !== null) {
            return $this->balanceCache;
        }

        $balances = [];
        foreach ($this->accounts() as $account) {
            $balances[$account->id] = (int) $account->opening_balance;
        }

        foreach ($this->transactions() as $transaction) {
            foreach ($balances as $accountId => $balance) {
                $delta = $this->transactionDelta($transaction, $accountId);
                if ($delta !== 0) {
                    $balances[$accountId] = $balance + $delta;
                }
            }
        }

        return $this->balanceCache = $balances;
    }

    /**
     * @return list<array{account: Account, balance: int}>
     */
    public function accountRows(bool $includeArchived = false): array
    {
        $balances = $this->balances();
        $rows = [];

        foreach ($this->accounts() as $account) {
            if (! $includeArchived && $account->archived) {
                continue;
            }
            $rows[] = ['account' => $account, 'balance' => $balances[$account->id] ?? 0];
        }

        return $rows;
    }

    /**
     * @return array{
     *     account_balances:int, portfolio_value:int, receivables:int, assets:int,
     *     payables:int, loan_principal:int, liabilities:int, net_worth:int, liquid:int
     * }
     */
    public function netWorth(): array
    {
        $balances = $this->balances();
        $accountTotal = 0;
        $liquid = 0;
        foreach ($this->accounts() as $account) {
            if ($account->archived || ! $account->include_in_net_worth) {
                continue;
            }
            $balance = $balances[$account->id] ?? 0;
            $accountTotal += $balance;
            if (in_array($account->type, ['cash', 'bank', 'card', 'wallet', 'savings'], true)) {
                $liquid += $balance;
            }
        }

        $portfolio = Portfolio::summary(
            Asset::query()->get(),
            Lot::query()->get()
        );

        $receivables = $this->debts()
            ->filter(fn (Debt $debt): bool => $debt->direction === 'lent')
            ->sum(fn (Debt $debt): int => $this->debtOutstanding($debt));
        $payables = $this->debts()
            ->filter(fn (Debt $debt): bool => $debt->direction === 'borrowed')
            ->sum(fn (Debt $debt): int => $this->debtOutstanding($debt));

        $loanPrincipal = 0;
        foreach (Installment::query()->with('loan')->get() as $installment) {
            if ($installment->paid_txn_id !== null || $installment->loan?->status !== 'active') {
                continue;
            }
            $loanPrincipal += (int) $installment->principal;
        }

        $assets = $accountTotal + $portfolio['market_value'] + $receivables;
        $liabilities = $payables + $loanPrincipal;

        return [
            'account_balances' => $accountTotal,
            'portfolio_value' => $portfolio['market_value'],
            'receivables' => (int) $receivables,
            'assets' => (int) $assets,
            'payables' => (int) $payables,
            'loan_principal' => $loanPrincipal,
            'liabilities' => (int) $liabilities,
            'net_worth' => (int) ($assets - $liabilities),
            'liquid' => (int) $liquid,
        ];
    }

    // -----------------------------------------------------------------
    // Loans
    // -----------------------------------------------------------------

    /**
     * @return array{
     *     status:string, days:int, due:string, effective_due:string, penalty:int, paid:bool,
     *     label:string
     * }
     */
    public function installmentState(Installment $installment, ?Loan $loan = null, ?JalaliDate $today = null): array
    {
        $today ??= $this->today();
        $effectiveDue = JalaliDate::fromString($installment->deferred_to_jalali ?? $installment->due_jalali)
            ?? $today;
        $days = $today->diffDays($effectiveDue);
        $paid = $installment->paid_txn_id !== null;

        if ($paid) {
            $status = 'paid';
        } elseif ($installment->deferred_to_jalali !== null && $days > 0) {
            $status = 'deferred';
        } else {
            $status = $days < 0 ? 'overdue' : ($days === 0 ? 'due' : 'upcoming');
        }

        $penalty = (int) $installment->penalty;
        if (! $paid && $days < 0 && $loan !== null) {
            $penalty += Amortization::penalty((int) $installment->amount, abs($days), (float) $loan->penalty_annual_percent);
        }

        $label = match ($status) {
            'paid' => 'پرداخت شده',
            'overdue' => 'معوق',
            'due' => 'سررسید امروز',
            'deferred' => 'به تعویق افتاده',
            default => $days.' روز مانده',
        };

        return [
            'status' => $status,
            'days' => $days,
            'due' => $installment->due_jalali,
            'effective_due' => $effectiveDue->toString(),
            'penalty' => $penalty,
            'paid' => $paid,
            'label' => $label,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function loanSummary(Loan $loan): array
    {
        $installments = $loan->installments()->get();
        $states = [];
        foreach ($installments as $installment) {
            $states[] = ['installment' => $installment, 'state' => $this->installmentState($installment, $loan)];
        }

        $paid = array_filter($states, fn (array $row): bool => $row['state']['paid']);
        $unpaid = array_values(array_filter($states, fn (array $row): bool => ! $row['state']['paid']));
        usort($unpaid, fn (array $a, array $b): int => strcmp($a['state']['effective_due'], $b['state']['effective_due']));

        $remainingPrincipal = array_sum(array_map(fn (array $row): int => (int) $row['installment']->principal, $unpaid));
        $remainingAmount = array_sum(array_map(fn (array $row): int => (int) $row['installment']->amount, $unpaid));
        $paidAmount = array_sum(array_map(fn (array $row): int => (int) $row['installment']->amount, $paid));
        $paidInterest = array_sum(array_map(fn (array $row): int => (int) $row['installment']->interest, $paid));
        $remainingInterest = array_sum(array_map(fn (array $row): int => (int) $row['installment']->interest, $unpaid));
        $penalty = array_sum(array_map(fn (array $row): int => (int) $row['state']['penalty'], $unpaid));
        $overdue = array_filter($states, fn (array $row): bool => $row['state']['status'] === 'overdue');

        $cashFlows = [[
            'amount' => (int) $loan->principal - (int) $loan->total_fee,
            'date' => JalaliDate::fromString($loan->disbursement_jalali)?->toIso() ?? $this->today()->toIso(),
        ]];
        foreach ($states as $row) {
            $cashFlows[] = [
                'amount' => -(int) $row['installment']->amount,
                'date' => JalaliDate::fromString($row['installment']->due_jalali)?->toIso() ?? $this->today()->toIso(),
            ];
        }

        $next = $unpaid[0] ?? null;
        $last = $unpaid === [] ? null : $unpaid[array_key_last($unpaid)];
        $count = $states === [] ? (int) $loan->installment_count : count($states);

        return [
            'loan' => $loan,
            'states' => $states,
            'paid_count' => count($paid),
            'total_count' => $count,
            'overdue_count' => count($overdue),
            'remaining_count' => count($unpaid),
            'paid_amount' => (int) $paidAmount,
            'remaining_amount' => (int) $remainingAmount,
            'remaining_principal' => (int) $remainingPrincipal,
            'paid_interest' => (int) $paidInterest,
            'remaining_interest' => (int) $remainingInterest,
            'penalty' => (int) $penalty,
            'progress' => $count > 0 ? (count($paid) / $count) * 100 : 0.0,
            'next' => $next,
            'payoff' => $last['state']['effective_due'] ?? null,
            'effective_rate' => Xirr::calculate($cashFlows),
        ];
    }

    public function loanTotals(): array
    {
        $principal = 0;
        $next = null;
        foreach (Loan::query()->with('installments')->where('status', 'active')->get() as $loan) {
            $summary = $this->loanSummary($loan);
            $principal += $summary['remaining_principal'];
            if ($summary['next'] !== null) {
                $candidate = $summary['next']['state']['effective_due'];
                if ($next === null || strcmp($candidate, $next) < 0) {
                    $next = $candidate;
                }
            }
        }

        return ['remaining_principal' => $principal, 'next_due' => $next];
    }

    // -----------------------------------------------------------------
    // Debts
    // -----------------------------------------------------------------

    /**
     * @return Collection<int, Debt>
     */
    public function debts(): Collection
    {
        return Debt::query()->get();
    }

    public function debtSettled(Debt $debt): int
    {
        return (int) collect($debt->settlements ?? [])->sum('amount');
    }

    public function debtOutstanding(Debt $debt): int
    {
        if ($debt->status === 'forgiven') {
            return 0;
        }

        return max(0, (int) $debt->amount - $this->debtSettled($debt));
    }

    /**
     * @return array{person: Person, balance:int, lent:int, borrowed:int, overdue:int, active:int, next:?Debt}
     */
    public function personSummary(Person $person): array
    {
        $debts = $person->debts()->where('status', 'active')->get();
        $lent = $debts->where('direction', 'lent')->sum(fn (Debt $debt): int => $this->debtOutstanding($debt));
        $borrowed = $debts->where('direction', 'borrowed')->sum(fn (Debt $debt): int => $this->debtOutstanding($debt));
        $overdue = $debts->filter(function (Debt $debt): bool {
            $due = JalaliDate::fromString($debt->due_jalali);

            return $due !== null && $this->today()->diffDays($due) < 0;
        })->count();
        $next = $debts
            ->filter(fn (Debt $debt): bool => JalaliDate::fromString($debt->due_jalali) !== null)
            ->sortBy('due_jalali')
            ->first();

        return [
            'person' => $person,
            'balance' => (int) ($lent - $borrowed),
            'lent' => (int) $lent,
            'borrowed' => (int) $borrowed,
            'overdue' => $overdue,
            'active' => $debts->count(),
            'next' => $next,
        ];
    }

    // -----------------------------------------------------------------
    // Obligations
    // -----------------------------------------------------------------

    /**
     * @return list<array<string, mixed>>
     */
    public function obligations(int $horizonDays = 30, bool $includeOverdue = true): array
    {
        $today = $this->today();
        $items = [];

        foreach (Installment::query()->with('loan')->get() as $installment) {
            $loan = $installment->loan;
            if ($loan === null || $loan->status !== 'active' || $installment->paid_txn_id !== null) {
                continue;
            }
            $state = $this->installmentState($installment, $loan, $today);
            if (! $includeOverdue && $state['days'] < 0) {
                continue;
            }
            if ($state['days'] > $horizonDays) {
                continue;
            }
            $items[] = [
                'type' => 'installment',
                'ref_id' => $installment->id,
                'installment_id' => $installment->id,
                'loan_id' => $loan->id,
                'cheque_id' => null,
                'debt_id' => null,
                'title' => "قسط {$installment->number} {$loan->lender}",
                'subtitle' => $state['label'],
                'amount' => (int) $installment->amount,
                'penalty' => $state['penalty'],
                'due' => $state['effective_due'],
                'days' => $state['days'],
                'status' => $state['status'],
                'account_id' => $loan->account_id,
                'direction' => 'out',
            ];
        }

        foreach (Cheque::query()->where('status', 'pending')->get() as $cheque) {
            $due = JalaliDate::fromString($cheque->due_jalali);
            if ($due === null) {
                continue;
            }
            $days = $today->diffDays($due);
            if (! $includeOverdue && $days < 0) {
                continue;
            }
            if ($days > $horizonDays) {
                continue;
            }
            $items[] = [
                'type' => 'cheque',
                'ref_id' => $cheque->id,
                'installment_id' => null,
                'loan_id' => null,
                'cheque_id' => $cheque->id,
                'debt_id' => null,
                'title' => 'چک '.($cheque->direction === 'issued' ? 'پرداختی به ' : 'دریافتی از ').$cheque->counterparty,
                'subtitle' => $cheque->bank.' · '.$cheque->number,
                'amount' => (int) $cheque->amount,
                'penalty' => 0,
                'due' => $cheque->due_jalali,
                'days' => $days,
                'status' => $days < 0 ? 'overdue' : ($days === 0 ? 'due' : 'upcoming'),
                'account_id' => $cheque->account_id,
                'direction' => $cheque->direction === 'issued' ? 'out' : 'in',
            ];
        }

        foreach (Debt::query()->with('person')->where('status', 'active')->get() as $debt) {
            $due = JalaliDate::fromString($debt->due_jalali);
            $outstanding = $this->debtOutstanding($debt);
            if ($due === null || $outstanding <= 0) {
                continue;
            }
            $days = $today->diffDays($due);
            if (! $includeOverdue && $days < 0) {
                continue;
            }
            if ($days > $horizonDays) {
                continue;
            }
            $items[] = [
                'type' => 'debt',
                'ref_id' => $debt->id,
                'installment_id' => null,
                'loan_id' => null,
                'cheque_id' => null,
                'debt_id' => $debt->id,
                'title' => ($debt->direction === 'lent' ? 'طلب از ' : 'بدهی به ').($debt->person?->name ?? 'شخص'),
                'subtitle' => $debt->note ?? 'تسویه نشده',
                'amount' => $outstanding,
                'penalty' => 0,
                'due' => $debt->due_jalali,
                'days' => $days,
                'status' => $days < 0 ? 'overdue' : ($days === 0 ? 'due' : 'upcoming'),
                'account_id' => $debt->account_id,
                'direction' => $debt->direction === 'lent' ? 'in' : 'out',
            ];
        }

        usort($items, fn (array $a, array $b): int => $a['days'] <=> $b['days']);

        return $items;
    }

    // -----------------------------------------------------------------
    // Reporting
    // -----------------------------------------------------------------

    public function monthTotals(?string $monthKey = null): array
    {
        $monthKey ??= $this->today()->monthKey();
        [$year, $month] = array_map('intval', explode('/', $monthKey));
        $from = new JalaliDate($year, $month, 1);
        $to = $from->endOfMonth();

        return $this->totalsBetween($from, $to);
    }

    /**
     * @return array{income:int,expense:int,loan_interest:int,net:int,savings_rate:float}
     */
    public function totalsBetween(JalaliDate $from, JalaliDate $to): array
    {
        $fromKey = $from->toString();
        $toKey = $to->toString();
        $income = 0;
        $expense = 0;
        $loanInterest = 0;

        foreach ($this->transactions() as $transaction) {
            if ($transaction->date_jalali < $fromKey || $transaction->date_jalali > $toKey) {
                continue;
            }
            if ($transaction->kind === 'income') {
                $income += (int) $transaction->amount;
            } elseif ($transaction->kind === 'expense') {
                $expense += (int) $transaction->amount;
            } elseif ($transaction->kind === 'loan') {
                $loanInterest += max(0, (int) $transaction->loan_interest);
            }
        }

        $totalExpense = $expense + $loanInterest;

        return [
            'income' => $income,
            'expense' => $totalExpense,
            'loan_interest' => $loanInterest,
            'net' => $income - $totalExpense,
            'savings_rate' => $income > 0 ? (($income - $totalExpense) / $income) * 100 : 0.0,
        ];
    }

    /**
     * Direct category totals (no parent rollup).
     *
     * @return array<int, int> category id => amount; 0 = uncategorized
     */
    public function categoryDirect(string $kind, ?JalaliDate $from = null, ?JalaliDate $to = null): array
    {
        $bySlug = $this->categories()->keyBy('slug');
        $loanInterestId = (int) ($bySlug->get('loan_interest')?->id ?? 0);
        $fromKey = $from?->toString();
        $toKey = $to?->toString();
        $totals = [];

        foreach ($this->transactions() as $transaction) {
            if ($fromKey !== null && $transaction->date_jalali < $fromKey) {
                continue;
            }
            if ($toKey !== null && $transaction->date_jalali > $toKey) {
                continue;
            }

            if ($kind === 'expense' && $transaction->kind === 'loan') {
                $interest = max(0, (int) $transaction->loan_interest);
                if ($interest > 0) {
                    $totals[$loanInterestId] = ($totals[$loanInterestId] ?? 0) + $interest;
                }

                continue;
            }
            if ($transaction->kind !== $kind) {
                continue;
            }

            $splits = $transaction->splits ?? [];
            if ($splits !== []) {
                $splitTotal = 0;
                foreach ($splits as $split) {
                    $amount = (int) ($split['amount'] ?? 0);
                    if ($amount <= 0) {
                        continue;
                    }
                    $categoryId = (int) ($split['category_id'] ?? 0);
                    $category = $this->categories()->firstWhere('id', $categoryId);
                    $key = $category !== null && $category->kind === $kind ? $categoryId : 0;
                    $totals[$key] = ($totals[$key] ?? 0) + $amount;
                    $splitTotal += $amount;
                }
                $remainder = (int) $transaction->amount - $splitTotal;
                if ($remainder !== 0) {
                    $categoryId = (int) ($transaction->category_id ?? 0);
                    $category = $this->categories()->firstWhere('id', $categoryId);
                    $key = $category !== null && $category->kind === $kind ? $categoryId : 0;
                    $totals[$key] = ($totals[$key] ?? 0) + $remainder;
                }

                continue;
            }

            $categoryId = (int) ($transaction->category_id ?? 0);
            $category = $this->categories()->firstWhere('id', $categoryId);
            $key = $category !== null && $category->kind === $kind ? $categoryId : 0;
            $totals[$key] = ($totals[$key] ?? 0) + (int) $transaction->amount;
        }

        return $totals;
    }

    /**
     * @return list<array{id:int,name:string,color:string,icon:string,direct:int,total:int,percent:float,children:list<array<string,mixed>>}>
     */
    public function categoryTree(string $kind, ?JalaliDate $from = null, ?JalaliDate $to = null): array
    {
        $direct = $this->categoryDirect($kind, $from, $to);
        $categories = $this->categories()->where('kind', $kind)->where('archived', false);
        $byParent = [];
        foreach ($categories as $category) {
            $byParent[$category->parent_id ?? 0][] = $category;
        }
        $total = array_sum($direct);

        $build = function (Category $category) use (&$build, $byParent, $direct, $total): array {
            $children = [];
            foreach ($byParent[$category->id] ?? [] as $child) {
                $node = $build($child);
                if ($node['total'] !== 0) {
                    $children[] = $node;
                }
            }
            usort($children, fn (array $a, array $b): int => $b['total'] <=> $a['total']);
            $directAmount = $direct[$category->id] ?? 0;
            $nodeTotal = $directAmount + array_sum(array_column($children, 'total'));

            return [
                'id' => $category->id,
                'name' => $category->name,
                'color' => $category->color,
                'icon' => $category->icon,
                'direct' => $directAmount,
                'total' => $nodeTotal,
                'percent' => $total > 0 ? ($nodeTotal / $total) * 100 : 0.0,
                'children' => $children,
            ];
        };

        $roots = [];
        foreach ($byParent[0] ?? [] as $category) {
            $node = $build($category);
            if ($node['total'] !== 0) {
                $roots[] = $node;
            }
        }
        usort($roots, fn (array $a, array $b): int => $b['total'] <=> $a['total']);

        if (($direct[0] ?? 0) !== 0) {
            $roots[] = [
                'id' => 0,
                'name' => 'دسته‌بندی نشده',
                'color' => '#94A3B8',
                'icon' => 'category',
                'direct' => $direct[0],
                'total' => $direct[0],
                'percent' => $total > 0 ? ($direct[0] / $total) * 100 : 0.0,
                'children' => [],
            ];
        }

        return $roots;
    }

    /**
     * @param  list<string>  $monthKeys
     * @return list<array{month:string,value:int}>
     */
    public function monthlySeries(array $monthKeys, string $kind): array
    {
        $values = array_fill_keys($monthKeys, 0);

        foreach ($this->transactions() as $transaction) {
            $month = substr($transaction->date_jalali, 0, 7);
            if (! array_key_exists($month, $values)) {
                continue;
            }
            if ($transaction->kind === $kind) {
                $values[$month] += (int) $transaction->amount;
            } elseif ($kind === 'expense' && $transaction->kind === 'loan') {
                $values[$month] += max(0, (int) $transaction->loan_interest);
            }
        }

        $result = [];
        foreach ($monthKeys as $month) {
            $result[] = ['month' => $month, 'value' => $values[$month]];
        }

        return $result;
    }

    /**
     * @return list<array{budget:Budget,category:?Category,spent:int,percent:float,status:string}>
     */
    public function budgetProgress(?string $monthKey = null): array
    {
        $today = $this->today();
        $monthKey ??= $today->monthKey();
        [$year, $month] = array_map('intval', explode('/', $monthKey));
        $from = new JalaliDate($year, $month, 1);
        $to = $from->endOfMonth();
        $direct = $this->categoryDirect('expense', $from, $to);
        $categories = $this->categories();
        $rows = [];

        foreach (Budget::query()->with('category')->get() as $budget) {
            if ($budget->category === null) {
                continue;
            }
            $ids = [$budget->category_id];
            $changed = true;
            while ($changed) {
                $changed = false;
                foreach ($categories as $category) {
                    if ($category->parent_id !== null && in_array($category->parent_id, $ids, true) && ! in_array($category->id, $ids, true)) {
                        $ids[] = $category->id;
                        $changed = true;
                    }
                }
            }

            $spent = 0;
            foreach ($ids as $id) {
                $spent += $direct[$id] ?? 0;
            }
            $percent = $budget->amount > 0 ? ($spent / $budget->amount) * 100 : 0.0;

            $rows[] = [
                'budget' => $budget,
                'category' => $budget->category,
                'spent' => $spent,
                'percent' => $percent,
                'status' => $percent >= 100 ? 'over' : ($percent >= 80 ? 'warning' : 'ok'),
            ];
        }

        usort($rows, fn (array $a, array $b): int => $b['percent'] <=> $a['percent']);

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    public function monthComparison(): array
    {
        $current = $this->monthTotals();
        $previous = $this->monthTotals($this->today()->addMonths(-1)->monthKey());

        return [
            ...$current,
            'previous_income' => $previous['income'],
            'previous_expense' => $previous['expense'],
            'income_change' => $previous['income'] > 0
                ? (($current['income'] - $previous['income']) / $previous['income']) * 100
                : null,
            'expense_change' => $previous['expense'] > 0
                ? (($current['expense'] - $previous['expense']) / $previous['expense']) * 100
                : null,
        ];
    }

    /**
     * @return list<string>
     */
    public function allTags(): array
    {
        $tags = [];
        foreach ($this->transactions() as $transaction) {
            foreach ($transaction->tags ?? [] as $tag) {
                if (is_string($tag) && $tag !== '') {
                    $tags[$tag] = true;
                }
            }
        }

        $keys = array_keys($tags);
        sort($keys, SORT_NATURAL | SORT_FLAG_CASE);

        return $keys;
    }

    /**
     * @return array{issued_pending:int,received_pending:int,count:int}
     */
    public function chequeSummary(): array
    {
        $cheques = Cheque::query()->where('status', 'pending')->get();

        return [
            'issued_pending' => (int) $cheques->where('direction', 'issued')->sum('amount'),
            'received_pending' => (int) $cheques->where('direction', 'received')->sum('amount'),
            'count' => $cheques->count(),
        ];
    }

    /**
     * @return array{percent:float,months_left:int,remaining:int,required_monthly:int,projected:int,on_track:bool}
     */
    public function goalProgress(Goal $goal): array
    {
        $target = JalaliDate::fromString($goal->target_jalali);
        $monthsLeft = 0;
        if ($target !== null) {
            $monthsLeft = max(
                0,
                ($target->year - $this->today()->year) * 12
                + ($target->month - $this->today()->month)
                + ($target->day >= $this->today()->day ? 0 : -1)
            );
        }

        $remaining = max(0, (int) $goal->target - (int) $goal->saved);
        $required = $monthsLeft > 0 ? (int) ceil($remaining / $monthsLeft) : $remaining;
        $averageNet = $this->averageMonthlyNet(3);
        $projected = (int) $goal->saved + max(0, $averageNet) * $monthsLeft;

        return [
            'percent' => $goal->target > 0 ? min(100, ((int) $goal->saved / (int) $goal->target) * 100) : 0.0,
            'months_left' => $monthsLeft,
            'remaining' => $remaining,
            'required_monthly' => $required,
            'projected' => $projected,
            'on_track' => $projected >= (int) $goal->target,
        ];
    }

    public function averageMonthlyNet(int $months = 3): int
    {
        $values = [];
        for ($i = $months; $i >= 1; $i--) {
            $values[] = $this->monthTotals($this->today()->addMonths(-$i)->monthKey())['net'];
        }
        sort($values);
        $count = count($values);
        if ($count === 0) {
            return 0;
        }

        return intdiv($values[intdiv($count - 1, 2)] + $values[intdiv($count, 2)], 2);
    }

    /**
     * @return list<int> Saturday-first totals for the last 90 days
     */
    public function spendingByWeekday(): array
    {
        $totals = array_fill(0, 7, 0);
        $from = $this->today()->addDays(-90)->toString();

        foreach ($this->transactions() as $transaction) {
            if ($transaction->kind !== 'expense' || $transaction->date_jalali < $from) {
                continue;
            }
            $date = JalaliDate::fromString($transaction->date_jalali);
            if ($date !== null) {
                $totals[$date->weekday()] += (int) $transaction->amount;
            }
        }

        return $totals;
    }
}
