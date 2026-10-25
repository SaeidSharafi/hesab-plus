<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Category;
use App\Models\Installment;
use App\Models\Setting;
use App\Models\Transaction;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use Illuminate\Support\Collection;
use Illuminate\View\View;
use InvalidArgumentException;

class Dashboard extends HesabScreen
{
    public function mount(): void
    {
        if (! Setting::current()->onboarding_done) {
            $this->replace('/onboarding');
        }
    }

    public function createTransaction(): void
    {
        $this->go('/transactions/new');
    }

    public function openSettings(): void
    {
        $this->go('/settings');
    }

    public function openTransactions(): void
    {
        $this->go('/transactions');
    }

    public function openObligations(): void
    {
        $this->go('/obligations');
    }

    public function openAccounts(): void
    {
        $this->go('/accounts');
    }

    public function editTransaction(int $id): void
    {
        $this->go("/transactions/{$id}/edit");
    }

    public function pay(int $installmentId): void
    {
        $installment = Installment::query()->find($installmentId);
        if ($installment === null) {
            $this->fail('قسط پیدا نشد.');

            return;
        }

        try {
            $account = Account::query()->find($installment->loan?->account_id);
            (new LedgerWriter)->payInstallment($installment, $account);
            $this->succeed('قسط با موفقیت پرداخت شد.');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function render(): View
    {
        $ledger = $this->ledger();
        $net = $ledger->netWorth();
        $month = $ledger->monthTotals();
        $comparison = $ledger->monthComparison();
        $obligations = array_slice($ledger->obligations(30), 0, 4);
        $dueCount = count($ledger->obligations(30));
        $accounts = $ledger->accountRows();
        $recent = $this->transactionRows($ledger->transactions()->take(6));

        return $this->screen('native.dashboard', [
            'monthLabel' => $this->today()->format('month', $this->settings()->numerals),
            'net' => $net,
            'month' => $month,
            'comparison' => $comparison,
            'obligations' => $obligations,
            'dueCount' => $dueCount,
            'accounts' => array_map(fn (array $row): array => [
                'id' => $row['account']->id,
                'name' => $row['account']->name,
                'type' => $this->accountTypeLabel($row['account']->type),
                'balance' => $this->amount($row['balance']),
                'color' => $row['account']->color,
                'initial' => mb_substr($row['account']->name, 0, 1),
            ], $accounts),
            'recent' => $recent,
            'expenseRatio' => $month['income'] > 0 ? min(1, $month['expense'] / $month['income']) : 0.0,
            'netChange' => $comparison['expense_change'],
        ]);
    }

    /**
     * @param  Collection<int, Transaction>  $transactions
     * @return list<array<string, mixed>>
     */
    private function transactionRows(Collection $transactions): array
    {
        $accounts = Account::query()->pluck('name', 'id');
        $categories = Category::query()->pluck('name', 'id');
        $colors = Category::query()->pluck('color', 'id');
        $rows = [];

        foreach ($transactions as $transaction) {
            $title = trim((string) ($transaction->note ?? ''));
            if ($title === '') {
                $title = $categories[$transaction->category_id] ?? $this->kindLabel($transaction->kind);
            }
            $accountName = $accounts[$transaction->account_id] ?? 'حساب';
            $subtitle = $transaction->kind === 'transfer'
                ? $accountName.' ← '.($accounts[$transaction->to_account_id] ?? 'حساب مقصد')
                : $accountName.($transaction->category_id ? ' · '.($categories[$transaction->category_id] ?? '') : '');
            $signed = $transaction->kind === 'expense' ? -(int) $transaction->amount : (int) $transaction->amount;

            $rows[] = [
                'id' => $transaction->id,
                'title' => $title,
                'subtitle' => $subtitle,
                'date' => $this->dateText($transaction->date_jalali, 'short'),
                'amount' => $this->amount($signed, $transaction->kind !== 'transfer'),
                'amount_class' => match ($transaction->kind) {
                    'expense' => 'text-theme-destructive',
                    'income' => 'text-theme-success',
                    default => 'text-theme-on-surface',
                },
                'color' => $colors[$transaction->category_id] ?? '#64748B',
                'initial' => mb_substr($title, 0, 1),
            ];
        }

        return $rows;
    }

    private function kindLabel(string $kind): string
    {
        return match ($kind) {
            'expense' => 'هزینه',
            'income' => 'درآمد',
            'transfer' => 'انتقال',
            'loan' => 'قسط وام',
            'investment' => 'سرمایه‌گذاری',
            'debt' => 'بدهی و طلب',
            default => 'تراکنش',
        };
    }

    private function accountTypeLabel(string $type): string
    {
        return match ($type) {
            'bank' => 'حساب بانکی',
            'card' => 'کارت بانکی',
            'cash' => 'نقد',
            'wallet' => 'کیف پول',
            'savings' => 'سپرده',
            'investment' => 'سرمایه‌گذاری',
            'credit' => 'اعتباری',
            'loan' => 'وام',
            default => 'حساب',
        };
    }
}
