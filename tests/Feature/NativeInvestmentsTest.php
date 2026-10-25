<?php

use App\Models\Lot;
use App\NativeComponents\Investments;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Native\Mobile\Testing\Native;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DemoDataSeeder::class);
});

it('renders the portfolio and price board', function () {
    Native::test(Investments::class)
        ->assertSee('ارزش روز سبد')
        ->assertSee('طلای ۱۸ عیار')
        ->assertSee('نرخ روز بازار')
        ->assertSee('بازده XIRR');
});

it('records a buy trade and updates the ledger', function () {
    $before = Lot::query()->count();

    Native::test(Investments::class)
        ->tap('خرید')
        ->input('quantityInput', '1')
        ->tap('ثبت معامله');

    expect(Lot::query()->count())->toBe($before + 1);
});
