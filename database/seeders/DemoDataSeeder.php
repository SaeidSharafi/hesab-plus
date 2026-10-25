<?php

namespace Database\Seeders;

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
use App\Models\Scenario;
use App\Models\Setting;
use App\Models\Transaction;
use App\Services\Amortization;
use App\Services\Ledger;
use App\Support\JalaliDate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        (new DefaultDataSeeder)->run();

        DB::transaction(function (): void {
            $this->clear();

            $today = JalaliDate::today();
            $monthStart = $today->startOfMonth();
            $accounts = $this->accounts();
            $people = $this->people();

            $this->recurringActivity($today, $monthStart, $accounts);

            $this->createLoan(
                lender: 'قرض‌الحسنه رسالت',
                principal: 2_000_000_000,
                model: 'qard_hasan',
                rate: 0,
                count: 24,
                firstDue: $this->dayInMonth($monthStart, -4, 15),
                paidCount: 4,
                accountId: $accounts['saman']->id,
                fee: 80_000_000,
                note: 'وام قرض‌الحسنه با کارمزد اولیه',
            );
            $this->createLoan(
                lender: 'بانک ملی (مسکن)',
                principal: 3_000_000_000,
                model: 'reducing_balance',
                rate: 23,
                count: 36,
                firstDue: $this->dayInMonth($monthStart, -8, 10),
                paidCount: 7,
                accountId: $accounts['saman']->id,
                fee: 50_000_000,
                note: 'تسهیلات مسکن با اقساط مساوی',
            );

            $this->assets($today, $accounts);
            $this->cheques($today, $accounts);
            $this->debts($today, $accounts, $people);
            $this->goals($today);
            $this->budgets();
            $this->scenarios();

            $this->solveOpeningBalances($accounts, [
                'saman' => 625_000_000,
                'blue' => 84_000_000,
                'melli' => 1_200_000_000,
                'cash' => 12_500_000,
                'broker' => 120_000_000,
            ]);

            Setting::current()->update(['onboarding_done' => true]);
        });
    }

    private function clear(): void
    {
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
    }

    /**
     * @return array<string, Account>
     */
    private function accounts(): array
    {
        return [
            'saman' => Account::query()->create([
                'slug' => 'demo-saman',
                'name' => 'بانک سامان',
                'type' => 'bank',
                'bank_name' => 'بانک سامان',
                'number' => '829-10-4458921-1',
                'opening_balance' => 0,
                'color' => '#0F766E',
                'icon' => 'account_balance',
            ]),
            'blue' => Account::query()->create([
                'slug' => 'demo-blue',
                'name' => 'بلوبانک',
                'type' => 'card',
                'bank_name' => 'بلوبانک',
                'number' => '6219-8619-7788-1244',
                'opening_balance' => 0,
                'color' => '#2563EB',
                'icon' => 'credit_card',
            ]),
            'melli' => Account::query()->create([
                'slug' => 'demo-melli',
                'name' => 'سپرده بانک ملی',
                'type' => 'savings',
                'bank_name' => 'بانک ملی ایران',
                'number' => '0204992817004',
                'opening_balance' => 0,
                'color' => '#B45309',
                'icon' => 'savings',
            ]),
            'cash' => Account::query()->create([
                'slug' => 'demo-cash',
                'name' => 'کیف پول نقدی',
                'type' => 'cash',
                'opening_balance' => 0,
                'color' => '#16A34A',
                'icon' => 'wallet',
            ]),
            'broker' => Account::query()->create([
                'slug' => 'demo-broker',
                'name' => 'کارگزاری مفید',
                'type' => 'investment',
                'bank_name' => 'کارگزاری مفید',
                'opening_balance' => 0,
                'color' => '#7C3AED',
                'icon' => 'trending_up',
            ]),
        ];
    }

    /**
     * @return array<string, Person>
     */
    private function people(): array
    {
        return [
            'ali' => Person::query()->create(['name' => 'علی رضایی', 'phone' => '09121112233', 'note' => 'همکار قدیمی', 'avatar_color' => '#0F766E']),
            'sara' => Person::query()->create(['name' => 'سارا احمدی', 'phone' => '09351239874', 'note' => 'دوست دانشگاه', 'avatar_color' => '#BE185D']),
            'mohammad' => Person::query()->create(['name' => 'محمد (برادر)', 'phone' => '09124445566', 'note' => 'خانواده', 'avatar_color' => '#1D4ED8']),
            'reza' => Person::query()->create(['name' => 'رضا کمالی', 'phone' => '09197778899', 'note' => 'صاحب دفتر', 'avatar_color' => '#B45309']),
            'maryam' => Person::query()->create(['name' => 'مریم صادقی', 'phone' => '09123334455', 'note' => 'دوست مشترک', 'avatar_color' => '#7C3AED']),
        ];
    }

    private function recurringActivity(JalaliDate $today, JalaliDate $monthStart, array $accounts): void
    {
        $template = [
            [2, 'groceries', 6_850_000, 'blue', 'خرید هفتگی سوپرمارکت'],
            [4, 'fruit', 1_850_000, 'blue', 'میوه و سبزیجات'],
            [6, 'fuel', 1_200_000, 'blue', 'بنزین'],
            [8, 'restaurant', 2_450_000, 'saman', 'شام بیرون'],
            [10, 'bills', 2_600_000, 'saman', 'قبض آب و برق و گاز'],
            [13, 'taxi', 1_350_000, 'blue', 'سفرهای اسنپ'],
            [15, 'pharmacy', 780_000, 'saman', 'داروخانه'],
            [17, 'clothing', 2_900_000, 'blue', 'خرید لباس'],
            [19, 'entertainment', 1_750_000, 'saman', 'سینما و تفریح'],
            [21, 'internet', 890_000, 'saman', 'اینترنت خانه'],
            [23, 'household', 1_450_000, 'blue', 'شوینده و لوازم خانه'],
            [25, 'restaurant', 950_000, 'blue', 'کافه'],
            [27, 'groceries', 3_200_000, 'blue', 'خرید میان‌ماه'],
        ];

        $categoryIds = Category::query()->pluck('id', 'slug');

        for ($offset = -6; $offset <= 0; $offset++) {
            foreach ($template as [$day, $slug, $toman, $account, $note]) {
                $date = $this->dayInMonth($monthStart, $offset, $day);
                if ($date->isAfter($today)) {
                    continue;
                }
                $variation = 1 + (($offset + 6) % 3) * 0.03;
                Transaction::query()->create([
                    'kind' => 'expense',
                    'account_id' => $accounts[$account]->id,
                    'amount' => (int) round($toman * 10 * $variation),
                    'fee' => 0,
                    'date_jalali' => $date->toString(),
                    'category_id' => $categoryIds[$slug],
                    'note' => $note,
                    'tags' => ['نمونه'],
                ]);
            }

            if ($offset <= -1) {
                $salaryDate = $this->dayInMonth($monthStart, $offset, 29);
                Transaction::query()->create([
                    'kind' => 'income',
                    'account_id' => $accounts['saman']->id,
                    'amount' => 420_000_000,
                    'fee' => 0,
                    'date_jalali' => $salaryDate->toString(),
                    'category_id' => $categoryIds['income_salary'],
                    'note' => 'واریز حقوق ماهانه',
                    'tags' => ['حقوق'],
                ]);
            }
        }

        $extras = [
            [-5, 12, 'insurance', 12_000_000, 'بیمه شخص ثالث'],
            [-3, 20, 'travel', 28_000_000, 'سفر شمال'],
            [-2, 14, 'family_gift', 6_000_000, 'هدیه تولد خواهر'],
            [-1, 8, 'car_service', 8_500_000, 'سرویس دوره‌ای خودرو'],
        ];
        foreach ($extras as [$offset, $day, $slug, $toman, $note]) {
            $date = $this->dayInMonth($monthStart, $offset, $day);
            if ($date->isAfter($today)) {
                continue;
            }
            Transaction::query()->create([
                'kind' => 'expense',
                'account_id' => $accounts['saman']->id,
                'amount' => $toman * 10,
                'fee' => 0,
                'date_jalali' => $date->toString(),
                'category_id' => $categoryIds[$slug],
                'note' => $note,
                'tags' => ['نمونه'],
            ]);
        }

        $transferDate = $this->dayInMonth($monthStart, -4, 5);
        Transaction::query()->create([
            'kind' => 'transfer',
            'account_id' => $accounts['saman']->id,
            'to_account_id' => $accounts['blue']->id,
            'amount' => 100_000_000,
            'fee' => 7_200,
            'date_jalali' => $transferDate->toString(),
            'note' => 'شارژ کارت برای خریدهای روزمره',
            'tags' => ['انتقال'],
        ]);
    }

    private function createLoan(
        string $lender,
        int $principal,
        string $model,
        float $rate,
        int $count,
        JalaliDate $firstDue,
        int $paidCount,
        int $accountId,
        int $fee,
        string $note,
    ): void {
        $schedule = Amortization::schedule($principal, $rate, $count, 1, $firstDue->toString(), $model);
        $disbursement = $firstDue->addMonths(-1)->toString();
        $loan = Loan::query()->create([
            'lender' => $lender,
            'principal' => $principal,
            'interest_model' => $model,
            'annual_rate' => $rate,
            'total_fee' => $fee,
            'installment_count' => $count,
            'frequency_months' => 1,
            'disbursement_jalali' => $disbursement,
            'first_due_jalali' => $firstDue->toString(),
            'account_id' => $accountId,
            'penalty_annual_percent' => 6,
            'status' => 'active',
            'note' => $note,
        ]);

        $loanInterestCategory = Category::query()->where('slug', 'loan_interest')->value('id');

        foreach ($schedule['rows'] as $index => $row) {
            $installment = Installment::query()->create([
                'loan_id' => $loan->id,
                'number' => $row['number'],
                'due_jalali' => $row['due'],
                'amount' => $row['amount'],
                'principal' => $row['principal'],
                'interest' => $row['interest'],
                'penalty' => 0,
            ]);

            if ($index >= $paidCount) {
                continue;
            }

            $payment = Transaction::query()->create([
                'kind' => 'loan',
                'account_id' => $accountId,
                'amount' => $row['amount'],
                'fee' => 0,
                'date_jalali' => $row['due'],
                'category_id' => $row['interest'] > 0 ? $loanInterestCategory : null,
                'note' => "پرداخت قسط {$row['number']} {$lender}",
                'tags' => ['قسط_وام'],
                'cash_direction' => 'out',
                'loan_interest' => $row['interest'],
                'ref_kind' => 'loan_installment',
                'ref_id' => (string) $loan->id,
                'installment_id' => $installment->id,
            ]);

            $installment->update([
                'paid_at_jalali' => $row['due'],
                'paid_txn_id' => $payment->id,
            ]);
        }
    }

    private function assets(JalaliDate $today, array $accounts): void
    {
        $definitions = [
            ['gold', 'GOLD18', 'طلای ۱۸ عیار', 'gold', 'گرم', 44_500_000, 43_900_000],
            ['coin', 'COIN', 'سکه تمام بهار', 'coin', 'عدد', 512_000_000, 508_000_000],
            ['fund', 'AYAR', 'صندوق طلای عیار', 'gold_fund', 'واحد', 125_400, 124_100],
            ['usdt', 'USDT', 'تتر', 'crypto', 'USDT', 688_000, 682_000],
        ];

        $assets = [];
        foreach ($definitions as [$key, $symbol, $name, $class, $unit, $price, $previous]) {
            $history = [];
            foreach ([[365, 0.62], [270, 0.68], [180, 0.76], [90, 0.86], [30, 0.94], [0, 1]] as [$daysAgo, $factor]) {
                $history[] = [
                    'date' => $today->addDays(-$daysAgo)->toString(),
                    'price' => (int) round($price * $factor),
                ];
            }
            $assets[$key] = Asset::query()->create([
                'symbol' => $symbol,
                'name' => $name,
                'class' => $class,
                'unit' => $unit,
                'current_price' => $price,
                'previous_close' => $previous,
                'last_updated_jalali' => $today->toString(),
                'price_history' => $history,
                'source' => 'manual',
            ]);
        }

        $this->lot($assets['gold'], 'buy', $today->addDays(-210), 40, 37_500_000, 12_000_000, $accounts['saman']);
        $this->lot($assets['gold'], 'sell', $today->addDays(-45), 5, 42_000_000, 2_000_000, $accounts['saman']);
        $this->lot($assets['coin'], 'buy', $today->addDays(-240), 3, 410_000_000, 5_000_000, $accounts['saman']);
        $this->lot($assets['fund'], 'buy', $today->addDays(-150), 2500, 104_000, 150_000, $accounts['broker']);
        $this->lot($assets['usdt'], 'buy', $today->addDays(-90), 850, 595_000, 200_000, $accounts['saman']);
    }

    private function lot(Asset $asset, string $type, JalaliDate $date, float $quantity, int $price, int $fee, Account $account): void
    {
        $lot = Lot::query()->create([
            'asset_id' => $asset->id,
            'type' => $type,
            'date_jalali' => $date->toString(),
            'quantity' => $quantity,
            'price_per_unit' => $price,
            'fee' => $fee,
            'account_id' => $account->id,
            'note' => $asset->name,
        ]);

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

    private function cheques(JalaliDate $today, array $accounts): void
    {
        Cheque::query()->create([
            'direction' => 'issued',
            'number' => '۷۴۸۲۹۱۰۳۸۴۷۲۹۱۰۴',
            'bank' => 'بانک سامان',
            'amount' => 400_000_000,
            'issue_jalali' => $today->addDays(-20)->toString(),
            'due_jalali' => $today->addDays(5)->toString(),
            'counterparty' => 'حاج احمد فلاح',
            'status' => 'pending',
            'note' => 'اجاره دفتر کار',
            'account_id' => $accounts['saman']->id,
        ]);

        Cheque::query()->create([
            'direction' => 'received',
            'number' => '۹۹۲۸۱۷۴۶۲۰۱۸۳۷۴۹',
            'bank' => 'بانک پاسارگاد',
            'amount' => 250_000_000,
            'issue_jalali' => $today->addDays(-10)->toString(),
            'due_jalali' => $today->addDays(12)->toString(),
            'counterparty' => 'شرکت فناوران عصر نوین',
            'status' => 'pending',
            'note' => 'قسط دوم قرارداد توسعه وب‌سایت',
            'account_id' => $accounts['blue']->id,
        ]);
    }

    private function debts(JalaliDate $today, array $accounts, array $people): void
    {
        Debt::query()->create([
            'person_id' => $people['ali']->id,
            'direction' => 'lent',
            'amount' => 120_000_000,
            'original_unit' => 'toman',
            'quantity' => 12_000_000,
            'unit_rate' => 10,
            'date_jalali' => $today->addDays(-25)->toString(),
            'due_jalali' => $today->addDays(12)->toString(),
            'affects_account' => false,
            'note' => 'دنگ ویلا و شام سفر',
            'status' => 'active',
            'settlements' => [[
                'id' => 'demo-settle-ali',
                'date' => $today->addDays(-5)->toString(),
                'amount' => 30_000_000,
            ]],
        ]);

        Debt::query()->create([
            'person_id' => $people['sara']->id,
            'direction' => 'lent',
            'amount' => 512_000_000,
            'original_unit' => 'gold_coin',
            'quantity' => 1,
            'unit_rate' => 512_000_000,
            'date_jalali' => $today->addDays(-60)->toString(),
            'due_jalali' => $today->addDays(30)->toString(),
            'affects_account' => false,
            'note' => 'یک سکه برای پیش‌پرداخت خرید خانه',
            'status' => 'active',
            'settlements' => [],
        ]);

        Debt::query()->create([
            'person_id' => $people['mohammad']->id,
            'direction' => 'borrowed',
            'amount' => 500_000_000,
            'original_unit' => 'toman',
            'quantity' => 50_000_000,
            'unit_rate' => 10,
            'date_jalali' => $today->addDays(-40)->toString(),
            'due_jalali' => $today->addDays(45)->toString(),
            'affects_account' => false,
            'note' => 'قرض بابت تعمیر موتور ماشین',
            'status' => 'active',
            'settlements' => [],
        ]);

        Debt::query()->create([
            'person_id' => $people['reza']->id,
            'direction' => 'borrowed',
            'amount' => 40_000_000,
            'original_unit' => 'toman',
            'quantity' => 4_000_000,
            'unit_rate' => 10,
            'date_jalali' => $today->addDays(-15)->toString(),
            'due_jalali' => $today->addDays(18)->toString(),
            'affects_account' => false,
            'note' => 'شارژ ساختمان دفتر',
            'status' => 'active',
            'settlements' => [],
        ]);

        Debt::query()->create([
            'person_id' => $people['maryam']->id,
            'direction' => 'lent',
            'amount' => 200_000_000,
            'original_unit' => 'toman',
            'quantity' => 20_000_000,
            'unit_rate' => 10,
            'date_jalali' => $today->addDays(-70)->toString(),
            'affects_account' => false,
            'note' => 'وام کوتاه‌مدت',
            'status' => 'settled',
            'settlements' => [[
                'id' => 'demo-settle-maryam',
                'date' => $today->addDays(-35)->toString(),
                'amount' => 200_000_000,
            ]],
        ]);
    }

    private function goals(JalaliDate $today): void
    {
        Goal::query()->create([
            'name' => 'صندوق اضطراری',
            'target' => 4_000_000_000,
            'saved' => 1_200_000_000,
            'target_jalali' => $today->addMonths(12)->toString(),
            'icon' => 'shield',
            'color' => '#0F766E',
        ]);
        Goal::query()->create([
            'name' => 'خرید ۵ سکه',
            'target' => 2_560_000_000,
            'saved' => 1_536_000_000,
            'target_jalali' => $today->addMonths(8)->toString(),
            'icon' => 'savings',
            'color' => '#B45309',
        ]);
        Goal::query()->create([
            'name' => 'سفر تابستان',
            'target' => 800_000_000,
            'saved' => 200_000_000,
            'target_jalali' => $today->addMonths(6)->toString(),
            'icon' => 'flight',
            'color' => '#0D9488',
        ]);
    }

    private function budgets(): void
    {
        $ids = Category::query()->pluck('id', 'slug');
        foreach ([
            'groceries' => 80_000_000,
            'restaurant' => 35_000_000,
            'fuel' => 15_000_000,
            'bills' => 30_000_000,
            'entertainment' => 20_000_000,
            'clothing' => 40_000_000,
        ] as $slug => $amount) {
            Budget::query()->create([
                'category_id' => $ids[$slug],
                'amount' => $amount,
                'rollover' => false,
            ]);
        }
    }

    private function scenarios(): void
    {
        Scenario::query()->create([
            'name' => 'وام ۱۰۰ میلیون تومانی جدید',
            'description' => 'دریافت ۱۰۰ میلیون تومان و بازپرداخت ۲۴ ماهه',
            'type' => 'loan',
            'active' => false,
            'monthly_delta' => -45_000_000,
            'one_time_delta' => 1_000_000_000,
            'start_month_offset' => 1,
            'duration_months' => 24,
        ]);
        Scenario::query()->create([
            'name' => 'پس‌انداز ماهانه طلا',
            'description' => 'خرید ماهانه ۵ میلیون تومان طلا',
            'type' => 'gold_dca',
            'active' => false,
            'monthly_delta' => -50_000_000,
            'one_time_delta' => 0,
            'start_month_offset' => 0,
            'duration_months' => 12,
        ]);
        Scenario::query()->create([
            'name' => 'حذف سفر نوروز',
            'description' => 'صرفه‌جویی ۱۵ میلیون تومانی یک‌باره',
            'type' => 'skip_expense',
            'active' => false,
            'monthly_delta' => 0,
            'one_time_delta' => 150_000_000,
            'start_month_offset' => 2,
            'duration_months' => 1,
        ]);
        Scenario::query()->create([
            'name' => 'افزایش ۲۰٪ حقوق',
            'description' => 'سناریوی خوش‌بینانه افزایش حقوق',
            'type' => 'income_boost',
            'active' => false,
            'monthly_delta' => 84_000_000,
            'one_time_delta' => 0,
            'start_month_offset' => 1,
            'duration_months' => 12,
        ]);
    }

    /**
     * @param  array<string, Account>  $accounts
     * @param  array<string, int>  $desired
     */
    private function solveOpeningBalances(array $accounts, array $desired): void
    {
        $ledger = new Ledger;
        $derived = $ledger->balances();

        foreach ($accounts as $key => $account) {
            $account->update([
                'opening_balance' => ($desired[$key] ?? 0) - ($derived[$account->id] ?? 0),
            ]);
        }
    }

    private function dayInMonth(JalaliDate $base, int $offset, int $day): JalaliDate
    {
        $month = $base->addMonths($offset);

        return new JalaliDate($month->year, $month->month, min($day, $month->monthDays()));
    }
}
