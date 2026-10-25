<?php

use App\Models\Account;
use App\Models\Setting;
use App\NativeComponents\Onboarding;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Native\Mobile\Testing\Native;

uses(RefreshDatabase::class);

it('offers both onboarding paths', function () {
    Native::test(Onboarding::class)
        ->assertSee('حساب‌پلاس')
        ->assertSee('شروع از صفر')
        ->assertSee('مشاهده با داده نمونه')
        ->assertSee('بدون نیاز به حساب کاربری');
});

it('starts empty and marks onboarding complete', function () {
    Native::test(Onboarding::class)
        ->tap('شروع از صفر')
        ->assertNavigatedTo('/');

    expect(Setting::current()->onboarding_done)->toBeTrue();
    expect(Account::query()->count())->toBe(1);
});
