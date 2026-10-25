<?php

use App\Services\Amortization;

it('builds a reducing-balance schedule whose principal sums exactly', function () {
    $result = Amortization::schedule(
        principalRial: 1_000_000,
        annualRatePercent: 12,
        installmentCount: 12,
        frequencyMonths: 1,
        firstDueJalali: '1405/09/01',
        model: 'reducing_balance',
    );

    expect($result['rows'])->toHaveCount(12)
        ->and($result['rows'][0]['amount'])->toBe(88_849)
        ->and(array_sum(array_column($result['rows'], 'principal')))->toBe(1_000_000)
        ->and($result['rows'][11]['remaining'])->toBe(0)
        ->and($result['total_interest'])->toBeGreaterThan(60_000)
        ->and($result['rows'][1]['due'])->toBe('1405/10/01');
});

it('computes a flat-rate schedule with fixed interest', function () {
    $result = Amortization::schedule(
        principalRial: 1_000_000,
        annualRatePercent: 10,
        installmentCount: 12,
        frequencyMonths: 1,
        firstDueJalali: '1405/09/01',
        model: 'flat_rate',
    );

    expect($result['total_interest'])->toBe(100_000)
        ->and(array_sum(array_column($result['rows'], 'interest')))->toBe(100_000)
        ->and(array_sum(array_column($result['rows'], 'principal')))->toBe(1_000_000);
});

it('supports zero-interest qard-al-hasan schedules', function () {
    $result = Amortization::schedule(
        principalRial: 1_000_000,
        annualRatePercent: 0,
        installmentCount: 12,
        frequencyMonths: 1,
        firstDueJalali: '1405/09/01',
        model: 'qard_hasan',
    );

    expect($result['total_interest'])->toBe(0)
        ->and(array_sum(array_column($result['rows'], 'amount')))->toBe(1_000_000)
        ->and($result['rows'][11]['amount'])->toBe(83_337);
});

it('rejects invalid loan inputs', function () {
    Amortization::schedule(0, 10, 12, 1, '1405/09/01');
})->throws(InvalidArgumentException::class);

it('estimates early-payoff savings only for reducing loans', function () {
    $saving = Amortization::earlyPayoff(
        remainingPrincipal: 1_000_000,
        annualRatePercent: 18,
        remainingInstallments: 12,
        extraPayment: 200_000,
        model: 'reducing_balance',
        firstUnpaidDue: '1405/09/01',
    );

    expect($saving['interest_saved'])->toBeGreaterThan(0)
        ->and($saving['new_count'])->toBeLessThan(12)
        ->and($saving['new_payoff'])->not->toBeNull();

    $none = Amortization::earlyPayoff(
        remainingPrincipal: 1_000_000,
        annualRatePercent: 0,
        remainingInstallments: 12,
        extraPayment: 200_000,
        model: 'qard_hasan',
        firstUnpaidDue: '1405/09/01',
    );

    expect($none['interest_saved'])->toBe(0);
});

it('accrues a daily late penalty', function () {
    expect(Amortization::penalty(100_000_000, 30, 6))->toBe(493_151)
        ->and(Amortization::penalty(100_000_000, 0, 6))->toBe(0);
});
