<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Category;
use App\Models\Person;
use App\Models\Transaction;
use App\Support\HesabScreen;
use Illuminate\Support\Collection;
use Illuminate\View\View;

class Transactions extends HesabScreen
{
    public string $search = '';

    public string $kind = 'all';

    public string $period = 'all';

    public ?int $accountFilter = null;

    public ?string $tagFilter = null;

    public bool $showFilters = false;

    public function create(): void
    {
        $this->go('/transactions/new');
    }

    public function openFilters(): void
    {
        $this->showFilters = true;
    }

    public function closeFilters(): void
    {
        $this->showFilters = false;
    }

    public function filterKind(string $kind): void
    {
        $this->kind = in_array($kind, ['all', 'expense', 'income', 'transfer'], true) ? $kind : 'all';
    }

    public function filterPeriod(string $period): void
    {
        $this->period = in_array($period, ['all', 'this_month'], true) ? $period : 'all';
    }

    public function filterAccount(?int $accountId): void
    {
        $this->accountFilter = $accountId;
    }

    public function filterTag(?string $tag): void
    {
        $this->tagFilter = $tag;
    }

    public function clearFilters(): void
    {
        $this->kind = 'all';
        $this->period = 'all';
        $this->accountFilter = null;
        $this->tagFilter = null;
        $this->search = '';
    }

    public function openEditor(int $id): void
    {
        $transaction = Transaction::query()->find($id);
        if ($transaction === null) {
            $this->fail('تراکنش پیدا نشد.');

            return;
        }
        if ($transaction->ref_kind !== null) {
            $this->fail('این تراکنش سیستمی است؛ از بخش وام، چک یا دارایی مربوطه ویرایش کنید.');

            return;
        }
        $this->go("/transactions/{$id}/edit");
    }

    public function render(): View
    {
        $ledger = $this->ledger();
        $all = $ledger->transactions();
        $filtered = $this->filter($all);
        $accounts = Account::query()->orderBy('name')->get();
        $categories = Category::query()->pluck('name', 'id');
        $accountNames = $accounts->pluck('name', 'id');
        $people = Person::query()->pluck('name', 'id');
        $colors = Category::query()->pluck('color', 'id');

        $groups = [];
        $income = 0;
        $expense = 0;
        foreach ($filtered as $transaction) {
            $title = trim((string) ($transaction->note ?? ''));
            if ($title === '') {
                $title = $categories[$transaction->category_id] ?? $this->kindLabel($transaction->kind);
            }
            $signed = $transaction->kind === 'expense' ? -(int) $transaction->amount : (int) $transaction->amount;
            if ($transaction->kind === 'income') {
                $income += (int) $transaction->amount;
            }
            if ($transaction->kind === 'expense') {
                $expense += (int) $transaction->amount;
            }

            $date = $transaction->date_jalali;
            $groups[$date] ??= [
                'date' => $date,
                'label' => $this->dateText($date, 'weekday'),
                'items' => [],
            ];
            $groups[$date]['items'][] = [
                'id' => $transaction->id,
                'title' => $title,
                'subtitle' => $transaction->kind === 'transfer'
                    ? ($accountNames[$transaction->account_id] ?? 'حساب').' ← '.($accountNames[$transaction->to_account_id] ?? 'مقصد')
                    : ($accountNames[$transaction->account_id] ?? 'حساب').($transaction->person_id ? ' · '.($people[$transaction->person_id] ?? '') : ''),
                'amount' => $this->amount($signed, $transaction->kind !== 'transfer'),
                'amount_class' => match ($transaction->kind) {
                    'expense' => 'text-theme-destructive',
                    'income' => 'text-theme-success',
                    default => 'text-theme-on-surface',
                },
                'color' => $colors[$transaction->category_id] ?? '#64748B',
                'initial' => mb_substr($title, 0, 1),
                'can_edit' => $transaction->ref_kind === null,
            ];
        }

        $tags = $ledger->allTags();

        return $this->screen('native.transactions', [
            'groups' => array_values($groups),
            'filteredCount' => $filtered->count(),
            'income' => $income,
            'expense' => $expense,
            'accounts' => $accounts->map(fn (Account $account): array => [
                'id' => $account->id,
                'name' => $account->name,
                'color' => $account->color,
                'initial' => mb_substr($account->name, 0, 1),
            ])->all(),
            'tags' => $tags,
            'dueCount' => count($ledger->obligations(30)),
            'hasFilters' => $this->accountFilter !== null || $this->tagFilter !== null || $this->period !== 'all' || $this->kind !== 'all',
        ]);
    }

    /**
     * @param  Collection<int, Transaction>  $transactions
     * @return Collection<int, Transaction>
     */
    private function filter(Collection $transactions): Collection
    {
        $query = mb_strtolower(trim($this->search));
        $month = $this->today()->monthKey();
        $personNames = Person::query()->pluck('name', 'id');

        return $transactions->filter(function (Transaction $transaction) use ($query, $month, $personNames): bool {
            if ($this->kind !== 'all' && $transaction->kind !== $this->kind) {
                return false;
            }
            if ($this->period === 'this_month' && ! str_starts_with($transaction->date_jalali, $month)) {
                return false;
            }
            if ($this->accountFilter !== null
                && $transaction->account_id !== $this->accountFilter
                && $transaction->to_account_id !== $this->accountFilter) {
                return false;
            }
            if ($this->tagFilter !== null && ! in_array($this->tagFilter, $transaction->tags ?? [], true)) {
                return false;
            }
            if ($query !== '') {
                $haystack = mb_strtolower(implode(' ', [
                    $transaction->note ?? '',
                    implode(' ', $transaction->tags ?? []),
                    $personNames[$transaction->person_id] ?? '',
                    $transaction->date_jalali,
                ]));
                if (! str_contains($haystack, $query)) {
                    return false;
                }
            }

            return true;
        })->values();
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
}
