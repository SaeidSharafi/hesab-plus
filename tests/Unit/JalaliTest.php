<?php

use App\Support\JalaliDate;

it('converts between Gregorian and Jalali in both directions', function () {
    expect(JalaliDate::fromGregorian(2026, 10, 25)->toString())->toBe('1405/08/03')
        ->and(JalaliDate::fromGregorian(2024, 3, 20)->toString())->toBe('1403/01/01')
        ->and(JalaliDate::fromGregorian(2025, 3, 21)->toString())->toBe('1404/01/01')
        ->and(JalaliDate::fromString('1405/08/03')->toIso())->toBe('2026-10-25');
});

it('knows Jalali leap years and Esfand length', function () {
    expect(JalaliDate::isLeapYear(1403))->toBeTrue()
        ->and(JalaliDate::isLeapYear(1404))->toBeFalse()
        ->and(JalaliDate::isLeapYear(1408))->toBeTrue()
        ->and(JalaliDate::monthDaysFor(1403, 12))->toBe(30)
        ->and(JalaliDate::monthDaysFor(1404, 12))->toBe(29);
});

it('clamps days when adding months', function () {
    $date = new JalaliDate(1405, 6, 31);

    expect($date->addMonths(1)->toString())->toBe('1405/07/30')
        ->and($date->addMonths(6)->toString())->toBe('1405/12/29')
        ->and($date->addMonths(-6)->toString())->toBe('1404/12/29');
});

it('computes weekdays and day differences exactly', function () {
    $date = JalaliDate::fromString('1405/08/03');

    expect($date->weekday())->toBe(1)
        ->and(JalaliDate::weekdayName(1))->toBe('یک‌شنبه')
        ->and($date->diffDays($date->addDays(22)))->toBe(22)
        ->and($date->addDays(22)->toString())->toBe('1405/08/25');
});

it('rejects invalid dates and parses Persian digits', function () {
    expect(JalaliDate::fromString('1405/13/01'))->toBeNull()
        ->and(JalaliDate::fromString('1405/08/31'))->toBeNull()
        ->and(JalaliDate::fromString('۱۴۰۵/۰۸/۰۳')->toString())->toBe('1405/08/03');
});

it('builds a Saturday-first month grid', function () {
    $weeks = JalaliDate::monthGrid(1405, 8);

    expect($weeks[0][0]['date']->toString())->toBe('1405/07/25')
        ->and($weeks[0][0]['date']->weekday())->toBe(0)
        ->and(count($weeks))->toBe(6);
});
