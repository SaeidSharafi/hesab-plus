<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Lot;
use App\Support\JalaliDate;
use Illuminate\Support\Collection;

final class Portfolio
{
    public const CLASS_LABELS = [
        'gold' => 'طلای آب‌شده',
        'coin' => 'سکه',
        'gold_fund' => 'صندوق طلا',
        'fund' => 'صندوق سرمایه‌گذاری',
        'stock' => 'سهام',
        'fx' => 'ارز',
        'crypto' => 'رمزارز',
        'deposit' => 'سپرده',
        'manual' => 'دارایی دستی',
    ];

    public const CLASS_COLORS = [
        'gold' => '#B45309',
        'coin' => '#D97706',
        'gold_fund' => '#F59E0B',
        'fund' => '#0F766E',
        'stock' => '#15803D',
        'fx' => '#0369A1',
        'crypto' => '#7C3AED',
        'deposit' => '#57534E',
        'manual' => '#64748B',
    ];

    /**
     * FIFO cost basis for one asset.
     *
     * @param  Collection<int, Lot>  $lots
     * @return array{
     *     asset: Asset,
     *     quantity: float,
     *     cost_basis: int,
     *     average_cost: int,
     *     market_value: int,
     *     unrealized: int,
     *     unrealized_percent: float,
     *     realized: int,
     *     fees: int,
     *     oversold: bool,
     *     open_lots: list<array{lot_id:int,date:string,remaining:float,cost_per_unit:float}>
     * }
     */
    public static function holding(Asset $asset, Collection $lots): array
    {
        $sorted = $lots
            ->where('asset_id', $asset->id)
            ->filter(fn (Lot $lot): bool => $lot->quantity > 0)
            ->sortBy([['date_jalali', 'asc'], ['id', 'asc']])
            ->values();

        /** @var list<array{id:int,date:string,remaining:float,cost_per_unit:float}> $open */
        $open = [];
        $realized = 0.0;
        $fees = 0;
        $oversold = false;

        foreach ($sorted as $lot) {
            if ($lot->type === 'buy') {
                $totalCost = $lot->quantity * $lot->price_per_unit + $lot->fee;
                $fees += $lot->fee;
                $open[] = [
                    'id' => $lot->id,
                    'date' => $lot->date_jalali,
                    'remaining' => (float) $lot->quantity,
                    'cost_per_unit' => $totalCost / $lot->quantity,
                ];

                continue;
            }

            $requested = (float) $lot->quantity;
            $toSell = $requested;
            $proceeds = $requested * $lot->price_per_unit - $lot->fee;
            $fees += $lot->fee;
            $costSold = 0.0;
            $sold = 0.0;

            foreach ($open as $index => $openLot) {
                if ($toSell <= 1e-9) {
                    break;
                }
                $take = min($openLot['remaining'], $toSell);
                if ($take <= 0) {
                    continue;
                }
                $open[$index]['remaining'] -= $take;
                $toSell -= $take;
                $sold += $take;
                $costSold += $take * $openLot['cost_per_unit'];
            }

            if ($toSell > 1e-9) {
                $oversold = true;
            }
            if ($sold > 0) {
                $realized += $proceeds * ($sold / $requested) - $costSold;
            }
        }

        $quantity = array_sum(array_column($open, 'remaining'));
        $costBasis = 0.0;
        $openLots = [];
        foreach ($open as $lot) {
            if ($lot['remaining'] <= 1e-9) {
                continue;
            }
            $costBasis += $lot['remaining'] * $lot['cost_per_unit'];
            $openLots[] = [
                'lot_id' => $lot['id'],
                'date' => $lot['date'],
                'remaining' => $lot['remaining'],
                'cost_per_unit' => $lot['cost_per_unit'],
            ];
        }

        $marketValue = $quantity * $asset->current_price;
        $unrealized = $marketValue - $costBasis;

        return [
            'asset' => $asset,
            'quantity' => $quantity,
            'cost_basis' => (int) round($costBasis),
            'average_cost' => $quantity > 0 ? (int) round($costBasis / $quantity) : 0,
            'market_value' => (int) round($marketValue),
            'unrealized' => (int) round($unrealized),
            'unrealized_percent' => $costBasis > 0 ? ($unrealized / $costBasis) * 100 : 0.0,
            'realized' => (int) round($realized),
            'fees' => $fees,
            'oversold' => $oversold,
            'open_lots' => $openLots,
        ];
    }

    /**
     * @param  Collection<int, Asset>  $assets
     * @param  Collection<int, Lot>  $lots
     * @return array{
     *     holdings: list<array<string,mixed>>,
     *     market_value: int,
     *     cost_basis: int,
     *     unrealized: int,
     *     unrealized_percent: float,
     *     realized: int,
     *     fees: int,
     *     xirr: ?float,
     *     allocation: list<array{label:string,value:int,percent:float,color:string}>
     * }
     */
    public static function summary(Collection $assets, Collection $lots): array
    {
        $holdings = $assets
            ->map(fn (Asset $asset): array => self::holding($asset, $lots))
            ->filter(fn (array $holding): bool => $holding['quantity'] > 1e-9 || $holding['realized'] !== 0)
            ->values()
            ->all();

        $marketValue = array_sum(array_column($holdings, 'market_value'));
        $costBasis = array_sum(array_column($holdings, 'cost_basis'));
        $realized = array_sum(array_column($holdings, 'realized'));
        $fees = array_sum(array_column($holdings, 'fees'));
        $unrealized = $marketValue - $costBasis;
        $today = JalaliDate::today();

        $cashFlows = [];
        foreach ($lots as $lot) {
            $date = JalaliDate::fromString($lot->date_jalali);
            if ($date === null) {
                continue;
            }
            $cashFlows[] = [
                'amount' => $lot->type === 'buy'
                    ? -($lot->quantity * $lot->price_per_unit + $lot->fee)
                    : $lot->quantity * $lot->price_per_unit - $lot->fee,
                'date' => $date->toIso(),
            ];
        }
        if ($marketValue > 0) {
            $cashFlows[] = ['amount' => $marketValue, 'date' => $today->toIso()];
        }

        $byClass = [];
        foreach ($holdings as $holding) {
            if ($holding['market_value'] <= 0) {
                continue;
            }
            $class = $holding['asset']->class;
            $byClass[$class] = ($byClass[$class] ?? 0) + $holding['market_value'];
        }
        arsort($byClass);
        $allocation = [];
        foreach ($byClass as $class => $value) {
            $allocation[] = [
                'label' => self::CLASS_LABELS[$class] ?? $class,
                'value' => (int) $value,
                'percent' => $marketValue > 0 ? ($value / $marketValue) * 100 : 0.0,
                'color' => self::CLASS_COLORS[$class] ?? '#64748B',
            ];
        }

        return [
            'holdings' => $holdings,
            'market_value' => (int) $marketValue,
            'cost_basis' => (int) $costBasis,
            'unrealized' => (int) $unrealized,
            'unrealized_percent' => $costBasis > 0 ? ($unrealized / $costBasis) * 100 : 0.0,
            'realized' => (int) $realized,
            'fees' => (int) $fees,
            'xirr' => Xirr::calculate($cashFlows),
            'allocation' => $allocation,
        ];
    }

    public static function classLabel(string $class): string
    {
        return self::CLASS_LABELS[$class] ?? $class;
    }

    public static function classColor(string $class): string
    {
        return self::CLASS_COLORS[$class] ?? '#64748B';
    }
}
