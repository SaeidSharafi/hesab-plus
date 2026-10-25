<?php

use App\Models\Transaction;
use App\NativeComponents\TransactionEditor;
use App\NativeComponents\Transactions;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Native\Mobile\Testing\Native;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DemoDataSeeder::class);
});

it('lists transactions with search and filters', function () {
    Native::test(Transactions::class)
        ->assertSee('تراکنش‌ها')
        ->assertSee('سوپرمارکت')
        ->assertSee('بانک سامان');
});

it('saves a new transaction through the editor', function () {
    $before = Transaction::query()->count();

    Native::test(TransactionEditor::class)
        ->input('amountInput', '1250000')
        ->tap('ثبت تراکنش')
        ->assertNavigatedTo('/transactions');

    expect(Transaction::query()->count())->toBe($before + 1);

    $transaction = Transaction::query()->latest('id')->firstOrFail();
    expect((int) $transaction->amount)->toBe(12_500_000)
        ->and($transaction->kind)->toBe('expense');
});

it('edits and deletes a manual transaction', function () {
    $transaction = Transaction::query()->whereNull('ref_kind')->firstOrFail();

    Native::visit('/transactions/'.$transaction->id.'/edit')
        ->assertSee('ویرایش تراکنش')
        ->input('amountInput', '999000')
        ->tap('ذخیره تغییرات');

    expect((int) $transaction->refresh()->amount)->toBe(9_990_000);

    Native::visit('/transactions/'.$transaction->id.'/edit')
        ->tap('حذف تراکنش')
        ->tap('تأیید حذف');

    expect(Transaction::query()->whereKey($transaction->id)->exists())->toBeFalse();
});
