<?php

namespace App\Services;

use App\Support\JalaliDate;
use InvalidArgumentException;

final class Amortization
{
    /**
     * @return array{
     *     rows: list<array{number:int,due:string,amount:int,principal:int,interest:int,remaining:int}>,
     *     installment:int,
     *     total_payment:int,
     *     total_principal:int,
     *     total_interest:int
     * }
     */
    public static function schedule(
        int $principalRial,
        float $annualRatePercent,
        int $installmentCount,
        int $frequencyMonths,
        string $firstDueJalali,
        string $model = 'reducing_balance',
        array $customRows = [],
    ): array {
        if ($principalRial <= 0) {
            throw new InvalidArgumentException('Loan principal must be positive.');
        }
        if ($installmentCount < 1 || $installmentCount > 600) {
            throw new InvalidArgumentException('Installment count must be between 1 and 600.');
        }
        if ($frequencyMonths < 1 || $frequencyMonths > 12) {
            throw new InvalidArgumentException('Installment frequency must be between 1 and 12 months.');
        }
        if ($annualRatePercent < 0 || $annualRatePercent > 200) {
            throw new InvalidArgumentException('Annual rate must be between 0 and 200.');
        }
        $first = JalaliDate::fromString($firstDueJalali);
        if ($first === null) {
            throw new InvalidArgumentException('Invalid first due date.');
        }

        if ($model === 'custom') {
            return self::custom($principalRial, $customRows);
        }

        $rows = [];
        $remaining = $principalRial;
        $totalInterest = 0;

        if ($model === 'flat_rate') {
            $years = ($installmentCount * $frequencyMonths) / 12;
            $totalInterestRial = (int) round($principalRial * ($annualRatePercent / 100) * $years);
            $basePrincipal = intdiv($principalRial, $installmentCount);
            $baseInterest = intdiv($totalInterestRial, $installmentCount);

            for ($index = 0; $index < $installmentCount; $index++) {
                $isLast = $index === $installmentCount - 1;
                $principalPart = $isLast ? $remaining : min($basePrincipal, $remaining);
                $interestPart = $isLast
                    ? $totalInterestRial - $baseInterest * ($installmentCount - 1)
                    : $baseInterest;
                $remaining = max(0, $remaining - $principalPart);
                $totalInterest += $interestPart;
                $rows[] = [
                    'number' => $index + 1,
                    'due' => $first->addMonths($index * $frequencyMonths)->toString(),
                    'amount' => $principalPart + $interestPart,
                    'principal' => $principalPart,
                    'interest' => $interestPart,
                    'remaining' => $remaining,
                ];
            }
        } elseif ($model === 'qard_hasan') {
            $basePrincipal = intdiv($principalRial, $installmentCount);
            for ($index = 0; $index < $installmentCount; $index++) {
                $isLast = $index === $installmentCount - 1;
                $principalPart = $isLast ? $remaining : min($basePrincipal, $remaining);
                $remaining = max(0, $remaining - $principalPart);
                $rows[] = [
                    'number' => $index + 1,
                    'due' => $first->addMonths($index * $frequencyMonths)->toString(),
                    'amount' => $principalPart,
                    'principal' => $principalPart,
                    'interest' => 0,
                    'remaining' => $remaining,
                ];
            }
        } else {
            $periodicRate = ($annualRatePercent / 100) * ($frequencyMonths / 12);
            $payment = $periodicRate === 0.0
                ? (int) round($principalRial / $installmentCount)
                : (int) round(($principalRial * $periodicRate) / (1 - (1 + $periodicRate) ** -$installmentCount));

            for ($index = 0; $index < $installmentCount; $index++) {
                $isLast = $index === $installmentCount - 1;
                $interestPart = (int) round($remaining * $periodicRate);
                $principalPart = $isLast
                    ? $remaining
                    : max(0, min($payment - $interestPart, $remaining));
                $remaining = max(0, $remaining - $principalPart);
                $totalInterest += $interestPart;
                $rows[] = [
                    'number' => $index + 1,
                    'due' => $first->addMonths($index * $frequencyMonths)->toString(),
                    'amount' => $principalPart + $interestPart,
                    'principal' => $principalPart,
                    'interest' => $interestPart,
                    'remaining' => $remaining,
                ];
            }
        }

        return [
            'rows' => $rows,
            'installment' => $rows[0]['amount'] ?? 0,
            'total_payment' => $principalRial + $totalInterest,
            'total_principal' => $principalRial,
            'total_interest' => $totalInterest,
        ];
    }

    /**
     * @param  list<array{due:string,amount:int,principal:int,interest:int}>  $customRows
     */
    private static function custom(int $principalRial, array $customRows): array
    {
        if ($customRows === []) {
            throw new InvalidArgumentException('Custom schedules require rows.');
        }

        $rows = [];
        $remaining = $principalRial;
        $totalInterest = 0;

        foreach ($customRows as $index => $row) {
            $principalPart = min(max(0, (int) ($row['principal'] ?? 0)), $remaining);
            $remaining -= $principalPart;
            $interestPart = max(0, (int) ($row['interest'] ?? 0));
            $totalInterest += $interestPart;
            $rows[] = [
                'number' => $index + 1,
                'due' => (string) $row['due'],
                'amount' => max(0, (int) ($row['amount'] ?? 0)) ?: $principalPart + $interestPart,
                'principal' => $principalPart,
                'interest' => $interestPart,
                'remaining' => $remaining,
            ];
        }

        return [
            'rows' => $rows,
            'installment' => $rows[0]['amount'] ?? 0,
            'total_payment' => $principalRial - $remaining + $totalInterest,
            'total_principal' => $principalRial - $remaining,
            'total_interest' => $totalInterest,
        ];
    }

    /**
     * @return array{interest_saved:int,new_count:int,months_saved:int,new_payoff:?string}
     */
    public static function earlyPayoff(
        int $remainingPrincipal,
        float $annualRatePercent,
        int $remainingInstallments,
        int $extraPayment,
        string $model,
        string $firstUnpaidDue,
    ): array {
        $noSaving = [
            'interest_saved' => 0,
            'new_count' => $remainingInstallments,
            'months_saved' => 0,
            'new_payoff' => null,
        ];

        if (
            $extraPayment <= 0
            || $remainingPrincipal <= 0
            || $remainingInstallments <= 0
            || $annualRatePercent <= 0
            || $model !== 'reducing_balance'
        ) {
            return $noSaving;
        }

        $rate = $annualRatePercent / 100 / 12;
        $payment = ($remainingPrincipal * $rate) / (1 - (1 + $rate) ** -$remainingInstallments);
        $originalInterest = $payment * $remainingInstallments - $remainingPrincipal;
        $newPrincipal = $remainingPrincipal - min($extraPayment, $remainingPrincipal);

        if ($newPrincipal <= 0) {
            return [
                'interest_saved' => (int) round($originalInterest),
                'new_count' => 0,
                'months_saved' => $remainingInstallments,
                'new_payoff' => null,
            ];
        }

        // Simulate the remaining loan with the same installment. The final
        // payment is smaller than a full installment, which is exactly why
        // multiplying newCount by payment overstates interest.
        $balance = $newPrincipal;
        $newInterest = 0.0;
        $newCount = 0;
        while ($balance > 0 && $newCount < $remainingInstallments) {
            $interest = round($balance * $rate);
            if ($payment <= $interest) {
                break;
            }
            $principalPart = min($payment - $interest, $balance);
            $balance -= $principalPart;
            $newInterest += $interest;
            $newCount++;
        }

        if ($balance > 0) {
            return $noSaving;
        }

        $saved = max(0, $originalInterest - $newInterest);
        $first = JalaliDate::fromString($firstUnpaidDue);

        return [
            'interest_saved' => (int) round($saved),
            'new_count' => $newCount,
            'months_saved' => max(0, $remainingInstallments - $newCount),
            'new_payoff' => $first?->addMonths(max(0, $newCount - 1))->toString(),
        ];
    }

    public static function penalty(int $overdueAmount, int $days, float $annualPercent = 6): int
    {
        if ($overdueAmount <= 0 || $days <= 0 || $annualPercent <= 0) {
            return 0;
        }

        return (int) round($overdueAmount * ($annualPercent / 100 / 365) * $days);
    }
}
