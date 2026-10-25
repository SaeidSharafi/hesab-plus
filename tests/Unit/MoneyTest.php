<?php

use App\Support\Money;

it('formats Toman and Rial with Persian digits', function () {
    expect(Money::format(625_000_000))->toBe('۶۲٬۵۰۰٬۰۰۰ تومان')
        ->and(Money::format(625_000_000, 'RIAL'))->toBe('۶۲۵٬۰۰۰٬۰۰۰ ریال')
        ->and(Money::format(-14_500_000))->toBe('−۱٬۴۵۰٬۰۰۰ تومان');
});

it('parses human amounts into integer Rial', function () {
    expect(Money::parseToRial('۲۵۰ هزار'))->toBe(2_500_000)
        ->and(Money::parseToRial('2.5 میلیون'))->toBe(25_000_000)
        ->and(Money::parseToRial('1,450,000 تومان'))->toBe(14_500_000)
        ->and(Money::parseToRial('۶۲۵,۰۰۰,۰۰۰', 'RIAL'))->toBe(625_000_000)
        ->and(Money::parseToRial('بدون عدد'))->toBe(0);
});

it('writes amounts in Persian words', function () {
    expect(Money::words(254_000_000))->toBe('بیست و پنج میلیون و چهارصد هزار تومان')
        ->and(Money::words(0))->toBe('صفر تومان');
});

it('compacts large values for charts', function () {
    expect(Money::compact(1_250_000_000))->toContain('۱۲۵')
        ->and(Money::compact(45_000_000))->toContain('۴٫۵')
        ->and(Money::compact(2_500_000))->toContain('ه');
});
