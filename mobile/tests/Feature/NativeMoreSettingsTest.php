<?php

use App\Models\Account;
use App\Models\Setting;
use App\NativeComponents\Accounts;
use App\NativeComponents\Categories;
use App\NativeComponents\More;
use App\NativeComponents\Reminders;
use App\NativeComponents\Settings;
use App\Services\BackupService;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Native\Mobile\Testing\Native;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DemoDataSeeder::class);
});

it('renders the more hub and every settings card', function () {
    Native::test(More::class)
        ->assertSee('گزارش‌ها و بودجه')
        ->assertSee('پیش‌بینی نقدینگی')
        ->assertSee('یادآورها و تقویم');

    Native::test(Settings::class)
        ->assertSee('واحد پول و ارقام')
        ->assertSee('نسخه پشتیبان')
        ->assertSee('یادآورها');
});

it('creates an account and sets a budget', function () {
    $before = Account::query()->count();

    Native::test(Accounts::class)
        ->tap('+ حساب')
        ->input('name', 'حساب آزمایشی')
        ->tap('افزودن');

    expect(Account::query()->count())->toBe($before + 1);

    Native::test(Categories::class)
        ->assertSee('سوپرمارکت')
        ->assertSee('تعیین بودجه ماهانه');
});

it('exports a real ICS calendar with alarms', function () {
    Native::test(Reminders::class)
        ->assertSee('آلارم مطمئن با تقویم گوشی')
        ->tap('ساخت و افزودن به تقویم');

    $path = storage_path('app/calendar/hesab-reminders.ics');
    expect($path)->toBeFile();

    $contents = file_get_contents($path);
    expect($contents)->toContain('BEGIN:VCALENDAR')
        ->toContain('BEGIN:VEVENT')
        ->toContain('TRIGGER:-P3D')
        ->toContain('TRIGGER:-P1D');
});

it('backs up and restores the database', function () {
    $service = new BackupService;
    $backup = $service->createBackup();

    expect($backup['path'])->toBeFile()
        ->and($backup['rows'])->toBeGreaterThan(0);

    $account = Account::query()->firstOrFail();
    $originalName = $account->name;
    $account->update(['name' => 'تغییر موقت']);

    expect($service->importFile($backup['path']))->toBeTrue();
    expect(Account::query()->find($account->id)?->name)->toBe($originalName);

    Setting::current()->update(['hide_balances' => false]);
    $service->importFile($backup['path']);
    expect(Setting::current()->hide_balances)->toBeFalse();
});
