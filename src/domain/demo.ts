import { buildSchedule } from './amortization';
import { deriveBalances } from './analytics';
import { createBaseData } from './defaults';
import {
  addJalaliDays,
  addJalaliMonths,
  diffJalaliDays,
  formatJalali,
  jalaliMonthDays,
  jalaliToIso,
  startOfJalaliMonth,
  todayJalali,
  type JalaliDate
} from './jalali';
import { createId } from './defaults';
import type {
  Account,
  AppData,
  Asset,
  Budget,
  Cheque,
  DebtEntry,
  Goal,
  InvestmentLot,
  Loan,
  LoanInstallment,
  Person,
  Scenario,
  Transaction
} from './types';

const T = 10; // Rial per Toman, for readable demo numbers

function dateKey(date: JalaliDate): string {
  return `${date.jy}/${String(date.jm).padStart(2, '0')}/${String(date.jd).padStart(2, '0')}`;
}

function isoFor(date: JalaliDate, salt = 0): string {
  return new Date(Date.parse(`${jalaliToIso(date)}T09:00:00Z`) + salt * 1000).toISOString();
}

function dayInMonth(base: JalaliDate, monthOffset: number, day: number): JalaliDate {
  const month = addJalaliMonths(base, monthOffset);
  return { jy: month.jy, jm: month.jm, jd: Math.min(day, jalaliMonthDays(month.jy, month.jm)) };
}

function priceHistory(today: JalaliDate, currentRial: number): Asset['priceHistory'] {
  const factors: Array<[number, number]> = [
    [365, 0.62],
    [270, 0.68],
    [180, 0.76],
    [90, 0.86],
    [30, 0.94],
    [0, 1]
  ];
  return factors.map(([daysAgo, factor]) => ({
    dateJalali: dateKey(addJalaliDays(today, -daysAgo)),
    priceRial: Math.round(currentRial * factor)
  }));
}

/**
 * A coherent, today-relative demo ledger. Every balance is derived from the
 * transactions; opening balances are solved so the current balances look sane.
 */
export function createDemoData(now = new Date()): AppData {
  const today = todayJalali(now);
  const base = createBaseData(now);
  const monthStart = startOfJalaliMonth(today);
  const accounts: Account[] = [
    {
      id: 'acc-saman',
      name: 'بانک سامان',
      type: 'bank',
      bankName: 'بانک سامان',
      number: '829-10-4458921-1',
      openingBalanceRial: 0,
      color: '#0f766e',
      icon: 'Landmark',
      includeInNetWorth: true,
      archived: false,
      createdAt: isoFor(today, 1)
    },
    {
      id: 'acc-blue',
      name: 'بلوبانک',
      type: 'card',
      bankName: 'بلوبانک',
      number: '6219-8619-7788-1244',
      openingBalanceRial: 0,
      color: '#2563eb',
      icon: 'CreditCard',
      includeInNetWorth: true,
      archived: false,
      createdAt: isoFor(today, 2)
    },
    {
      id: 'acc-melli',
      name: 'سپرده بانک ملی',
      type: 'savings',
      bankName: 'بانک ملی ایران',
      number: '0204992817004',
      openingBalanceRial: 0,
      color: '#b45309',
      icon: 'PiggyBank',
      includeInNetWorth: true,
      archived: false,
      createdAt: isoFor(today, 3)
    },
    {
      id: 'acc-cash',
      name: 'کیف پول نقدی',
      type: 'cash',
      openingBalanceRial: 0,
      color: '#16a34a',
      icon: 'Wallet',
      includeInNetWorth: true,
      archived: false,
      createdAt: isoFor(today, 4)
    },
    {
      id: 'acc-broker',
      name: 'کارگزاری مفید',
      type: 'investment',
      bankName: 'کارگزاری مفید',
      openingBalanceRial: 0,
      color: '#7c3aed',
      icon: 'TrendingUp',
      includeInNetWorth: true,
      archived: false,
      createdAt: isoFor(today, 5)
    }
  ];

  const desiredBalancesRial: Record<string, number> = {
    'acc-saman': 625_000_000,
    'acc-blue': 84_000_000,
    'acc-melli': 1_200_000_000,
    'acc-cash': 12_500_000,
    'acc-broker': 120_000_000
  };

  const transactions: Transaction[] = [];
  let salt = 0;
  const pushTxn = (txn: Omit<Transaction, 'id' | 'feeRial' | 'tags' | 'createdAt'> & {
    feeRial?: number;
    tags?: string[];
    createdAt?: string;
  }): Transaction => {
    salt += 1;
    const complete: Transaction = {
      id: `demo-txn-${transactions.length + 1}`,
      feeRial: txn.feeRial ?? 0,
      tags: txn.tags ?? [],
      createdAt: txn.createdAt ?? isoFor(today, salt),
      ...txn
    } as Transaction;
    transactions.push(complete);
    return complete;
  };

  const inPast = (date: JalaliDate) => diffJalaliDays(today, date) <= 0;

  // Recurring day-to-day spending, last 9 months (current month only up to today).
  const expenseTemplate: Array<{
    day: number;
    categoryId: string;
    toman: number;
    accountId: string;
    note: string;
    tags: string[];
  }> = [
    { day: 2, categoryId: 'cat-groceries', toman: 6_850_000, accountId: 'acc-blue', note: 'خرید هفتگی سوپرمارکت', tags: ['خرید_خانه'] },
    { day: 4, categoryId: 'cat-fruit', toman: 1_850_000, accountId: 'acc-blue', note: 'میوه و سبزیجات', tags: ['خرید_خانه'] },
    { day: 6, categoryId: 'cat-fuel', toman: 1_200_000, accountId: 'acc-blue', note: 'بنزین', tags: ['خودرو'] },
    { day: 8, categoryId: 'cat-restaurant', toman: 2_450_000, accountId: 'acc-saman', note: 'شام بیرون', tags: ['تفریح'] },
    { day: 10, categoryId: 'cat-bills', toman: 2_600_000, accountId: 'acc-saman', note: 'قبض آب و برق و گاز', tags: ['قبوض'] },
    { day: 13, categoryId: 'cat-taxi', toman: 1_350_000, accountId: 'acc-blue', note: 'سفرهای اسنپ', tags: ['رفت_و_آمد'] },
    { day: 15, categoryId: 'cat-pharmacy', toman: 780_000, accountId: 'acc-saman', note: 'داروخانه', tags: ['سلامت'] },
    { day: 17, categoryId: 'cat-clothing', toman: 2_900_000, accountId: 'acc-blue', note: 'خرید لباس', tags: ['شخصی'] },
    { day: 19, categoryId: 'cat-entertainment', toman: 1_750_000, accountId: 'acc-saman', note: 'سینما و تفریح', tags: ['تفریح'] },
    { day: 21, categoryId: 'cat-internet', toman: 890_000, accountId: 'acc-saman', note: 'اینترنت خانه', tags: ['قبوض'] },
    { day: 23, categoryId: 'cat-household', toman: 1_450_000, accountId: 'acc-blue', note: 'شوینده و لوازم خانه', tags: ['خرید_خانه'] },
    { day: 25, categoryId: 'cat-restaurant', toman: 950_000, accountId: 'acc-blue', note: 'کافه', tags: ['تفریح'] },
    { day: 27, categoryId: 'cat-groceries', toman: 3_200_000, accountId: 'acc-blue', note: 'خرید میان‌ماه', tags: ['خرید_خانه'] }
  ];

  for (let offset = -8; offset <= 0; offset += 1) {
    for (const [index, item] of expenseTemplate.entries()) {
      const date = dayInMonth(monthStart, offset, item.day);
      if (!inPast(date)) continue;
      const variation = 1 + ((offset + 8) % 3) * 0.03 + (index % 2) * 0.015;
      pushTxn({
        kind: 'expense',
        accountId: item.accountId,
        amountRial: Math.round(item.toman * T * variation),
        dateJalali: dateKey(date),
        categoryId: item.categoryId,
        note: item.note,
        tags: item.tags,
        createdAt: isoFor(date, index)
      });
    }
  }

  // Salary (last 8 months, not the current month yet).
  for (let offset = -8; offset <= -1; offset += 1) {
    const date = dayInMonth(monthStart, offset, 29);
    if (!inPast(date)) continue;
    pushTxn({
      kind: 'income',
      accountId: 'acc-saman',
      amountRial: 420_000_000,
      dateJalali: dateKey(date),
      categoryId: 'cat-income-salary',
      note: 'واریز حقوق ماهانه',
      tags: ['حقوق'],
      createdAt: isoFor(date, 20)
    });
  }

  // A freelance project and a few irregular expenses for realistic variation.
  const irregular: Array<{
    offset: number;
    day: number;
    kind: 'expense' | 'income';
    categoryId: string;
    toman: number;
    accountId: string;
    note: string;
    tags: string[];
  }> = [
    { offset: -7, day: 12, kind: 'expense', categoryId: 'cat-insurance', toman: 12_000_000, accountId: 'acc-saman', note: 'بیمه شخص ثالث', tags: ['بیمه', 'سالانه'] },
    { offset: -5, day: 18, kind: 'expense', categoryId: 'cat-digital', toman: 35_000_000, accountId: 'acc-saman', note: 'خرید لپ‌تاپ', tags: ['دیجیتال'] },
    { offset: -3, day: 20, kind: 'expense', categoryId: 'cat-travel', toman: 28_000_000, accountId: 'acc-saman', note: 'سفر شمال', tags: ['سفر'] },
    { offset: -2, day: 14, kind: 'expense', categoryId: 'cat-family', toman: 6_000_000, accountId: 'acc-saman', note: 'هدیه تولد خواهر', tags: ['هدیه'] },
    { offset: -1, day: 8, kind: 'expense', categoryId: 'cat-car-service', toman: 8_500_000, accountId: 'acc-saman', note: 'سرویس دوره‌ای خودرو', tags: ['خودرو'] },
    { offset: -2, day: 18, kind: 'income', categoryId: 'cat-income-freelance', toman: 12_000_000, accountId: 'acc-saman', note: 'پروژه طراحی وب', tags: ['فریلنس'] }
  ];

  for (const item of irregular) {
    const date = dayInMonth(monthStart, item.offset, item.day);
    if (!inPast(date)) continue;
    pushTxn({
      kind: item.kind,
      accountId: item.accountId,
      amountRial: item.toman * T,
      dateJalali: dateKey(date),
      categoryId: item.categoryId,
      note: item.note,
      tags: item.tags,
      createdAt: isoFor(date, item.day)
    });
  }

  // A transfer that keeps the spending card topped up.
  {
    const date = dayInMonth(monthStart, -4, 5);
    pushTxn({
      kind: 'transfer',
      accountId: 'acc-saman',
      toAccountId: 'acc-blue',
      amountRial: 100_000_000,
      feeRial: 7_200,
      dateJalali: dateKey(date),
      note: 'شارژ کارت برای خریدهای روزمره',
      tags: ['انتقال'],
      createdAt: isoFor(date, 30)
    });
  }

  // Assets & price history.
  const assets: Asset[] = [
    {
      id: 'asset-gold',
      symbol: 'GOLD18',
      name: 'طلای ۱۸ عیار',
      class: 'gold',
      unit: 'گرم',
      currentPriceRial: 44_500_000,
      previousClosePriceRial: 43_900_000,
      lastUpdatedJalali: formatJalali(today, 'long'),
      priceHistory: priceHistory(today, 44_500_000),
      source: 'manual'
    },
    {
      id: 'asset-coin',
      symbol: 'COIN',
      name: 'سکه تمام بهار',
      class: 'coin',
      unit: 'عدد',
      currentPriceRial: 512_000_000,
      previousClosePriceRial: 508_000_000,
      lastUpdatedJalali: formatJalali(today, 'long'),
      priceHistory: priceHistory(today, 512_000_000),
      source: 'manual'
    },
    {
      id: 'asset-ayar',
      symbol: 'AYAR',
      name: 'صندوق طلای عیار',
      class: 'gold_fund',
      unit: 'واحد',
      currentPriceRial: 125_400,
      previousClosePriceRial: 124_100,
      lastUpdatedJalali: formatJalali(today, 'long'),
      priceHistory: priceHistory(today, 125_400),
      source: 'manual'
    },
    {
      id: 'asset-foolad',
      symbol: 'فولاد',
      name: 'فولاد مبارکه',
      class: 'stock',
      unit: 'سهم',
      currentPriceRial: 4_620,
      previousClosePriceRial: 4_580,
      lastUpdatedJalali: formatJalali(today, 'long'),
      priceHistory: priceHistory(today, 4_620),
      source: 'manual'
    },
    {
      id: 'asset-usdt',
      symbol: 'USDT',
      name: 'تتر',
      class: 'crypto',
      unit: 'USDT',
      currentPriceRial: 688_000,
      previousClosePriceRial: 682_000,
      lastUpdatedJalali: formatJalali(today, 'long'),
      priceHistory: priceHistory(today, 688_000),
      source: 'manual'
    },
    {
      id: 'asset-usd',
      symbol: 'USD',
      name: 'دلار آمریکا',
      class: 'fx',
      unit: 'دلار',
      currentPriceRial: 685_000,
      previousClosePriceRial: 681_000,
      lastUpdatedJalali: formatJalali(today, 'long'),
      priceHistory: priceHistory(today, 685_000),
      source: 'manual'
    }
  ];

  const lots: InvestmentLot[] = [];
  const addLot = (input: {
    assetId: string;
    type: 'buy' | 'sell';
    daysAgo: number;
    quantity: number;
    pricePerUnitRial: number;
    feeRial: number;
    accountId: string;
    note: string;
  }) => {
    const date = addJalaliDays(today, -input.daysAgo);
    const id = createId('lot');
    const txn = pushTxn({
      kind: 'investment',
      accountId: input.accountId,
      amountRial: Math.round(input.quantity * input.pricePerUnitRial),
      feeRial: input.feeRial,
      cashDirection: input.type === 'buy' ? 'out' : 'in',
      dateJalali: dateKey(date),
      note: input.note,
      tags: ['سرمایه‌گذاری'],
      refKind: 'investment_lot',
      refId: id,
      lotId: id,
      createdAt: isoFor(date, 40)
    });
    lots.push({
      id,
      assetId: input.assetId,
      type: input.type,
      dateJalali: dateKey(date),
      quantity: input.quantity,
      pricePerUnitRial: input.pricePerUnitRial,
      feeRial: input.feeRial,
      accountId: input.accountId,
      txnId: txn.id,
      note: input.note,
      createdAt: txn.createdAt
    });
  };

  addLot({ assetId: 'asset-gold', type: 'buy', daysAgo: 210, quantity: 40, pricePerUnitRial: 37_500_000, feeRial: 12_000_000, accountId: 'acc-saman', note: 'خرید طلای آب‌شده' });
  addLot({ assetId: 'asset-gold', type: 'sell', daysAgo: 45, quantity: 5, pricePerUnitRial: 42_000_000, feeRial: 2_000_000, accountId: 'acc-saman', note: 'فروش بخشی از طلا' });
  addLot({ assetId: 'asset-coin', type: 'buy', daysAgo: 240, quantity: 3, pricePerUnitRial: 410_000_000, feeRial: 5_000_000, accountId: 'acc-saman', note: 'خرید سکه تمام' });
  addLot({ assetId: 'asset-ayar', type: 'buy', daysAgo: 150, quantity: 2500, pricePerUnitRial: 104_000, feeRial: 150_000, accountId: 'acc-broker', note: 'خرید صندوق طلا' });
  addLot({ assetId: 'asset-foolad', type: 'buy', daysAgo: 250, quantity: 12000, pricePerUnitRial: 4_100, feeRial: 600_000, accountId: 'acc-broker', note: 'خرید سهم فولاد' });
  addLot({ assetId: 'asset-foolad', type: 'sell', daysAgo: 30, quantity: 2000, pricePerUnitRial: 4_500, feeRial: 100_000, accountId: 'acc-broker', note: 'فروش بخشی از فولاد' });
  addLot({ assetId: 'asset-usdt', type: 'buy', daysAgo: 90, quantity: 850, pricePerUnitRial: 595_000, feeRial: 200_000, accountId: 'acc-saman', note: 'خرید تتر' });

  // People.
  const people: Person[] = [
    { id: 'person-ali', name: 'علی رضایی', phone: '09121112233', note: 'همکار قدیمی', avatarColor: '#0f766e' },
    { id: 'person-sara', name: 'سارا احمدی', phone: '09351239874', note: 'دوست دانشگاه', avatarColor: '#be185d' },
    { id: 'person-mohammad', name: 'محمد (برادر)', phone: '09124445566', note: 'خانواده', avatarColor: '#1d4ed8' },
    { id: 'person-reza', name: 'رضا کمالی', phone: '09197778899', note: 'صاحب دفتر', avatarColor: '#b45309' },
    { id: 'person-maryam', name: 'مریم صادقی', phone: '09123334455', note: 'دوست مشترک', avatarColor: '#7c3aed' }
  ];

  // Loans with real schedules; paid installments create ledger payments.
  const loans: Loan[] = [];
  const installments: LoanInstallment[] = [];

  const addLoan = (config: {
    id: string;
    lender: string;
    principalRial: number;
    model: Loan['interestModel'];
    rate: number;
    months: number;
    firstDue: JalaliDate;
    paidCount: number;
    accountId: string;
    feeRial: number;
    note: string;
    penaltyPercent?: number;
  }) => {
    const firstDue = dateKey(config.firstDue);
    const schedule = buildSchedule({
      principalRial: config.principalRial,
      annualRatePercent: config.rate,
      installmentCount: config.months,
      frequencyMonths: 1,
      firstDueJalali: firstDue,
      model: config.model
    });
    const loan: Loan = {
      id: config.id,
      lender: config.lender,
      principalRial: config.principalRial,
      interestModel: config.model,
      annualRatePercent: config.rate,
      totalFeeRial: config.feeRial,
      installmentCount: config.months,
      frequencyMonths: 1,
      disbursementJalali: dateKey(addJalaliMonths(startOfJalaliMonth(config.firstDue), -1)),
      firstDueJalali: firstDue,
      accountId: config.accountId,
      penaltyAnnualPercent: config.penaltyPercent ?? 6,
      status: 'active',
      note: config.note,
      createdAt: isoFor(config.firstDue, 50)
    };
    loans.push(loan);

    for (const [index, row] of schedule.rows.entries()) {
      const id = `${config.id}-inst-${row.number}`;
      const installment: LoanInstallment = {
        id,
        loanId: loan.id,
        number: row.number,
        dueJalali: row.dueJalali,
        amountRial: row.amountRial,
        principalRial: row.principalRial,
        interestRial: row.interestRial,
        penaltyRial: 0
      };
      if (index < config.paidCount) {
        const due = row.dueJalali;
        const txn = pushTxn({
          kind: 'loan',
          accountId: config.accountId,
          amountRial: row.amountRial,
          cashDirection: 'out',
          dateJalali: due,
          categoryId: row.interestRial > 0 ? 'cat-loan-interest' : undefined,
          loanInterestRial: row.interestRial,
          note: `پرداخت قسط ${row.number} ${config.lender}`,
          tags: ['قسط_وام'],
          refKind: 'loan_installment',
          refId: loan.id,
          installmentId: id,
          createdAt: isoFor(parseDue(due), 60)
        });
        installment.paidTxnId = txn.id;
        installment.paidAtJalali = due;
      }
      installments.push(installment);
    }
  };

  addLoan({
    id: 'loan-resalat',
    lender: 'قرض‌الحسنه رسالت',
    principalRial: 2_000_000_000,
    model: 'qard_hasan',
    rate: 0,
    months: 24,
    firstDue: dayInMonth(monthStart, -4, 15),
    paidCount: 4,
    accountId: 'acc-saman',
    feeRial: 80_000_000,
    note: 'وام قرض‌الحسنه با کارمزد اولیه'
  });

  addLoan({
    id: 'loan-melli',
    lender: 'بانک ملی (مسکن)',
    principalRial: 3_000_000_000,
    model: 'reducing_balance',
    rate: 23,
    months: 36,
    firstDue: dayInMonth(monthStart, -8, 10),
    paidCount: 7,
    accountId: 'acc-saman',
    feeRial: 50_000_000,
    note: 'تسهیلات مسکن با اقساط مساوی'
  });

  // Cheques.
  const cheques: Cheque[] = [
    {
      id: 'cheque-issued-1',
      direction: 'issued',
      number: '۷۴۸۲۹۱۰۳۸۴۷۲۹۱۰۴',
      bank: 'بانک سامان',
      amountRial: 400_000_000,
      issueJalali: dateKey(addJalaliDays(today, -20)),
      dueJalali: dateKey(addJalaliDays(today, 5)),
      counterparty: 'حاج احمد فلاح',
      status: 'pending',
      note: 'اجاره دفتر کار',
      accountId: 'acc-saman',
      createdAt: isoFor(today, 70)
    },
    {
      id: 'cheque-received-1',
      direction: 'received',
      number: '۹۹۲۸۱۷۴۶۲۰۱۸۳۷۴۹',
      bank: 'بانک پاسارگاد',
      amountRial: 250_000_000,
      issueJalali: dateKey(addJalaliDays(today, -10)),
      dueJalali: dateKey(addJalaliDays(today, 12)),
      counterparty: 'شرکت فناوران عصر نوین',
      status: 'pending',
      note: 'قسط دوم قرارداد توسعه وب‌سایت',
      accountId: 'acc-blue',
      createdAt: isoFor(today, 71)
    }
  ];

  // Personal debts, including a partial settlement and one settled history entry.
  const debts: DebtEntry[] = [
    {
      id: 'debt-ali',
      personId: 'person-ali',
      direction: 'lent',
      amountRial: 120_000_000,
      originalUnit: 'toman',
      quantity: 12_000_000,
      unitRateRial: T,
      dateJalali: dateKey(addJalaliDays(today, -25)),
      dueJalali: dateKey(addJalaliDays(today, 12)),
      affectsAccount: false,
      note: 'دنگ ویلا و شام سفر',
      status: 'active',
      settlements: [
        {
          id: 'settle-ali-1',
          dateJalali: dateKey(addJalaliDays(today, -5)),
          amountRial: 30_000_000
        }
      ],
      createdAt: isoFor(today, 72)
    },
    {
      id: 'debt-sara',
      personId: 'person-sara',
      direction: 'lent',
      amountRial: 512_000_000,
      originalUnit: 'gold_coin',
      quantity: 1,
      unitRateRial: 512_000_000,
      dateJalali: dateKey(addJalaliDays(today, -60)),
      dueJalali: dateKey(addJalaliDays(today, 30)),
      affectsAccount: false,
      note: 'یک سکه برای پیش‌پرداخت خرید خانه',
      status: 'active',
      settlements: [],
      createdAt: isoFor(today, 73)
    },
    {
      id: 'debt-mohammad',
      personId: 'person-mohammad',
      direction: 'borrowed',
      amountRial: 500_000_000,
      originalUnit: 'toman',
      quantity: 50_000_000,
      unitRateRial: T,
      dateJalali: dateKey(addJalaliDays(today, -40)),
      dueJalali: dateKey(addJalaliDays(today, 45)),
      affectsAccount: false,
      note: 'قرض بابت تعمیر موتور ماشین',
      status: 'active',
      settlements: [],
      createdAt: isoFor(today, 74)
    },
    {
      id: 'debt-reza',
      personId: 'person-reza',
      direction: 'borrowed',
      amountRial: 40_000_000,
      originalUnit: 'toman',
      quantity: 4_000_000,
      unitRateRial: T,
      dateJalali: dateKey(addJalaliDays(today, -15)),
      dueJalali: dateKey(addJalaliDays(today, 18)),
      affectsAccount: false,
      note: 'شارژ ساختمان دفتر',
      status: 'active',
      settlements: [],
      createdAt: isoFor(today, 75)
    },
    {
      id: 'debt-maryam',
      personId: 'person-maryam',
      direction: 'lent',
      amountRial: 200_000_000,
      originalUnit: 'toman',
      quantity: 20_000_000,
      unitRateRial: T,
      dateJalali: dateKey(addJalaliDays(today, -70)),
      affectsAccount: false,
      note: 'وام کوتاه‌مدت',
      status: 'settled',
      settlements: [
        {
          id: 'settle-maryam-1',
          dateJalali: dateKey(addJalaliDays(today, -35)),
          amountRial: 200_000_000
        }
      ],
      createdAt: isoFor(today, 76)
    }
  ];

  const goals: Goal[] = [
    {
      id: 'goal-emergency',
      name: 'صندوق اضطراری',
      targetRial: 4_000_000_000,
      savedRial: 1_200_000_000,
      targetJalali: dateKey(addJalaliMonths(today, 12)),
      accountId: 'acc-melli',
      icon: 'ShieldCheck',
      color: '#0f766e'
    },
    {
      id: 'goal-coins',
      name: 'خرید ۵ سکه',
      targetRial: 2_560_000_000,
      savedRial: 1_536_000_000,
      targetJalali: dateKey(addJalaliMonths(today, 8)),
      icon: 'Coins',
      color: '#b45309'
    },
    {
      id: 'goal-travel',
      name: 'سفر تابستان',
      targetRial: 800_000_000,
      savedRial: 200_000_000,
      targetJalali: dateKey(addJalaliMonths(today, 6)),
      icon: 'Plane',
      color: '#0d9488'
    }
  ];

  const budgets: Budget[] = [
    { id: 'budget-groceries', categoryId: 'cat-groceries', amountRial: 80_000_000, rollover: false },
    { id: 'budget-restaurant', categoryId: 'cat-restaurant', amountRial: 35_000_000, rollover: false },
    { id: 'budget-fuel', categoryId: 'cat-fuel', amountRial: 15_000_000, rollover: false },
    { id: 'budget-bills', categoryId: 'cat-bills', amountRial: 30_000_000, rollover: false },
    { id: 'budget-entertainment', categoryId: 'cat-entertainment', amountRial: 20_000_000, rollover: false },
    { id: 'budget-clothing', categoryId: 'cat-clothing', amountRial: 40_000_000, rollover: false }
  ];

  const scenarios: Scenario[] = [
    {
      id: 'sc-new-loan',
      name: 'وام ۱۰۰ میلیون تومانی جدید',
      description: 'دریافت ۱۰۰ میلیون تومان و بازپرداخت ۲۴ ماهه با قسط حدود ۴.۵ میلیون',
      type: 'loan',
      active: false,
      monthlyDeltaRial: -45_000_000,
      oneTimeDeltaRial: 1_000_000_000,
      startMonthOffset: 1,
      durationMonths: 24
    },
    {
      id: 'sc-gold-dca',
      name: 'پس‌انداز ماهانه طلا',
      description: 'خرید ماهانه ۵ میلیون تومان طلا به‌جای نگهداری نقد',
      type: 'gold_dca',
      active: false,
      monthlyDeltaRial: -50_000_000,
      oneTimeDeltaRial: 0,
      startMonthOffset: 0,
      durationMonths: 12
    },
    {
      id: 'sc-skip-trip',
      name: 'حذف سفر نوروز',
      description: 'صرفه‌جویی ۱۵ میلیون تومانی یک‌باره',
      type: 'skip_expense',
      active: false,
      monthlyDeltaRial: 0,
      oneTimeDeltaRial: 150_000_000,
      startMonthOffset: 2,
      durationMonths: 1
    },
    {
      id: 'sc-salary-boost',
      name: 'افزایش ۲۰٪ حقوق',
      description: 'سناریوی خوش‌بینانه افزایش حقوق از ماه آینده',
      type: 'income_boost',
      active: false,
      monthlyDeltaRial: 84_000_000,
      oneTimeDeltaRial: 0,
      startMonthOffset: 1,
      durationMonths: 12
    }
  ];

  // Solve opening balances so the derived current balances match the desired amounts.
  const zeroAccounts = accounts.map((account) => ({ ...account, openingBalanceRial: 0 }));
  const derived = deriveBalances(zeroAccounts, transactions);
  const solvedAccounts = accounts.map((account) => ({
    ...account,
    openingBalanceRial: (desiredBalancesRial[account.id] ?? 0) - (derived.get(account.id) ?? 0)
  }));

  const nowIso = now.toISOString();
  return {
    ...base,
    settings: { ...base.settings, onboardingDone: true },
    accounts: solvedAccounts,
    transactions,
    people,
    loans,
    installments,
    debts,
    cheques,
    assets,
    lots,
    goals,
    budgets,
    scenarios,
    demo: true,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

function parseDue(dateJalali: string): JalaliDate {
  const [jy, jm, jd] = dateJalali.split('/').map(Number);
  return { jy: jy as number, jm: jm as number, jd: jd as number };
}
