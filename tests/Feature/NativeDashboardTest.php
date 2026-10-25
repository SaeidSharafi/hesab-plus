<?php

use App\Models\Account;
use App\Models\Setting;
use App\NativeComponents\Dashboard;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Native\Mobile\Testing\Native;

uses(RefreshDatabase::class);

it('renders the dashboard from the demo ledger', function () {
    $this->seed(DemoDataSeeder::class);

    $accounts = Account::query()->count();
    expect($accounts)->toBe(5);

    Native::visit('/')
        ->assertSee('دارایی خالص')
        ->assertSee('بانک سامان')
        ->assertSee('سررسیدهای پیش‌رو');
});

it('shows empty states for a fresh install', function () {
    Setting::current()->update(['onboarding_done' => true]);

    Native::test(Dashboard::class)
        ->assertSee('هنوز تراکنشی ثبت نشده')
        ->assertSee('سررسیدی در ۳۰ روز آینده ثبت نشده است.');
});
