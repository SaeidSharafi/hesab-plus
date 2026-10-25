<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Asset;
use App\Models\Person;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use App\Support\Persian;
use Illuminate\View\View;
use InvalidArgumentException;

class AddDebt extends HesabScreen
{
    public string $direction = 'lent';

    public ?int $personId = null;

    public string $newPersonName = '';

    public string $unit = 'toman';

    public string $quantityInput = '';

    public string $dueDate = '';

    public bool $affectsAccount = false;

    public ?int $accountId = null;

    public string $note = '';

    public bool $showPersonPicker = false;

    public bool $showDatePicker = false;

    public bool $showAccountPicker = false;

    public function mount(): void
    {
        $requested = (int) $this->data('person', 0);
        $this->personId = $requested > 0
            ? Person::query()->whereKey($requested)->value('id')
            : Person::query()->orderBy('name')->value('id');
        $this->dueDate = $this->today()->addDays(30)->toString();
        $this->accountId = Account::query()->where('archived', false)->orderBy('name')->value('id');
    }

    public function setDirection(string $direction): void
    {
        if (in_array($direction, ['lent', 'borrowed'], true)) {
            $this->direction = $direction;
        }
    }

    public function setUnit(string $unit): void
    {
        if (in_array($unit, ['toman', 'rial', 'usd', 'gold_coin', 'gold_gram'], true)) {
            $this->unit = $unit;
        }
    }

    public function openPersonPicker(): void
    {
        $this->showPersonPicker = true;
    }

    public function closePersonPicker(): void
    {
        $this->showPersonPicker = false;
    }

    public function selectPerson(int $id): void
    {
        $this->personId = $id;
        $this->showPersonPicker = false;
    }

    public function openDatePicker(): void
    {
        $this->showDatePicker = true;
    }

    public function closeDatePicker(): void
    {
        $this->showDatePicker = false;
    }

    public function setDueDate(string $date): void
    {
        if (JalaliDate::fromString($date) !== null) {
            $this->dueDate = $date;
        }
        $this->showDatePicker = false;
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
            $person = null;
            if (trim($this->newPersonName) !== '') {
                $person = (new LedgerWriter)->createPerson($this->newPersonName);
            } else {
                $person = Person::query()->find($this->personId);
            }
            if ($person === null) {
                throw new InvalidArgumentException('شخص را انتخاب کنید یا نام شخص جدید را وارد کنید.');
            }

            $quantity = (float) str_replace([',', '٬', '،', ' '], '', Persian::english($this->quantityInput));
            if ($quantity <= 0) {
                throw new InvalidArgumentException('مقدار بدهی یا طلب را وارد کنید.');
            }

            $rate = $this->unitRate();
            $amount = (int) round($quantity * $rate);

            (new LedgerWriter)->createDebt([
                'person_id' => $person->id,
                'direction' => $this->direction,
                'amount' => $amount,
                'original_unit' => $this->unit,
                'quantity' => $quantity,
                'unit_rate' => $rate,
                'date_jalali' => $this->today()->toString(),
                'due_jalali' => $this->dueDate,
                'affects_account' => $this->affectsAccount,
                'account_id' => $this->accountId,
                'note' => $this->note,
            ]);

            $this->succeed('بدهی/طلب ثبت شد.');
            $this->go("/people/{$person->id}");
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function render(): View
    {
        $people = Person::query()->orderBy('name')->get();
        $accounts = Account::query()->where('archived', false)->orderBy('name')->get();
        $balances = $this->ledger()->balances();
        $selectedPerson = $people->firstWhere('id', $this->personId);
        $selectedAccount = $accounts->firstWhere('id', $this->accountId);
        $rate = $this->unitRate();
        $quantity = (float) str_replace([',', '٬', '،', ' '], '', Persian::english($this->quantityInput));
        $preview = $quantity > 0 ? $this->amount((int) round($quantity * $rate)) : null;
        $asset = match ($this->unit) {
            'usd' => Asset::query()->where('symbol', 'USD')->first(),
            'gold_coin' => Asset::query()->where('symbol', 'COIN')->first(),
            'gold_gram' => Asset::query()->where('symbol', 'GOLD18')->first(),
            default => null,
        };

        return $this->screen('native.add-debt', [
            'people' => $people->map(fn (Person $person): array => [
                'id' => $person->id,
                'name' => $person->name,
                'color' => $person->avatar_color,
                'initial' => mb_substr($person->name, 0, 1),
            ])->all(),
            'accounts' => $accounts->map(fn (Account $account): array => [
                'id' => $account->id,
                'name' => $account->name,
                'color' => $account->color,
                'initial' => mb_substr($account->name, 0, 1),
                'balance' => $this->amount($balances[$account->id] ?? 0),
            ])->all(),
            'selectedPerson' => $selectedPerson,
            'selectedAccount' => $selectedAccount,
            'dueLabel' => $this->dateText($this->dueDate),
            'unitLabel' => $this->unitLabel(),
            'unitRateLabel' => $this->amount($rate),
            'unitPriceSource' => $asset?->name,
            'preview' => $preview,
            'currencyLabel' => $this->settings()->currency === 'TOMAN' ? 'تومان' : 'ریال',
        ]);
    }

    private function unitRate(): int
    {
        return match ($this->unit) {
            'rial' => 1,
            'usd' => (int) (Asset::query()->where('symbol', 'USD')->value('current_price') ?: 685_000),
            'gold_coin' => (int) (Asset::query()->where('symbol', 'COIN')->value('current_price') ?: 512_000_000),
            'gold_gram' => (int) (Asset::query()->where('symbol', 'GOLD18')->value('current_price') ?: 44_500_000),
            default => 10,
        };
    }

    private function unitLabel(): string
    {
        return match ($this->unit) {
            'rial' => 'ریال',
            'usd' => 'دلار',
            'gold_coin' => 'سکه',
            'gold_gram' => 'گرم طلا',
            default => 'تومان',
        };
    }
}
