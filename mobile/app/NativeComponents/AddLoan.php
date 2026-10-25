<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Services\Amortization;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use App\Support\Money;
use App\Support\Persian;
use Illuminate\View\View;
use InvalidArgumentException;

class AddLoan extends HesabScreen
{
    public string $lender = '';

    public string $principalInput = '';

    public string $model = 'reducing_balance';

    public string $rateInput = '23';

    public string $countInput = '12';

    public string $frequencyInput = '1';

    public string $feeInput = '0';

    public string $penaltyInput = '6';

    public string $firstDue = '';

    public ?int $accountId = null;

    public string $note = '';

    public bool $showAccountPicker = false;

    public bool $showDatePicker = false;

    public function mount(): void
    {
        $this->firstDue = $this->today()->addMonths(1)->toString();
        $this->accountId = Account::query()->where('archived', false)->orderBy('name')->value('id');
    }

    public function setModel(string $model): void
    {
        if (! in_array($model, ['reducing_balance', 'flat_rate', 'qard_hasan'], true)) {
            return;
        }
        $this->model = $model;
        if ($model === 'qard_hasan') {
            $this->rateInput = '0';
        } elseif ((float) Persian::english($this->rateInput) === 0.0) {
            $this->rateInput = $model === 'flat_rate' ? '18' : '23';
        }
    }

    public function openAccountPicker(): void
    {
        $this->showAccountPicker = true;
    }

    public function closeAccountPicker(): void
    {
        $this->showAccountPicker = false;
    }

    public function selectAccount(int $id): void
    {
        $this->accountId = $id;
        $this->showAccountPicker = false;
    }

    public function openDatePicker(): void
    {
        $this->showDatePicker = true;
    }

    public function closeDatePicker(): void
    {
        $this->showDatePicker = false;
    }

    public function setDate(string $date): void
    {
        if (JalaliDate::fromString($date) === null) {
            $this->fail('تاریخ معتبر نیست.');

            return;
        }
        $this->firstDue = $date;
        $this->showDatePicker = false;
    }

    public function save(): void
    {
        $this->clearNotice();
        try {
            $loan = (new LedgerWriter)->createLoan([
                'lender' => $this->lender,
                'principal' => Money::parseToRial($this->principalInput, $this->settings()->currency),
                'interest_model' => $this->model,
                'annual_rate' => (float) Persian::english($this->rateInput),
                'total_fee' => Money::parseToRial($this->feeInput, $this->settings()->currency),
                'installment_count' => (int) Persian::english($this->countInput),
                'frequency_months' => max(1, (int) Persian::english($this->frequencyInput)),
                'first_due_jalali' => $this->firstDue,
                'account_id' => $this->accountId,
                'penalty_annual_percent' => (float) Persian::english($this->penaltyInput),
                'note' => $this->note,
            ]);

            $this->succeed('وام ثبت شد.');
            $this->go("/loans/{$loan->id}");
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function render(): View
    {
        $settings = $this->settings();
        $accounts = Account::query()->where('archived', false)->orderBy('name')->get();
        $balances = $this->ledger()->balances();
        $selectedAccount = $accounts->firstWhere('id', $this->accountId);

        $principal = Money::parseToRial($this->principalInput, $settings->currency);
        $count = (int) Persian::english($this->countInput);
        $rate = (float) Persian::english($this->rateInput);
        $preview = null;
        if ($principal > 0 && $count > 0 && $this->firstDue !== '') {
            try {
                $schedule = Amortization::schedule(
                    $principal,
                    $rate,
                    $count,
                    max(1, (int) Persian::english($this->frequencyInput)),
                    $this->firstDue,
                    $this->model,
                );
                $preview = [
                    'installment' => $this->amount($schedule['installment']),
                    'total_interest' => $this->amount($schedule['total_interest']),
                    'total_payment' => $this->amount($schedule['total_payment']),
                    'last_due' => $schedule['rows'] === [] ? '—' : $this->dateText($schedule['rows'][array_key_last($schedule['rows'])]['due'], 'long'),
                    'count' => $count,
                ];
            } catch (InvalidArgumentException) {
                $preview = null;
            }
        }

        return $this->screen('native.add-loan', [
            'accounts' => $accounts->map(fn (Account $account): array => [
                'id' => $account->id,
                'name' => $account->name,
                'color' => $account->color,
                'initial' => mb_substr($account->name, 0, 1),
                'balance' => $this->amount($balances[$account->id] ?? 0),
            ])->all(),
            'selectedAccount' => $selectedAccount,
            'firstDueLabel' => $this->dateText($this->firstDue),
            'preview' => $preview,
            'currencyLabel' => $settings->currency === 'TOMAN' ? 'تومان' : 'ریال',
        ]);
    }
}
