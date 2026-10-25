<?php

use App\Models\Cheque;
use App\Models\Loan;
use App\Models\Person;
use App\NativeComponents\AddCheque;
use App\NativeComponents\AddDebt;
use App\NativeComponents\AddLoan;
use App\NativeComponents\Obligations;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Native\Mobile\Testing\Native;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DemoDataSeeder::class);
});

it('renders loans, cheques and people tabs', function () {
    Native::test(Obligations::class)
        ->assertSee('قرض‌الحسنه رسالت')
        ->assertSee('بانک ملی (مسکن)')
        ->assertSee('وام‌ها');

    Native::test(Obligations::class)
        ->tap('اشخاص')
        ->assertSee('علی رضایی')
        ->assertSee('سارا احمدی');
});

it('renders a loan detail with its installment schedule', function () {
    $loan = Loan::query()->where('lender', 'بانک ملی (مسکن)')->firstOrFail();

    Native::visit('/loans/'.$loan->id)
        ->assertSee('بانک ملی (مسکن)')
        ->assertSee('ماشین‌حساب تسویه زودهنگام')
        ->assertSee('پرداخت قسط');
});

it('creates a new loan with a schedule', function () {
    $before = Loan::query()->count();

    Native::test(AddLoan::class)
        ->input('lender', 'بانک تست')
        ->input('principalInput', '100000000')
        ->tap('ثبت وام و ساخت جدول اقساط');

    expect(Loan::query()->count())->toBe($before + 1);

    $loan = Loan::query()->where('lender', 'بانک تست')->firstOrFail();
    expect($loan->installments()->count())->toBe(12)
        ->and((int) $loan->principal)->toBe(1_000_000_000);
});

it('creates a cheque and a new person debt', function () {
    $chequeBefore = Cheque::query()->count();
    Native::test(AddCheque::class)
        ->input('number', '123456789')
        ->input('amountInput', '25000000')
        ->input('counterparty', 'آزمایش چک')
        ->tap('ثبت چک');

    expect(Cheque::query()->count())->toBe($chequeBefore + 1);

    $debtBefore = Person::query()->count();
    Native::test(AddDebt::class)
        ->input('newPersonName', 'شخص آزمایشی')
        ->input('quantityInput', '5000000')
        ->tap('ثبت در دفتر اشخاص');

    expect(Person::query()->count())->toBe($debtBefore + 1);
});

it('renders a person ledger with partial settlement', function () {
    $ali = Person::query()->where('name', 'علی رضایی')->firstOrFail();

    Native::visit('/people/'.$ali->id)
        ->assertSee('علی رضایی')
        ->assertSee('تسویه')
        ->assertSee('یادآوری');
});
