<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Asset;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Cheque;
use App\Models\Debt;
use App\Models\Goal;
use App\Models\Installment;
use App\Models\Loan;
use App\Models\Lot;
use App\Models\Person;
use App\Models\Setting;
use App\Models\Transaction;
use App\Support\JalaliDate;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

final class LedgerWriter
{
    public function __construct(
        private readonly ?Ledger $ledger = null,
    ) {}

    private function ledger(): Ledger
    {
        return $this->ledger ?? new Ledger;
    }

    // -----------------------------------------------------------------
    // Transactions
    // -----------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $data
     */
    public function addTransaction(array $data): Transaction
    {
        $kind = (string) ($data['kind'] ?? 'expense');
        if (! in_array($kind, ['expense', 'income', 'transfer'], true)) {
            throw new InvalidArgumentException('نوع تراکنش دستی معتبر نیست.');
        }

        $amount = (int) ($data['amount'] ?? 0);
        if ($amount <= 0) {
            throw new InvalidArgumentException('مبلغ باید بزرگ‌تر از صفر باشد.');
        }

        $account = Account::query()->find((int) ($data['account_id'] ?? 0));
        if ($account === null) {
            throw new InvalidArgumentException('حساب انتخاب‌شده پیدا نشد.');
        }

        $toAccountId = null;
        if ($kind === 'transfer') {
            $toAccountId = (int) ($data['to_account_id'] ?? 0);
            if ($toAccountId === 0 || $toAccountId === $account->id) {
                throw new InvalidArgumentException('حساب مقصد باید با حساب مبدأ متفاوت باشد.');
            }
            if (! Account::query()->whereKey($toAccountId)->exists()) {
                throw new InvalidArgumentException('حساب مقصد پیدا نشد.');
            }
        }

        $categoryId = null;
        if ($kind !== 'transfer' && ! empty($data['category_id'])) {
            $category = Category::query()->find((int) $data['category_id']);
            if ($category !== null && $category->kind === $kind) {
                $categoryId = $category->id;
            }
        }

        $date = JalaliDate::fromString((string) ($data['date_jalali'] ?? ''));
        if ($date === null) {
            throw new InvalidArgumentException('تاریخ تراکنش معتبر نیست.');
        }

        $splits = $data['splits'] ?? null;
        if (is_array($splits) && $splits !== []) {
            $validated = [];
            $sum = 0;
            foreach ($splits as $split) {
                $splitCategory = Category::query()->find((int) ($split['category_id'] ?? 0));
                $splitAmount = (int) ($split['amount'] ?? 0);
                if ($splitCategory === null || $splitAmount <= 0) {
                    continue;
                }
                $validated[] = ['category_id' => $splitCategory->id, 'amount' => $splitAmount];
                $sum += $splitAmount;
            }
            if ($validated !== [] && $sum !== $amount) {
                throw new InvalidArgumentException('جمع اقلام تفکیک‌شده باید برابر با مبلغ کل باشد.');
            }
            $splits = $validated === [] ? null : $validated;
        } else {
            $splits = null;
        }

        return Transaction::query()->create([
            'kind' => $kind,
            'account_id' => $account->id,
            'to_account_id' => $toAccountId,
            'amount' => $amount,
            'fee' => max(0, (int) ($data['fee'] ?? 0)),
            'date_jalali' => $date->toString(),
            'category_id' => $categoryId,
            'person_id' => ! empty($data['person_id']) ? (int) $data['person_id'] : null,
            'note' => $this->nullableString($data['note'] ?? null),
            'tags' => $this->tags($data['tags'] ?? []),
            'splits' => $splits,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateTransaction(Transaction $transaction, array $data): Transaction
    {
        if ($transaction->ref_kind !== null) {
            throw new InvalidArgumentException('تراکنش‌های سیستمی از صفحه مربوط به خودشان قابل ویرایش‌اند.');
        }

        $kind = (string) ($data['kind'] ?? $transaction->kind);
        if (! in_array($kind, ['expense', 'income', 'transfer'], true)) {
            throw new InvalidArgumentException('نوع تراکنش معتبر نیست.');
        }
        $amount = (int) ($data['amount'] ?? 0);
        if ($amount <= 0) {
            throw new InvalidArgumentException('مبلغ باید بزرگ‌تر از صفر باشد.');
        }
        $account = Account::query()->find((int) ($data['account_id'] ?? 0));
        if ($account === null) {
            throw new InvalidArgumentException('حساب انتخاب‌شده پیدا نشد.');
        }
        $date = JalaliDate::fromString((string) ($data['date_jalali'] ?? ''));
        if ($date === null) {
            throw new InvalidArgumentException('تاریخ معتبر نیست.');
        }

        $toAccountId = null;
        if ($kind === 'transfer') {
            $toAccountId = (int) ($data['to_account_id'] ?? 0);
            if ($toAccountId === 0 || $toAccountId === $account->id || ! Account::query()->whereKey($toAccountId)->exists()) {
                throw new InvalidArgumentException('حساب مقصد معتبر نیست.');
            }
        }

        $categoryId = null;
        if ($kind !== 'transfer' && ! empty($data['category_id'])) {
            $category = Category::query()->find((int) $data['category_id']);
            if ($category !== null && $category->kind === $kind) {
                $categoryId = $category->id;
            }
        }

        $transaction->update([
            'kind' => $kind,
            'account_id' => $account->id,
            'to_account_id' => $toAccountId,
            'amount' => $amount,
            'fee' => max(0, (int) ($data['fee'] ?? 0)),
            'date_jalali' => $date->toString(),
            'category_id' => $categoryId,
            'person_id' => ! empty($data['person_id']) ? (int) $data['person_id'] : null,
            'note' => $this->nullableString($data['note'] ?? null),
            'tags' => $this->tags($data['tags'] ?? []),
            'splits' => null,
        ]);

        return $transaction->refresh();
    }

    public function deleteTransaction(Transaction $transaction): void
    {
        if ($transaction->ref_kind !== null) {
            throw new InvalidArgumentException('این تراکنش به یک قسط، چک یا دارایی متصل است و باید از همان بخش حذف شود.');
        }

        $transaction->delete();
    }

    // -----------------------------------------------------------------
    // Loans
    // -----------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $data
     */
    public function createLoan(array $data): Loan
    {
        $principal = (int) ($data['principal'] ?? 0);
        $count = (int) ($data['installment_count'] ?? 0);
        $frequency = (int) ($data['frequency_months'] ?? 1);
        $rate = (float) ($data['annual_rate'] ?? 0);
        $firstDue = JalaliDate::fromString((string) ($data['first_due_jalali'] ?? ''));
        $account = Account::query()->find((int) ($data['account_id'] ?? 0));
        $lender = trim((string) ($data['lender'] ?? ''));

        if ($lender === '') {
            throw new InvalidArgumentException('نام بانک یا پرداخت‌کننده وام را وارد کنید.');
        }
        if ($account === null) {
            throw new InvalidArgumentException('حساب واریز و پرداخت اقساط را انتخاب کنید.');
        }
        if ($firstDue === null) {
            throw new InvalidArgumentException('تاریخ اولین قسط معتبر نیست.');
        }

        $model = (string) ($data['interest_model'] ?? 'reducing_balance');
        $fee = max(0, (int) ($data['total_fee'] ?? 0));
        $schedule = Amortization::schedule($principal, $rate, $count, $frequency, $firstDue->toString(), $model);
        $disbursement = JalaliDate::fromString((string) ($data['disbursement_jalali'] ?? '')) ?? $firstDue->addMonths(-1);

        return DB::transaction(function () use ($data, $lender, $principal, $model, $rate, $count, $frequency, $firstDue, $account, $fee, $schedule, $disbursement): Loan {
            $loan = Loan::query()->create([
                'lender' => $lender,
                'principal' => $principal,
                'interest_model' => $model,
                'annual_rate' => $rate,
                'total_fee' => $fee,
                'installment_count' => $count,
                'frequency_months' => $frequency,
                'disbursement_jalali' => $disbursement->toString(),
                'first_due_jalali' => $firstDue->toString(),
                'account_id' => $account->id,
                'penalty_annual_percent' => max(0, (float) ($data['penalty_annual_percent'] ?? 6)),
                'status' => 'active',
                'note' => $this->nullableString($data['note'] ?? null),
            ]);

            foreach ($schedule['rows'] as $row) {
                Installment::query()->create([
                    'loan_id' => $loan->id,
                    'number' => $row['number'],
                    'due_jalali' => $row['due'],
                    'amount' => $row['amount'],
                    'principal' => $row['principal'],
                    'interest' => $row['interest'],
                    'penalty' => 0,
                ]);
            }

            Transaction::query()->create([
                'kind' => 'loan',
                'account_id' => $account->id,
                'amount' => $principal,
                'fee' => $fee,
                'date_jalali' => $disbursement->toString(),
                'note' => 'دریافت وام از '.$lender,
                'tags' => ['وام'],
                'cash_direction' => 'in',
                'ref_kind' => 'loan',
                'ref_id' => (string) $loan->id,
            ]);

            return $loan->load('installments');
        });
    }

    public function payInstallment(Installment $installment, ?Account $account = null, ?JalaliDate $date = null): Transaction
    {
        if ($installment->paid_txn_id !== null) {
            throw new InvalidArgumentException('این قسط قبلاً پرداخت شده است.');
        }

        $loan = $installment->loan;
        if ($loan === null) {
            throw new InvalidArgumentException('وام مربوط به این قسط پیدا نشد.');
        }
        $account ??= Account::query()->find($loan->account_id);
        if ($account === null) {
            throw new InvalidArgumentException('حساب پرداخت قسط پیدا نشد.');
        }
        $date ??= $this->ledger()->today();
        $state = $this->ledger()->installmentState($installment, $loan, $date);
        $amount = (int) $installment->amount + $state['penalty'];
        $interest = (int) $installment->interest + $state['penalty'];
        $loanInterestCategory = Category::query()->where('slug', 'loan_interest')->value('id');

        return DB::transaction(function () use ($installment, $loan, $account, $date, $amount, $interest, $loanInterestCategory, $state): Transaction {
            $transaction = Transaction::query()->create([
                'kind' => 'loan',
                'account_id' => $account->id,
                'amount' => $amount,
                'fee' => 0,
                'date_jalali' => $date->toString(),
                'category_id' => $interest > 0 ? $loanInterestCategory : null,
                'note' => "پرداخت قسط {$installment->number} {$loan->lender}",
                'tags' => ['قسط_وام'],
                'cash_direction' => 'out',
                'loan_interest' => $interest,
                'ref_kind' => 'loan_installment',
                'ref_id' => (string) $loan->id,
                'installment_id' => $installment->id,
            ]);

            $installment->update([
                'paid_at_jalali' => $date->toString(),
                'paid_txn_id' => $transaction->id,
                'penalty' => $state['penalty'],
            ]);

            if (! $loan->installments()->whereNull('paid_txn_id')->exists()) {
                $loan->update(['status' => 'settled']);
            }

            return $transaction;
        });
    }

    public function undoInstallment(Installment $installment): void
    {
        if ($installment->paid_txn_id === null) {
            throw new InvalidArgumentException('این قسط پرداخت نشده است.');
        }

        DB::transaction(function () use ($installment): void {
            Transaction::query()->whereKey($installment->paid_txn_id)->delete();
            $installment->update([
                'paid_at_jalali' => null,
                'paid_txn_id' => null,
            ]);
            $installment->loan?->update(['status' => 'active']);
        });
    }

    public function deferInstallment(Installment $installment, int $days = 7): void
    {
        if ($installment->paid_txn_id !== null) {
            throw new InvalidArgumentException('قسط پرداخت‌شده قابل تعویق نیست.');
        }
        $due = JalaliDate::fromString($installment->due_jalali);
        $base = $due?->isBefore($this->ledger()->today()) ? $this->ledger()->today() : ($due ?? $this->ledger()->today());
        $installment->update(['deferred_to_jalali' => $base->addDays($days)->toString()]);
    }

    public function deleteLoan(Loan $loan): void
    {
        DB::transaction(function () use ($loan): void {
            Transaction::query()
                ->where(function ($query) use ($loan): void {
                    $query->where('ref_id', (string) $loan->id)
                        ->orWhereIn('installment_id', $loan->installments()->pluck('id'));
                })
                ->delete();
            $loan->delete();
        });
    }

    // -----------------------------------------------------------------
    // Cheques
    // -----------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $data
     */
    public function createCheque(array $data): Cheque
    {
        $amount = (int) ($data['amount'] ?? 0);
        if ($amount <= 0) {
            throw new InvalidArgumentException('مبلغ چک معتبر نیست.');
        }
        $number = trim((string) ($data['number'] ?? ''));
        if ($number === '') {
            throw new InvalidArgumentException('شماره چک را وارد کنید.');
        }
        $due = JalaliDate::fromString((string) ($data['due_jalali'] ?? ''));
        if ($due === null) {
            throw new InvalidArgumentException('تاریخ سررسید چک معتبر نیست.');
        }

        return Cheque::query()->create([
            'direction' => ($data['direction'] ?? 'issued') === 'received' ? 'received' : 'issued',
            'number' => $number,
            'bank' => trim((string) ($data['bank'] ?? 'بانک')) ?: 'بانک',
            'amount' => $amount,
            'issue_jalali' => JalaliDate::fromString((string) ($data['issue_jalali'] ?? ''))?->toString() ?? $this->ledger()->today()->toString(),
            'due_jalali' => $due->toString(),
            'counterparty' => trim((string) ($data['counterparty'] ?? '')) ?: 'طرف حساب',
            'status' => 'pending',
            'note' => $this->nullableString($data['note'] ?? null),
            'account_id' => ! empty($data['account_id']) ? (int) $data['account_id'] : null,
        ]);
    }

    public function settleCheque(Cheque $cheque, ?Account $account = null, ?Category $category = null): void
    {
        if ($cheque->status !== 'pending') {
            throw new InvalidArgumentException('این چک قبلاً تعیین وضعیت شده است.');
        }
        $account ??= Account::query()->find($cheque->account_id) ?? Account::query()->first();
        if ($account === null) {
            throw new InvalidArgumentException('حساب وصول یا پرداخت چک پیدا نشد.');
        }

        DB::transaction(function () use ($cheque, $account, $category): void {
            $transaction = Transaction::query()->create([
                'kind' => $cheque->direction === 'issued' ? 'expense' : 'income',
                'account_id' => $account->id,
                'amount' => $cheque->amount,
                'fee' => 0,
                'date_jalali' => $this->ledger()->today()->toString(),
                'category_id' => $category?->id,
                'note' => 'چک '.($cheque->direction === 'issued' ? 'پرداخت‌شده به ' : 'وصول‌شده از ').$cheque->counterparty,
                'tags' => ['چک'],
                'ref_kind' => 'cheque',
                'ref_id' => (string) $cheque->id,
                'cheque_id' => $cheque->id,
            ]);

            $cheque->update([
                'status' => 'cashed',
                'account_id' => $account->id,
                'txn_id' => $transaction->id,
            ]);
        });
    }

    public function setChequeStatus(Cheque $cheque, string $status): void
    {
        if (! in_array($status, ['pending', 'cashed', 'bounced', 'returned', 'canceled'], true)) {
            throw new InvalidArgumentException('وضعیت چک معتبر نیست.');
        }
        if ($status === 'cashed') {
            $this->settleCheque($cheque);

            return;
        }

        if ($cheque->txn_id !== null) {
            Transaction::query()->whereKey($cheque->txn_id)->delete();
        }
        $cheque->update([
            'status' => $status,
            'txn_id' => null,
        ]);
    }

    public function undoCheque(Cheque $cheque): void
    {
        if ($cheque->txn_id !== null) {
            Transaction::query()->whereKey($cheque->txn_id)->delete();
        }
        $cheque->update(['status' => 'pending', 'txn_id' => null]);
    }

    public function deleteCheque(Cheque $cheque): void
    {
        if ($cheque->txn_id !== null) {
            Transaction::query()->whereKey($cheque->txn_id)->delete();
        }
        $cheque->delete();
    }

    // -----------------------------------------------------------------
    // Debts & people
    // -----------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $data
     */
    public function createDebt(array $data): Debt
    {
        $person = Person::query()->find((int) ($data['person_id'] ?? 0));
        if ($person === null) {
            throw new InvalidArgumentException('شخص را انتخاب کنید.');
        }
        $amount = (int) ($data['amount'] ?? 0);
        if ($amount <= 0) {
            throw new InvalidArgumentException('مبلغ بدهی یا طلب معتبر نیست.');
        }
        $direction = ($data['direction'] ?? 'lent') === 'borrowed' ? 'borrowed' : 'lent';
        $date = JalaliDate::fromString((string) ($data['date_jalali'] ?? '')) ?? $this->ledger()->today();
        $due = JalaliDate::fromString((string) ($data['due_jalali'] ?? ''));
        $affectsAccount = (bool) ($data['affects_account'] ?? false);
        $account = $affectsAccount ? Account::query()->find((int) ($data['account_id'] ?? 0)) : null;

        return DB::transaction(function () use ($data, $person, $amount, $direction, $date, $due, $affectsAccount, $account): Debt {
            $debt = Debt::query()->create([
                'person_id' => $person->id,
                'direction' => $direction,
                'amount' => $amount,
                'original_unit' => (string) ($data['original_unit'] ?? 'toman'),
                'quantity' => (float) ($data['quantity'] ?? $amount / 10),
                'unit_rate' => max(0, (int) ($data['unit_rate'] ?? 10)),
                'date_jalali' => $date->toString(),
                'due_jalali' => $due?->toString(),
                'affects_account' => $affectsAccount,
                'account_id' => $account?->id,
                'note' => $this->nullableString($data['note'] ?? null),
                'status' => 'active',
                'settlements' => [],
            ]);

            if ($affectsAccount && $account !== null) {
                Transaction::query()->create([
                    'kind' => 'debt',
                    'account_id' => $account->id,
                    'amount' => $amount,
                    'fee' => 0,
                    'date_jalali' => $date->toString(),
                    'note' => ($direction === 'lent' ? 'قرض داده‌شده به ' : 'قرض گرفته‌شده از ').$person->name,
                    'tags' => [$direction === 'lent' ? 'طلب' : 'بدهی'],
                    'cash_direction' => $direction === 'lent' ? 'out' : 'in',
                    'ref_kind' => 'debt',
                    'ref_id' => (string) $debt->id,
                    'debt_id' => $debt->id,
                    'person_id' => $person->id,
                ]);
            }

            return $debt;
        });
    }

    public function settleDebt(Debt $debt, int $amount, ?Account $account = null, ?JalaliDate $date = null): void
    {
        $outstanding = $this->ledger()->debtOutstanding($debt);
        $amount = min(max(0, $amount), $outstanding);
        if ($amount <= 0) {
            throw new InvalidArgumentException('مبلغ تسویه باید بیشتر از صفر و کمتر از مانده باشد.');
        }
        $date ??= $this->ledger()->today();
        $person = $debt->person;

        DB::transaction(function () use ($debt, $amount, $account, $date, $person): void {
            $transaction = null;
            if ($account !== null) {
                $transaction = Transaction::query()->create([
                    'kind' => 'debt',
                    'account_id' => $account->id,
                    'amount' => $amount,
                    'fee' => 0,
                    'date_jalali' => $date->toString(),
                    'note' => ($debt->direction === 'lent' ? 'دریافت تسویه از ' : 'پرداخت تسویه به ').($person?->name ?? 'شخص'),
                    'tags' => ['تسویه'],
                    'cash_direction' => $debt->direction === 'lent' ? 'in' : 'out',
                    'ref_kind' => 'debt_settlement',
                    'ref_id' => (string) $debt->id,
                    'debt_id' => $debt->id,
                    'person_id' => $debt->person_id,
                ]);
            }

            $settlements = $debt->settlements ?? [];
            $settlements[] = [
                'id' => (string) Str::uuid(),
                'date' => $date->toString(),
                'amount' => $amount,
                'account_id' => $account?->id,
                'txn_id' => $transaction?->id,
            ];

            $debt->update([
                'settlements' => $settlements,
                'status' => $this->ledger()->debtSettled($debt) + $amount >= (int) $debt->amount ? 'settled' : 'active',
            ]);
        });
    }

    public function forgiveDebt(Debt $debt): void
    {
        if ($debt->status !== 'active') {
            throw new InvalidArgumentException('این بدهی دیگر فعال نیست.');
        }
        $debt->update([
            'status' => 'forgiven',
            'forgiven_at_jalali' => $this->ledger()->today()->toString(),
        ]);
    }

    public function deleteDebt(Debt $debt): void
    {
        Transaction::query()
            ->where('ref_kind', 'debt')
            ->where('ref_id', (string) $debt->id)
            ->delete();
        Transaction::query()
            ->where('ref_kind', 'debt_settlement')
            ->where('ref_id', (string) $debt->id)
            ->delete();
        $debt->delete();
    }

    public function createPerson(string $name, ?string $phone = null, ?string $note = null): Person
    {
        $name = trim($name);
        if ($name === '') {
            throw new InvalidArgumentException('نام شخص را وارد کنید.');
        }
        $colors = ['#0F766E', '#B45309', '#1D4ED8', '#BE185D', '#7C3AED', '#15803D', '#B91C1C'];
        $existing = Person::query()->count();

        return Person::query()->create([
            'name' => $name,
            'phone' => $this->nullableString($phone),
            'note' => $this->nullableString($note),
            'avatar_color' => $colors[$existing % count($colors)],
        ]);
    }

    // -----------------------------------------------------------------
    // Accounts
    // -----------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $data
     */
    public function createAccount(array $data): Account
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('نام حساب را وارد کنید.');
        }
        $colors = ['#0F766E', '#2563EB', '#B45309', '#16A34A', '#7C3AED', '#BE185D'];

        return Account::query()->create([
            'name' => $name,
            'type' => (string) ($data['type'] ?? 'bank'),
            'bank_name' => $this->nullableString($data['bank_name'] ?? null),
            'number' => $this->nullableString($data['number'] ?? null),
            'opening_balance' => (int) ($data['opening_balance'] ?? 0),
            'color' => (string) ($data['color'] ?? $colors[Account::query()->count() % count($colors)]),
            'icon' => (string) ($data['icon'] ?? 'account_balance'),
            'include_in_net_worth' => (bool) ($data['include_in_net_worth'] ?? true),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateAccount(Account $account, array $data): Account
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('نام حساب را وارد کنید.');
        }
        $account->update([
            'name' => $name,
            'type' => (string) ($data['type'] ?? $account->type),
            'bank_name' => $this->nullableString($data['bank_name'] ?? null),
            'number' => $this->nullableString($data['number'] ?? null),
            'opening_balance' => (int) ($data['opening_balance'] ?? 0),
            'include_in_net_worth' => (bool) ($data['include_in_net_worth'] ?? true),
        ]);

        return $account->refresh();
    }

    public function archiveAccount(Account $account): void
    {
        $account->update(['archived' => true]);
    }

    // -----------------------------------------------------------------
    // Investments
    // -----------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $data
     */
    public function createAsset(array $data): Asset
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('نام دارایی را وارد کنید.');
        }
        $price = max(0, (int) ($data['current_price'] ?? 0));

        return Asset::query()->create([
            'symbol' => trim((string) ($data['symbol'] ?? 'ASSET')),
            'name' => $name,
            'class' => (string) ($data['class'] ?? 'manual'),
            'unit' => trim((string) ($data['unit'] ?? 'واحد')) ?: 'واحد',
            'current_price' => $price,
            'previous_close' => $price,
            'last_updated_jalali' => $this->ledger()->today()->toString(),
            'price_history' => [['date' => $this->ledger()->today()->toString(), 'price' => $price]],
            'source' => 'manual',
        ]);
    }

    public function updateAssetPrice(Asset $asset, int $price): Asset
    {
        if ($price <= 0) {
            throw new InvalidArgumentException('قیمت باید بیشتر از صفر باشد.');
        }
        $today = $this->ledger()->today()->toString();
        $history = $asset->price_history ?? [];
        $history = array_values(array_filter($history, fn (array $point): bool => ($point['date'] ?? '') !== $today));
        $history[] = ['date' => $today, 'price' => $price];

        $asset->update([
            'previous_close' => $asset->current_price,
            'current_price' => $price,
            'last_updated_jalali' => $today,
            'price_history' => $history,
        ]);

        return $asset->refresh();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function addLot(array $data): Lot
    {
        $asset = Asset::query()->find((int) ($data['asset_id'] ?? 0));
        if ($asset === null) {
            throw new InvalidArgumentException('دارایی را انتخاب کنید.');
        }
        $type = ($data['type'] ?? 'buy') === 'sell' ? 'sell' : 'buy';
        $quantity = (float) ($data['quantity'] ?? 0);
        $price = (int) ($data['price_per_unit'] ?? 0);
        if ($quantity <= 0 || $price <= 0) {
            throw new InvalidArgumentException('مقدار و قیمت معامله را وارد کنید.');
        }
        if ($type === 'sell') {
            $holding = Portfolio::holding($asset, $asset->lots()->get());
            if ($quantity > $holding['quantity'] + 1e-9) {
                throw new InvalidArgumentException('مقدار فروش از موجودی این دارایی بیشتر است.');
            }
        }

        $account = ! empty($data['account_id']) ? Account::query()->find((int) $data['account_id']) : null;
        $date = JalaliDate::fromString((string) ($data['date_jalali'] ?? '')) ?? $this->ledger()->today();

        return DB::transaction(function () use ($asset, $type, $quantity, $price, $account, $date, $data): Lot {
            $fee = max(0, (int) ($data['fee'] ?? 0));
            $lot = Lot::query()->create([
                'asset_id' => $asset->id,
                'type' => $type,
                'date_jalali' => $date->toString(),
                'quantity' => $quantity,
                'price_per_unit' => $price,
                'fee' => $fee,
                'account_id' => $account?->id,
                'note' => $this->nullableString($data['note'] ?? null),
            ]);

            $transaction = null;
            if ($account !== null) {
                $transaction = Transaction::query()->create([
                    'kind' => 'investment',
                    'account_id' => $account->id,
                    'amount' => (int) round($quantity * $price),
                    'fee' => $fee,
                    'date_jalali' => $date->toString(),
                    'note' => ($type === 'buy' ? 'خرید ' : 'فروش ').$asset->name,
                    'tags' => ['سرمایه‌گذاری'],
                    'cash_direction' => $type === 'buy' ? 'out' : 'in',
                    'ref_kind' => 'investment_lot',
                    'ref_id' => (string) $lot->id,
                    'lot_id' => $lot->id,
                ]);
                $lot->update(['txn_id' => $transaction->id]);
            }

            return $lot;
        });
    }

    public function deleteLot(Lot $lot): void
    {
        if ($lot->txn_id !== null) {
            Transaction::query()->whereKey($lot->txn_id)->delete();
        }
        $lot->delete();
    }

    public function createGoal(array $data): Goal
    {
        $name = trim((string) ($data['name'] ?? ''));
        $target = (int) ($data['target'] ?? 0);
        $targetDate = JalaliDate::fromString((string) ($data['target_jalali'] ?? ''));
        if ($name === '' || $target <= 0 || $targetDate === null) {
            throw new InvalidArgumentException('نام، مبلغ هدف و تاریخ هدف را کامل کنید.');
        }

        return Goal::query()->create([
            'name' => $name,
            'target' => $target,
            'saved' => max(0, (int) ($data['saved'] ?? 0)),
            'target_jalali' => $targetDate->toString(),
            'icon' => (string) ($data['icon'] ?? 'flag'),
            'color' => (string) ($data['color'] ?? '#0F766E'),
        ]);
    }

    public function updateGoalSaved(Goal $goal, int $saved): void
    {
        $goal->update(['saved' => max(0, $saved)]);
    }

    public function deleteGoal(Goal $goal): void
    {
        $goal->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createCategory(array $data): Category
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('نام دسته‌بندی را وارد کنید.');
        }
        $kind = ($data['kind'] ?? 'expense') === 'income' ? 'income' : 'expense';
        $parentId = null;
        if (! empty($data['parent_id'])) {
            $parent = Category::query()->find((int) $data['parent_id']);
            if ($parent !== null && $parent->kind === $kind) {
                $parentId = $parent->id;
            }
        }

        return Category::query()->create([
            'slug' => 'cat_'.Str::lower(Str::random(8)),
            'parent_id' => $parentId,
            'name' => $name,
            'kind' => $kind,
            'icon' => (string) ($data['icon'] ?? 'category'),
            'color' => (string) ($data['color'] ?? '#64748B'),
        ]);
    }

    public function setBudget(Category $category, int $amount): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('مبلغ بودجه باید بیشتر از صفر باشد.');
        }
        Budget::query()->updateOrCreate(
            ['category_id' => $category->id],
            ['amount' => $amount, 'rollover' => false]
        );
    }

    public function deleteBudget(Budget $budget): void
    {
        $budget->delete();
    }

    // -----------------------------------------------------------------
    // Settings & onboarding
    // -----------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateSettings(array $data): Setting
    {
        $settings = Setting::current();
        $settings->update($data);

        return $settings->refresh();
    }

    public function startEmpty(string $accountName = 'کیف پول'): void
    {
        DB::transaction(function () use ($accountName): void {
            Setting::current()->update(['onboarding_done' => true]);
            if (Account::query()->count() === 0) {
                Account::query()->create([
                    'name' => $accountName !== '' ? $accountName : 'کیف پول',
                    'type' => 'cash',
                    'opening_balance' => 0,
                    'color' => '#0F766E',
                    'icon' => 'wallet',
                    'include_in_net_worth' => true,
                ]);
            }
        });
    }

    public function loadDemo(): void
    {
        (new DemoDataSeeder)->run();
    }

    public function clearAllAndRestart(): void
    {
        DB::transaction(function (): void {
            Transaction::query()->delete();
            Installment::query()->delete();
            Loan::query()->delete();
            Lot::query()->delete();
            Asset::query()->delete();
            Debt::query()->delete();
            Cheque::query()->delete();
            Goal::query()->delete();
            Budget::query()->delete();
            Scenario::query()->delete();
            Person::query()->delete();
            Account::query()->delete();
            Setting::current()->update(['onboarding_done' => false]);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function tags(mixed $tags): array
    {
        if (is_string($tags)) {
            $tags = explode(',', $tags);
        }
        if (! is_array($tags)) {
            return [];
        }

        $clean = [];
        foreach ($tags as $tag) {
            if (! is_string($tag)) {
                continue;
            }
            $tag = trim(str_replace('#', '', $tag));
            if ($tag !== '') {
                $clean[$tag] = true;
            }
        }

        return array_keys($clean);
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
