<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use App\Support\Money;
use Illuminate\View\View;
use InvalidArgumentException;

class AddCheque extends HesabScreen
{
    public string $direction = 'issued';

    public string $number = '';

    public string $bank = 'بانک سامان';

    public string $amountInput = '';

    public string $issueDate = '';

    public string $dueDate = '';

    public string $counterparty = '';

    public ?int $accountId = null;

    public string $note = '';

    public bool $showIssuePicker = false;

    public bool $showDuePicker = false;

    public bool $showAccountPicker = false;

    public function mount(): void
    {
        $this->issueDate = $this->today()->toString();
        $this->dueDate = $this->today()->addDays(30)->toString();
        $this->accountId = Account::query()->where('archived', false)->orderBy('name')->value('id');
    }

    public function setDirection(string $direction): void
    {
        if (in_array($direction, ['issued', 'received'], true)) {
            $this->direction = $direction;
        }
    }

    public function openIssuePicker(): void
    {
        $this->showIssuePicker = true;
    }

    public function closeIssuePicker(): void
    {
        $this->showIssuePicker = false;
    }

    public function setIssueDate(string $date): void
    {
        if (JalaliDate::fromString($date) !== null) {
            $this->issueDate = $date;
        }
        $this->showIssuePicker = false;
    }

    public function openDuePicker(): void
    {
        $this->showDuePicker = true;
    }

    public function closeDuePicker(): void
    {
        $this->showDuePicker = false;
    }

    public function setDueDate(string $date): void
    {
        if (JalaliDate::fromString($date) !== null) {
            $this->dueDate = $date;
        }
        $this->showDuePicker = false;
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

    public function save(): void
    {
        $this->clearNotice();
        try {
            (new LedgerWriter)->createCheque([
                'direction' => $this->direction,
                'number' => $this->number,
                'bank' => $this->bank,
                'amount' => Money::parseToRial($this->amountInput, $this->settings()->currency),
                'issue_jalali' => $this->issueDate,
                'due_jalali' => $this->dueDate,
                'counterparty' => $this->counterparty,
                'account_id' => $this->accountId,
                'note' => $this->note,
            ]);
            $this->succeed('چک ثبت شد.');
            $this->go('/obligations?tab=cheques');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function render(): View
    {
        $accounts = Account::query()->where('archived', false)->orderBy('name')->get();
        $balances = $this->ledger()->balances();
        $selectedAccount = $accounts->firstWhere('id', $this->accountId);
        $currency = $this->settings()->currency;

        return $this->screen('native.add-cheque', [
            'accounts' => $accounts->map(fn (Account $account): array => [
                'id' => $account->id,
                'name' => $account->name,
                'color' => $account->color,
                'initial' => mb_substr($account->name, 0, 1),
                'balance' => $this->amount($balances[$account->id] ?? 0),
            ])->all(),
            'selectedAccount' => $selectedAccount,
            'issueLabel' => $this->dateText($this->issueDate),
            'dueLabel' => $this->dateText($this->dueDate),
            'currencyLabel' => $currency === 'TOMAN' ? 'تومان' : 'ریال',
        ]);
    }
}
