<?php

use App\NativeComponents\Forecast;
use App\NativeComponents\Reports;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Native\Mobile\Testing\Native;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DemoDataSeeder::class);
});

it('renders category reports and budgets', function () {
    Native::test(Reports::class)
        ->assertSee('گزارش‌ها')
        ->assertSee('تفکیک دسته‌بندی‌ها')
        ->assertSee('بودجه ماه جاری');

    Native::test(Reports::class)
        ->tap('همه')
        ->tap('درآمدها')
        ->assertSee('حقوق و دستمزد');
});

it('renders the cash-flow forecast with scenarios and goals', function () {
    Native::test(Forecast::class)
        ->assertSee('پیش‌بینی نقدینگی')
        ->assertSee('سناریوهای فرضی')
        ->assertSee('اهداف مالی')
        ->assertSee('صندوق اضطراری');
});
