<?php

namespace App\Services;

use DateTimeImmutable;
use DateTimeInterface;

final class Xirr
{
    private const YEAR_SECONDS = 31_557_600; // 365.2425 days

    /**
     * @param  list<array{amount:int|float,date:string|DateTimeInterface}>  $cashFlows
     */
    public static function calculate(array $cashFlows): ?float
    {
        $flows = [];
        foreach ($cashFlows as $flow) {
            $date = $flow['date'] instanceof DateTimeInterface
                ? $flow['date']
                : new DateTimeImmutable((string) $flow['date']);
            $amount = (float) $flow['amount'];
            if ($amount !== 0.0 && is_finite($amount)) {
                $flows[] = ['amount' => $amount, 'date' => $date];
            }
        }

        if (count($flows) < 2) {
            return null;
        }

        usort($flows, static fn (array $a, array $b): int => $a['date'] <=> $b['date']);
        $hasPositive = false;
        $hasNegative = false;
        foreach ($flows as $flow) {
            $hasPositive = $hasPositive || $flow['amount'] > 0;
            $hasNegative = $hasNegative || $flow['amount'] < 0;
        }
        if (! $hasPositive || ! $hasNegative) {
            return null;
        }

        $low = -0.9999;
        $high = 10.0;
        $lowValue = self::presentValue($flows, $low);
        $highValue = self::presentValue($flows, $high);

        $guard = 0;
        while ($lowValue * $highValue > 0 && $high < 1000 && $guard < 12) {
            $high *= 4;
            $highValue = self::presentValue($flows, $high);
            $guard++;
        }
        if ($lowValue * $highValue > 0) {
            return null;
        }

        for ($i = 0; $i < 200; $i++) {
            $mid = ($low + $high) / 2;
            $midValue = self::presentValue($flows, $mid);
            if (abs($midValue) < 1e-9 || $high - $low < 1e-10) {
                return $mid;
            }
            if ($lowValue * $midValue <= 0) {
                $high = $mid;
                $highValue = $midValue;
            } else {
                $low = $mid;
                $lowValue = $midValue;
            }
        }

        return ($low + $high) / 2;
    }

    /**
     * @param  list<array{amount:float,date:DateTimeInterface}>  $flows
     */
    private static function presentValue(array $flows, float $rate): float
    {
        $start = $flows[0]['date']->getTimestamp();
        $value = 0.0;
        foreach ($flows as $flow) {
            $years = ($flow['date']->getTimestamp() - $start) / self::YEAR_SECONDS;
            $value += $flow['amount'] / (1 + $rate) ** $years;
        }

        return $value;
    }
}
