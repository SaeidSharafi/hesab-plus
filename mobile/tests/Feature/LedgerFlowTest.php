<?php

use App\Models\Account;
use App\Models\Asset;
use App\Models\Category;
use App\Models\Cheque;
use App\Models\Debt;
use App\Models\Loan;
use App\Models\Lot;
use App\Models\Person;
use App\Models\Transaction;
use App\Services\Ledger;
use App\Services\LedgerWriter;
use App\Services\Portfolio;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(DemoDataSeeder::class);
});

it('derives the demo account balances from the ledger', function () {
    $ledger = new Ledger;
    $balances = $ledger->balances();

    $saman = Account::query()->where('slug', 'demo-saman')->firstOrFail();
    $blue = Account::query()->where('slug', 'demo-blue')->firstOrFail();
    $melli = Account::query()->where('slug', 'demo-melli')->firstOrFail();
    $cash = Account::query()->where('slug', 'demo-cash')->firstOrFail();
    $broker = Account::query()->where('slug', 'demo-broker')->firstOrFail();

    expect($balances[$saman->id])->toBe(625_000_000)
        ->and($balances[$blue->id])->toBe(84_000_000)
        ->and($balances[$melli->id])->toBe(1_200_000_000)
        ->and($balances[$cash->id])->toBe(12_500_000)
        ->and($balances[$broker->id])->toBe(120_000_000);
});

it('computes a net worth that reconciles assets and liabilities', function () {
    $net = (new Ledger)->netWorth();

    expect($net['assets'] - $net['liabilities'])->toBe($net['net_worth'])
        ->and($net['net_worth'])->toBeGreaterThan(0)
        ->and($net['portfolio_value'])->toBeGreaterThan(0)
        ->and($net['loan_principal'])->toBeGreaterThan(0);
});

it('tracks FIFO gold holdings after a partial sell', function () {
    $gold = Asset::query()->where('symbol', 'GOLD18')->firstOrFail();

    $holding = Portfolio::holding($gold, Lot::query()->where('asset_id', $gold->id)->get());

    expect($holding['quantity'])->toBe(35.0)
        ->and($holding['realized'])->toBeGreaterThan(0)
        ->and($holding['market_value'])->toBe((int) round(35 * $gold->current_price));
});

it('summarizes loans, overdue installments and partial debts', function () {
    $ledger = new Ledger;
    $resalat = Loan::query()->where('lender', 'قرض‌الحسنه رسالت')->firstOrFail();
    $melli = Loan::query()->where('lender', 'بانک ملی (مسکن)')->firstOrFail();
    $resalatSummary = $ledger->loanSummary($resalat);
    $melliSummary = $ledger->loanSummary($melli);

    expect($resalatSummary['paid_count'])->toBe(4)
        ->and($melliSummary['paid_count'])->toBe(7)
        ->and($melliSummary['overdue_count'])->toBe(1)
        ->and($resalatSummary['remaining_principal'])->toBeGreaterThan(0);

    $ali = Person::query()->where('name', 'علی رضایی')->firstOrFail();
    $debt = Debt::query()->where('person_id', $ali->id)->firstOrFail();

    expect($ledger->debtOutstanding($debt))->toBe(90_000_000)
        ->and($ledger->personSummary($ali)['balance'])->toBe(90_000_000);
});

it('pays an installment and undoes it without drifting balances', function () {
    $writer = new LedgerWriter;
    $ledger = new Ledger;
    $saman = Account::query()->where('slug', 'demo-saman')->firstOrFail();
    $loan = Loan::query()->where('lender', 'قرض‌الحسنه رسالت')->firstOrFail();
    $installment = $loan->installments()->whereNull('paid_txn_id')->firstOrFail();
    $before = $ledger->balances()[$saman->id];

    $payment = $writer->payInstallment($installment);

    $after = (new Ledger)->balances()[$saman->id];
    expect($before - $after)->toBe((int) $installment->amount)
        ->and($installment->refresh()->paid_txn_id)->toBe($payment->id);

    $writer->undoInstallment($installment->refresh());

    expect((new Ledger)->balances()[$saman->id])->toBe($before)
        ->and($installment->refresh()->paid_txn_id)->toBeNull();
});

it('adds and deletes a manual transaction while keeping balances consistent', function () {
    $writer = new LedgerWriter;
    $saman = Account::query()->where('slug', 'demo-saman')->firstOrFail();
    $groceries = Category::query()->where('slug', 'groceries')->firstOrFail();
    $before = (new Ledger)->balances()[$saman->id];

    $transaction = $writer->addTransaction([
        'kind' => 'expense',
        'account_id' => $saman->id,
        'amount' => 10_000_000,
        'date_jalali' => '1405/08/03',
        'category_id' => $groceries->id,
        'note' => 'آزمایش',
    ]);

    expect((new Ledger)->balances()[$saman->id])->toBe($before - 10_000_000);

    $writer->deleteTransaction($transaction);

    expect((new Ledger)->balances()[$saman->id])->toBe($before)
        ->and(Transaction::query()->whereKey($transaction->id)->exists())->toBeFalse();
});

it('settles part of a debt and writes a linked transaction when an account is chosen', function () {
    $writer = new LedgerWriter;
    $saman = Account::query()->where('slug', 'demo-saman')->firstOrFail();
    $ali = Person::query()->where('name', 'علی رضایی')->firstOrFail();
    $debt = Debt::query()->where('person_id', $ali->id)->firstOrFail();
    $before = (new Ledger)->balances()[$saman->id];

    $writer->settleDebt($debt, 20_000_000, $saman);

    expect((new Ledger)->debtOutstanding($debt->refresh()))->toBe(70_000_000)
        ->and((new Ledger)->balances()[$saman->id])->toBe($before + 20_000_000)
        ->and($debt->settlements)->toHaveCount(2);
});

it('settles and undoes a cheque', function () {
    $writer = new LedgerWriter;
    $ledger = new Ledger;
    $cheque = Cheque::query()->where('direction', 'issued')->firstOrFail();
    $saman = Account::query()->findOrFail($cheque->account_id);
    $before = $ledger->balances()[$saman->id];

    $writer->settleCheque($cheque);

    expect($cheque->refresh()->status)->toBe('cashed')
        ->and($cheque->txn_id)->not->toBeNull()
        ->and((new Ledger)->balances()[$saman->id])->toBe($before - (int) $cheque->amount);

    $writer->undoCheque($cheque->refresh());

    expect($cheque->refresh()->status)->toBe('pending')
        ->and($cheque->txn_id)->toBeNull()
        ->and((new Ledger)->balances()[$saman->id])->toBe($before);
});

it('records a buy lot and refuses to oversell', function () {
    $writer = new LedgerWriter;
    $gold = Asset::query()->where('symbol', 'GOLD18')->firstOrFail();
    $saman = Account::query()->where('slug', 'demo-saman')->firstOrFail();
    $before = (new Ledger)->balances()[$saman->id];

    $writer->addLot([
        'asset_id' => $gold->id,
        'type' => 'buy',
        'quantity' => 2,
        'price_per_unit' => 44_500_000,
        'fee' => 0,
        'account_id' => $saman->id,
        'date_jalali' => '1405/08/03',
    ]);

    expect((new Ledger)->balances()[$saman->id])->toBe($before - 89_000_000);

    $writer->addLot([
        'asset_id' => $gold->id,
        'type' => 'sell',
        'quantity' => 1_000,
        'price_per_unit' => 44_500_000,
        'fee' => 0,
        'account_id' => $saman->id,
        'date_jalali' => '1405/08/03',
    ]);
})->throws(InvalidArgumentException::class);
