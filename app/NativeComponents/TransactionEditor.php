<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Category;
use App\Models\Person;
use App\Models\Transaction;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use App\Support\Money;
use App\Support\Persian;
use Illuminate\View\View;
use InvalidArgumentException;

class TransactionEditor extends HesabScreen
{
    public ?int $transactionId = null;

    public string $kind = 'expense';

    public string $amountInput = '';

    public string $date = '';

    public ?int $accountId = null;

    public ?int $toAccountId = null;

    public ?int $categoryId = null;

    public ?int $personId = null;

    public string $note = '';

    public string $tagInput = '';

    /** @var list<string> */
    public array $tags = [];

    public string $feeInput = '0';

    public bool $showAccountPicker = false;

    public bool $showToAccountPicker = false;

    public bool $showCategoryPicker = false;

    public bool $showPersonPicker = false;

    public bool $showDatePicker = false;

    public bool $showDelete = false;

    public function mount(): void
    {
        $id = (int) $this->param('id');
        $settings = $this->settings();
        $accounts = Account::query()->where('archived', false)->orderBy('name')->get();

        if ($id > 0) {
            $transaction = Transaction::query()->find($id);
            if ($transaction === null) {
                $this->fail('تراکنش پیدا نشد.');

                return;
            }
            if ($transaction->ref_kind !== null) {
                $this->fail('تراکنش سیستمی از بخش مربوطه ویرایش می‌شود.');
                $this->go('/transactions');

                return;
            }
            $this->transactionId = $transaction->id;
            $this->kind = $transaction->kind;
            $this->amountInput = Persian::number(
                $settings->currency === 'TOMAN' ? (int) round($transaction->amount / 10) : (int) $transaction->amount,
                0,
                $settings->numerals
            );
            $this->date = $transaction->date_jalali;
            $this->accountId = $transaction->account_id;
            $this->toAccountId = $transaction->to_account_id;
            $this->categoryId = $transaction->category_id;
            $this->personId = $transaction->person_id;
            $this->note = (string) ($transaction->note ?? '');
            $this->tags = $transaction->tags ?? [];
            $this->tagInput = implode('، ', $this->tags);
            $this->feeInput = Persian::number(
                $settings->currency === 'TOMAN' ? (int) round($transaction->fee / 10) : (int) $transaction->fee,
                0,
                $settings->numerals
            );

            return;
        }

        $this->date = $this->today()->toString();
        $this->accountId = $accounts->first()?->id;
        $this->toAccountId = $accounts->firstWhere('id', '!=', $this->accountId)?->id;
        $this->categoryId = Category::query()->where('slug', 'groceries')->value('id');
    }

    public function setKind(string $kind): void
    {
        if (! in_array($kind, ['expense', 'income', 'transfer'], true)) {
            return;
        }
        $this->kind = $kind;
        if ($kind === 'transfer') {
            $this->categoryId = null;
            if ($this->toAccountId === null || $this->toAccountId === $this->accountId) {
                $this->toAccountId = Account::query()
                    ->where('archived', false)
                    ->where('id', '!=', $this->accountId)
                    ->value('id');
            }

            return;
        }

        $category = Category::query()
            ->where('kind', $kind)
            ->whereNotNull('parent_id')
            ->orderBy('name')
            ->first()
            ?? Category::query()->where('kind', $kind)->orderBy('name')->first();
        $this->categoryId = $category?->id;
    }

    public function addAmount(int $toman): void
    {
        $settings = $this->settings();
        $currentRial = Money::parseToRial($this->amountInput, $settings->currency);
        $factor = $settings->currency === 'TOMAN' ? 10 : 1;
        $next = $currentRial + $toman * 10;
        $this->amountInput = Persian::number((int) round($next / $factor), 0, $settings->numerals);
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
        if ($this->kind === 'transfer' && $this->toAccountId === $id) {
            $this->toAccountId = Account::query()
                ->where('archived', false)
                ->where('id', '!=', $id)
                ->value('id');
        }
    }

    public function openToAccountPicker(): void
    {
        $this->showToAccountPicker = true;
    }

    public function closeToAccountPicker(): void
    {
        $this->showToAccountPicker = false;
    }

    public function selectToAccount(int $id): void
    {
        if ($id === $this->accountId) {
            $this->fail('حساب مقصد باید با حساب مبدأ متفاوت باشد.');

            return;
        }
        $this->toAccountId = $id;
        $this->showToAccountPicker = false;
    }

    public function openCategoryPicker(): void
    {
        $this->showCategoryPicker = true;
    }

    public function closeCategoryPicker(): void
    {
        $this->showCategoryPicker = false;
    }

    public function selectCategory(int $id): void
    {
        $this->categoryId = $id;
        $this->showCategoryPicker = false;
    }

    public function openPersonPicker(): void
    {
        $this->showPersonPicker = true;
    }

    public function closePersonPicker(): void
    {
        $this->showPersonPicker = false;
    }

    public function selectPerson(?int $id): void
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

    public function setDate(string $date): void
    {
        if (JalaliDate::fromString($date) === null) {
            $this->fail('تاریخ انتخاب‌شده معتبر نیست.');

            return;
        }
        $this->date = $date;
        $this->showDatePicker = false;
    }

    public function addTag(): void
    {
        $tag = trim(str_replace('#', '', $this->tagInput));
        if ($tag === '') {
            return;
        }
        if (! in_array($tag, $this->tags, true)) {
            $this->tags[] = $tag;
        }
        $this->tagInput = '';
    }

    public function removeTag(string $tag): void
    {
        $this->tags = array_values(array_filter($this->tags, fn (string $item): bool => $item !== $tag));
    }

    public function save(): void
    {
        $this->clearNotice();
        $this->addTag();

        try {
            $data = [
                'kind' => $this->kind,
                'amount' => Money::parseToRial($this->amountInput, $this->settings()->currency),
                'account_id' => $this->accountId,
                'to_account_id' => $this->kind === 'transfer' ? $this->toAccountId : null,
                'category_id' => $this->kind === 'transfer' ? null : $this->categoryId,
                'person_id' => $this->personId,
                'note' => $this->note,
                'tags' => $this->tags,
                'date_jalali' => $this->date,
                'fee' => $this->kind === 'transfer'
                    ? Money::parseToRial($this->feeInput, $this->settings()->currency)
                    : 0,
            ];

            $writer = new LedgerWriter;
            if ($this->transactionId !== null) {
                $transaction = Transaction::query()->find($this->transactionId);
                if ($transaction === null) {
                    throw new InvalidArgumentException('تراکنش پیدا نشد.');
                }
                $writer->updateTransaction($transaction, $data);
                $this->succeed('تراکنش ویرایش شد.');
            } else {
                $writer->addTransaction($data);
                $this->succeed('تراکنش ثبت شد.');
            }

            $this->go('/transactions');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function requestDelete(): void
    {
        $this->showDelete = true;
    }

    public function closeDelete(): void
    {
        $this->showDelete = false;
    }

    public function delete(): void
    {
        if ($this->transactionId === null) {
            return;
        }
        $transaction = Transaction::query()->find($this->transactionId);
        if ($transaction === null) {
            $this->fail('تراکنش پیدا نشد.');

            return;
        }

        try {
            (new LedgerWriter)->deleteTransaction($transaction);
            $this->showDelete = false;
            $this->go('/transactions');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
            $this->showDelete = false;
        }
    }

    public function render(): View
    {
        $settings = $this->settings();
        $accounts = Account::query()->where('archived', false)->orderBy('name')->get();
        $balances = $this->ledger()->balances();
        $categories = Category::query()->where('kind', $this->kind)->orderBy('name')->get();
        $people = Person::query()->orderBy('name')->get();
        $amountRial = Money::parseToRial($this->amountInput, $settings->currency);

        $accountRows = $accounts->map(fn (Account $account): array => [
            'id' => $account->id,
            'name' => $account->name,
            'color' => $account->color,
            'initial' => mb_substr($account->name, 0, 1),
            'balance' => $this->amount($balances[$account->id] ?? 0),
        ])->all();

        $categoryRows = $categories->map(function (Category $category): array {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'color' => $category->color,
                'parent' => $category->parent_id !== null
                    ? Category::query()->whereKey($category->parent_id)->value('name')
                    : null,
            ];
        })->all();

        $selectedAccount = $accounts->firstWhere('id', $this->accountId);
        $selectedToAccount = $accounts->firstWhere('id', $this->toAccountId);
        $selectedCategory = $categories->firstWhere('id', $this->categoryId);
        $selectedPerson = $people->firstWhere('id', $this->personId);

        return $this->screen('native.transaction-editor', [
            'title' => $this->transactionId !== null ? 'ویرایش تراکنش' : 'ثبت تراکنش',
            'accounts' => $accountRows,
            'categories' => $categoryRows,
            'people' => $people->map(fn (Person $person): array => [
                'id' => $person->id,
                'name' => $person->name,
                'color' => $person->avatar_color,
                'initial' => mb_substr($person->name, 0, 1),
            ])->all(),
            'selectedAccount' => $selectedAccount,
            'selectedAccountBalance' => $selectedAccount ? ($this->ledger()->balances()[$selectedAccount->id] ?? 0) : 0,
            'selectedToAccount' => $selectedToAccount,
            'selectedCategoryName' => $selectedCategory?->name,
            'selectedPersonName' => $selectedPerson?->name,
            'amountRial' => $amountRial,
            'amountWords' => $amountRial > 0 ? Money::words($amountRial) : '',
            'dateLabel' => $this->dateText($this->date),
        ]);
    }
}
