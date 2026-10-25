<?php

namespace App\NativeComponents;

use App\Support\HesabScreen;
use App\Support\JalaliDate;
use Illuminate\View\View;

class Reports extends HesabScreen
{
    public string $period = 'this_month';

    public string $kind = 'expense';

    public function setPeriod(string $period): void
    {
        if (in_array($period, ['this_month', 'last_month', 'last_3', 'all'], true)) {
            $this->period = $period;
        }
    }

    public function setKind(string $kind): void
    {
        if (in_array($kind, ['expense', 'income'], true)) {
            $this->kind = $kind;
        }
    }

    public function render(): View
    {
        $ledger = $this->ledger();
        [$from, $to, $periodLabel] = $this->range();
        $totals = $ledger->totalsBetween($from, $to);
        $tree = $ledger->categoryTree($this->kind, $from, $to);
        $rows = $this->flatten($tree);
        $months = JalaliDate::lastMonthKeys($this->today(), 6);
        $series = $ledger->monthlySeries($months, $this->kind);
        $max = max(1, ...array_column($series, 'value'));
        $monthlyRows = array_map(fn (array $row): array => [
            'label' => JalaliDate::fromString($row['month'].'/01')?->format('month', $this->settings()->numerals) ?? $row['month'],
            'value' => $this->amount($row['value']),
            'ratio' => min(1, $row['value'] / $max),
        ], $series);
        $budgets = array_map(fn (array $row): array => [
            'name' => $row['category']?->name ?? 'دسته',
            'spent' => $this->amount($row['spent']),
            'limit' => $this->amount($row['budget']->amount),
            'percent' => $row['percent'],
            'status' => $row['status'],
            'status_label' => match ($row['status']) {
                'over' => 'بیش از بودجه',
                'warning' => 'نزدیک سقف',
                default => 'در محدوده',
            },
            'status_class' => match ($row['status']) {
                'over' => 'text-theme-destructive',
                'warning' => 'text-theme-warning',
                default => 'text-theme-success',
            },
        ], $ledger->budgetProgress());

        $total = $this->kind === 'expense' ? $totals['expense'] : $totals['income'];
        $count = $ledger->transactions()->filter(function ($transaction) use ($from, $to): bool {
            if ($transaction->date_jalali < $from->toString() || $transaction->date_jalali > $to->toString()) {
                return false;
            }
            if ($this->kind === 'expense') {
                return $transaction->kind === 'expense' || $transaction->kind === 'loan';
            }

            return $transaction->kind === 'income';
        })->count();

        return $this->screen('native.reports', [
            'periodLabel' => $periodLabel,
            'total' => $this->amount($total),
            'count' => $count,
            'rows' => $rows,
            'monthly' => $monthlyRows,
            'budgets' => $budgets,
            'savingsRate' => $totals['savings_rate'],
            'net' => $this->amount($totals['net'], true),
            'netNegative' => $totals['net'] < 0,
        ]);
    }

    /**
     * @return array{0: JalaliDate, 1: JalaliDate, 2: string}
     */
    private function range(): array
    {
        $today = $this->today();

        return match ($this->period) {
            'last_month' => [
                $today->addMonths(-1)->startOfMonth(),
                $today->addMonths(-1)->endOfMonth(),
                $today->addMonths(-1)->format('month', $this->settings()->numerals),
            ],
            'last_3' => [
                $today->addMonths(-2)->startOfMonth(),
                $today,
                'سه ماه اخیر',
            ],
            'all' => [
                new JalaliDate(1300, 1, 1),
                $today,
                'همه دوره‌ها',
            ],
            default => [
                $today->startOfMonth(),
                $today,
                $today->format('month', $this->settings()->numerals),
            ],
        };
    }

    /**
     * @param  list<array<string, mixed>>  $nodes
     * @return list<array<string, mixed>>
     */
    private function flatten(array $nodes, int $level = 0): array
    {
        $rows = [];
        foreach ($nodes as $node) {
            $rows[] = [
                'id' => $node['id'],
                'name' => $node['name'],
                'color' => $node['color'],
                'total' => $this->amount((int) $node['total']),
                'percent' => $node['percent'],
                'level' => $level,
                'indent' => match ($level) {
                    0 => 'pl-0',
                    1 => 'pl-4',
                    default => 'pl-8',
                },
                'has_children' => $node['children'] !== [],
                'is_parent' => $level === 0,
            ];
            if ($node['children'] !== []) {
                $rows = [...$rows, ...$this->flatten($node['children'], $level + 1)];
            }
        }

        return $rows;
    }
}
