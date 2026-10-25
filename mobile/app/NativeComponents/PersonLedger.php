<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Debt;
use App\Models\Person;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use App\Support\Money;
use App\Support\Persian;
use Illuminate\View\View;
use InvalidArgumentException;

class PersonLedger extends HesabScreen
{
    public int $personId = 0;

    public ?int $settleId = null;

    public string $settleInput = '';

    public ?int $settleAccountId = null;

    public bool $showSettle = false;

    public ?int $forgiveId = null;

    public bool $showForgive = false;

    public bool $showReminder = false;

    public string $reminderText = '';

    public ?int $deleteId = null;

    public bool $showDelete = false;

    public function mount(): void
    {
        $this->personId = (int) $this->param('id');
        if (Person::query()->whereKey($this->personId)->doesntExist()) {
            $this->fail('شخص پیدا نشد.');
            $this->go('/obligations?tab=people');
        }
    }

    public function createDebt(): void
    {
        $this->go("/debts/new?person={$this->personId}");
    }

    public function openSettle(int $debtId): void
    {
        $debt = Debt::query()->find($debtId);
        if ($debt === null) {
            return;
        }
        $outstanding = $this->ledger()->debtOutstanding($debt);
        $factor = $this->settings()->currency === 'TOMAN' ? 10 : 1;
        $this->settleId = $debt->id;
        $this->settleInput = Persian::number((int) round($outstanding / $factor), 0, $this->settings()->numerals);
        $this->settleAccountId = $debt->account_id;
        $this->showSettle = true;
    }

    public function closeSettle(): void
    {
        $this->showSettle = false;
        $this->settleId = null;
    }

    public function selectSettleAccount(?int $accountId): void
    {
        $this->settleAccountId = $accountId;
    }

    public function settle(): void
    {
        if ($this->settleId === null) {
            return;
        }
        $debt = Debt::query()->find($this->settleId);
        if ($debt === null) {
            return;
        }
        try {
            $amount = Money::parseToRial($this->settleInput, $this->settings()->currency);
            $account = $this->settleAccountId !== null ? Account::query()->find($this->settleAccountId) : null;
            (new LedgerWriter)->settleDebt($debt, $amount, $account);
            $this->succeed('تسویه ثبت شد.');
            $this->closeSettle();
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function openForgive(int $debtId): void
    {
        $this->forgiveId = $debtId;
        $this->showForgive = true;
    }

    public function closeForgive(): void
    {
        $this->showForgive = false;
        $this->forgiveId = null;
    }

    public function forgive(): void
    {
        if ($this->forgiveId === null) {
            return;
        }
        $debt = Debt::query()->find($this->forgiveId);
        if ($debt !== null) {
            try {
                (new LedgerWriter)->forgiveDebt($debt);
                $this->succeed('بدهی بخشیده شد.');
            } catch (InvalidArgumentException $exception) {
                $this->fail($exception->getMessage());
            }
        }
        $this->closeForgive();
    }

    public function openReminder(int $debtId): void
    {
        $debt = Debt::query()->find($debtId);
        $person = Person::query()->find($this->personId);
        if ($debt === null || $person === null) {
            return;
        }
        $amount = $this->amount($this->ledger()->debtOutstanding($debt));
        $due = $debt->due_jalali ? $this->dateText($debt->due_jalali, 'long') : 'بدون تاریخ مشخص';
        $this->reminderText = "سلام {$person->name} عزیز، وقت‌تان بخیر.\n"
            .'یادآوری دوستانه‌ای درباره «'.($debt->note ?? 'مبلغ امانتی')."» به مبلغ {$amount} داشتم.\n"
            ."سررسید توافق‌شده: {$due}.\n"
            ."اگر برایتان مقدور است و وضعیت مالی‌تان اجازه می‌دهد، لطفاً برای تسویه هماهنگ کنیم.\n"
            .'خیلی ممنون و ارادتمند.';
        $this->showReminder = true;
    }

    public function closeReminder(): void
    {
        $this->showReminder = false;
    }

    public function requestDelete(int $debtId): void
    {
        $this->deleteId = $debtId;
        $this->showDelete = true;
    }

    public function closeDelete(): void
    {
        $this->deleteId = null;
        $this->showDelete = false;
    }

    public function deleteDebt(): void
    {
        if ($this->deleteId === null) {
            return;
        }
        $debt = Debt::query()->find($this->deleteId);
        if ($debt !== null) {
            (new LedgerWriter)->deleteDebt($debt);
        }
        $this->closeDelete();
    }

    public function render(): View
    {
        $person = Person::query()->find($this->personId);
        if ($person === null) {
            return $this->screen('native.person-ledger', [
                'person' => null,
                'summary' => null,
                'rows' => [],
                'accounts' => [],
            ]);
        }

        $summary = $this->ledger()->personSummary($person);
        $debts = Debt::query()
            ->where('person_id', $person->id)
            ->orderByRaw("case when status = 'active' then 0 else 1 end")
            ->orderBy('due_jalali')
            ->get();

        $rows = $debts->map(function (Debt $debt): array {
            $outstanding = $this->ledger()->debtOutstanding($debt);
            $due = $debt->due_jalali;
            $overdue = $due !== null && JalaliDate::fromString($due)?->isBefore($this->today());

            return [
                'id' => $debt->id,
                'direction' => $debt->direction,
                'direction_label' => $debt->direction === 'lent' ? 'طلب من' : 'بدهی من',
                'amount' => $this->amount($outstanding),
                'original' => $this->originalLabel($debt),
                'due' => $due ? $this->dateText($due, 'long') : 'بدون تاریخ',
                'due_label' => $due ? (JalaliDate::fromString($due)?->dueLabel($this->today(), $this->settings()->numerals) ?? '') : '',
                'overdue' => $overdue,
                'status' => $debt->status,
                'status_label' => match ($debt->status) {
                    'settled' => 'تسویه شده',
                    'forgiven' => 'بخشیده شده',
                    default => 'فعال',
                },
                'note' => $debt->note,
                'settled_amount' => $debt->settlements !== [] ? $this->amount($this->ledger()->debtSettled($debt)) : null,
                'active' => $debt->status === 'active' && $outstanding > 0,
            ];
        })->all();

        return $this->screen('native.person-ledger', [
            'person' => $person,
            'summary' => $summary,
            'rows' => $rows,
            'balanceLabel' => $this->amount($summary['balance'], true),
            'lentLabel' => $this->amount($summary['lent']),
            'borrowedLabel' => $this->amount($summary['borrowed']),
            'accounts' => Account::query()->where('archived', false)->orderBy('name')->get()->map(fn (Account $account): array => [
                'id' => $account->id,
                'name' => $account->name,
                'color' => $account->color,
                'initial' => mb_substr($account->name, 0, 1),
            ])->all(),
            'settleOutstanding' => $this->settleId !== null
                ? $this->amount($this->ledger()->debtOutstanding(Debt::query()->findOrFail($this->settleId)))
                : null,
            'reminderText' => $this->reminderText,
            'reminderLines' => $this->reminderText === '' ? [] : explode("\n", $this->reminderText),
        ]);
    }

    private function originalLabel(Debt $debt): string
    {
        if (in_array($debt->original_unit, ['toman', 'rial'], true)) {
            return $this->amount((int) $debt->amount);
        }

        $unit = match ($debt->original_unit) {
            'usd' => 'دلار',
            'gold_coin' => 'سکه',
            'gold_gram' => 'گرم طلا',
            default => 'واحد',
        };

        return Persian::number($debt->quantity, 2, $this->settings()->numerals).' '.$unit;
    }
}
