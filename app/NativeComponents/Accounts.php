<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\Money;
use Illuminate\View\View;
use InvalidArgumentException;

class Accounts extends HesabScreen
{
    public bool $showForm = false;

    public ?int $archiveId = null;

    public bool $showArchive = false;

    public string $name = '';

    public string $type = 'bank';

    public string $bankName = '';

    public string $number = '';

    public string $openingInput = '0';

    public bool $includeInNetWorth = true;

    public function openForm(): void
    {
        $this->name = '';
        $this->type = 'bank';
        $this->bankName = '';
        $this->number = '';
        $this->openingInput = '0';
        $this->includeInNetWorth = true;
        $this->showForm = true;
    }

    public function closeForm(): void
    {
        $this->showForm = false;
    }

    public function setType(string $type): void
    {
        if (in_array($type, ['bank', 'card', 'cash', 'wallet', 'savings', 'investment', 'credit'], true)) {
            $this->type = $type;
        }
    }

    public function save(): void
    {
        try {
            (new LedgerWriter)->createAccount([
                'name' => $this->name,
                'type' => $this->type,
                'bank_name' => $this->bankName,
                'number' => $this->number,
                'opening_balance' => Money::parseToRial($this->openingInput, $this->settings()->currency),
                'include_in_net_worth' => $this->includeInNetWorth,
                'icon' => match ($this->type) {
                    'cash', 'wallet' => 'wallet',
                    'card' => 'credit_card',
                    'savings' => 'savings',
                    'investment' => 'trending_up',
                    default => 'account_balance',
                },
            ]);
            $this->succeed('حساب اضافه شد.');
            $this->showForm = false;
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function requestArchive(int $id): void
    {
        $this->archiveId = $id;
        $this->showArchive = true;
    }

    public function closeArchive(): void
    {
        $this->archiveId = null;
        $this->showArchive = false;
    }

    public function archive(): void
    {
        if ($this->archiveId === null) {
            return;
        }
        $account = Account::query()->find($this->archiveId);
        if ($account !== null) {
            (new LedgerWriter)->archiveAccount($account);
            $this->succeed('حساب آرشیو شد.');
        }
        $this->closeArchive();
    }

    public function render(): View
    {
        $ledger = $this->ledger();
        $rows = $ledger->accountRows();
        $total = 0;
        foreach ($rows as $row) {
            if ($row['account']->include_in_net_worth) {
                $total += $row['balance'];
            }
        }
        $currency = $this->settings()->currency;

        return $this->screen('native.accounts', [
            'rows' => array_map(fn (array $row): array => [
                'id' => $row['account']->id,
                'name' => $row['account']->name,
                'type' => $this->typeLabel($row['account']->type),
                'balance' => $this->amount($row['balance']),
                'color' => $row['account']->color,
                'initial' => mb_substr($row['account']->name, 0, 1),
                'include' => $row['account']->include_in_net_worth,
                'bank' => $row['account']->bank_name,
            ], $rows),
            'total' => $this->amount($total),
            'currencyLabel' => $currency === 'TOMAN' ? 'تومان' : 'ریال',
        ]);
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            'bank' => 'حساب بانکی',
            'card' => 'کارت',
            'cash' => 'نقد',
            'wallet' => 'کیف پول',
            'savings' => 'سپرده',
            'investment' => 'سرمایه‌گذاری',
            'credit' => 'اعتباری',
            default => 'حساب',
        };
    }
}
