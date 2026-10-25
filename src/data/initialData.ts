import { Account, Asset, Category, Cheque, DebtEntry, Goal, InvestmentLot, Loan, LoanInstallment, Person, Scenario, Transaction } from '../types';
import { generateAmortizationSchedule } from '../utils/amortization';
import { getTodayJalali } from '../utils/jalali';

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-saman',
    name: 'بانک سامان (حساب جاری)',
    type: 'bank',
    bankName: 'بانک سامان',
    accountNumber: '829-10-4458921-1',
    cardNumber: '6219-8610-3342-9012',
    balance: 450000000, // 45,000,000 Toman = 450,000,000 Rial
    currency: 'IRR',
    color: '#0284c7',
    icon: 'Building2',
    includeInNetWorth: true
  },
  {
    id: 'acc-blubank',
    name: 'بلوبانک (مخارج روزمره)',
    type: 'card',
    bankName: 'بلوبانک',
    cardNumber: '6219-8619-7788-1244',
    balance: 84000000, // 8,400,000 Toman
    currency: 'IRR',
    color: '#3b82f6',
    icon: 'CreditCard',
    includeInNetWorth: true
  },
  {
    id: 'acc-melli-savings',
    name: 'بانک ملی (سپرده پس‌انداز)',
    type: 'savings',
    bankName: 'بانک ملی ایران',
    accountNumber: '0204992817004',
    balance: 1200000000, // 120,000,000 Toman
    currency: 'IRR',
    color: '#d97706',
    icon: 'PiggyBank',
    includeInNetWorth: true
  },
  {
    id: 'acc-cash',
    name: 'کیف پول نقدی',
    type: 'cash',
    balance: 12500000, // 1,250,000 Toman
    currency: 'IRR',
    color: '#10b981',
    icon: 'Wallet',
    includeInNetWorth: true
  },
  {
    id: 'acc-brokerage',
    name: 'کارگزاری مفید (حساب معاملاتی)',
    type: 'investment',
    balance: 285000000, // 28,500,000 Toman cash in brokerage
    currency: 'IRR',
    color: '#8b5cf6',
    icon: 'TrendingUp',
    includeInNetWorth: true
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  // Expense Parents & Children
  { id: 'cat-food', parentId: null, name: 'خوراک و رستوران', kind: 'expense', icon: 'Utensils', color: '#f97316' },
  { id: 'cat-groceries', parentId: 'cat-food', name: 'سوپرمارکت و خواروبار', kind: 'expense', icon: 'ShoppingCart', color: '#fb923c', budgetLimitRial: 120000000 },
  { id: 'cat-fruit', parentId: 'cat-food', name: 'میوه و سبزیجات', kind: 'expense', icon: 'Apple', color: '#ea580c', budgetLimitRial: 30000000 },
  { id: 'cat-restaurant', parentId: 'cat-food', name: 'رستوران و کافه‌گردی', kind: 'expense', icon: 'Coffee', color: '#c2410c', budgetLimitRial: 40000000 },

  { id: 'cat-transport', parentId: null, name: 'حمل و نقل و خودرو', kind: 'expense', icon: 'Car', color: '#0284c7' },
  { id: 'cat-fuel', parentId: 'cat-transport', name: 'بنزین و سوخت', kind: 'expense', icon: 'Fuel', color: '#38bdf8', budgetLimitRial: 15000000 },
  { id: 'cat-car-repair', parentId: 'cat-transport', name: 'تعمیرات و نگهداری خودرو', kind: 'expense', icon: 'Wrench', color: '#0369a1' },
  { id: 'cat-snapp', parentId: 'cat-transport', name: 'اسنپ و تاکسی اینترنتی', kind: 'expense', icon: 'Navigation', color: '#0284c7', budgetLimitRial: 20000000 },
  { id: 'cat-car-insurance', parentId: 'cat-transport', name: 'بیمه شخص ثالث و بدنه', kind: 'expense', icon: 'Shield', color: '#075985' },

  { id: 'cat-housing', parentId: null, name: 'مسکن و قبوض', kind: 'expense', icon: 'Home', color: '#6366f1' },
  { id: 'cat-rent', parentId: 'cat-housing', name: 'اجاره‌بها و رهن', kind: 'expense', icon: 'Building', color: '#818cf8', budgetLimitRial: 150000000 },
  { id: 'cat-bills', parentId: 'cat-housing', name: 'قبوض آب، برق، گاز و تلفن', kind: 'expense', icon: 'Zap', color: '#4f46e5', budgetLimitRial: 10000000 },
  { id: 'cat-building-fee', parentId: 'cat-housing', name: 'شارژ ساختمان و اینترنت', kind: 'expense', icon: 'Wifi', color: '#4338ca', budgetLimitRial: 8000000 },

  { id: 'cat-health', parentId: null, name: 'بهداشت و درمان', kind: 'expense', icon: 'HeartPulse', color: '#ec4899' },
  { id: 'cat-medicine', parentId: 'cat-health', name: 'دارو و ویزیت', kind: 'expense', icon: 'Pill', color: '#f472b6' },
  { id: 'cat-dentist', parentId: 'cat-health', name: 'دندانپزشکی', kind: 'expense', icon: 'Smile', color: '#db2777' },

  { id: 'cat-lifestyle', parentId: null, name: 'پوشاک و تفریح', kind: 'expense', icon: 'Sparkles', color: '#a855f7' },
  { id: 'cat-clothing', parentId: 'cat-lifestyle', name: 'خرید لباس و کفش', kind: 'expense', icon: 'Shirt', color: '#c084fc', budgetLimitRial: 30000000 },
  { id: 'cat-travel', parentId: 'cat-lifestyle', name: 'مسافرت و اقامت', kind: 'expense', icon: 'Plane', color: '#9333ea' },

  { id: 'cat-loan-interest', parentId: null, name: 'سود و کارمزد وام', kind: 'expense', icon: 'Percent', color: '#ef4444' },

  // Income Categories
  { id: 'cat-income-salary', parentId: null, name: 'حقوق و دستمزد', kind: 'income', icon: 'Briefcase', color: '#10b981' },
  { id: 'cat-income-freelance', parentId: null, name: 'پروژه آزاد و مشاوره', kind: 'income', icon: 'Laptop', color: '#059669' },
  { id: 'cat-income-interest', parentId: null, name: 'سود سپرده و صندوق', kind: 'income', icon: 'Coins', color: '#047857' },
  { id: 'cat-income-investment', parentId: null, name: 'سود فروش دارایی و طلا', kind: 'income', icon: 'TrendingUp', color: '#065f46' }
];

export const INITIAL_PEOPLE: Person[] = [
  { id: 'p-ali', name: 'علی رضایی', phone: '09121112233', notes: 'همکار قدیمی و همسفر', avatarColor: '#0284c7' },
  { id: 'p-mohammad', name: 'محمد (برادر)', phone: '09124445566', notes: 'خانواده', avatarColor: '#10b981' },
  { id: 'p-sara', name: 'سارا احمدی', phone: '09351239874', notes: 'دوست دانشگاهی', avatarColor: '#ec4899' },
  { id: 'p-reza', name: 'رضا کمالی', phone: '09197778899', notes: 'صاحبخانه و مدیر ساختمان', avatarColor: '#f59e0b' }
];

export const INITIAL_DEBTS: DebtEntry[] = [
  {
    id: 'debt-1',
    personId: 'p-ali',
    direction: 'lent', // طلبکارم (من قرض دادم)
    amountRial: 120000000, // 12,000,000 Toman
    originalUnit: 'toman',
    unitQuantity: 12000000,
    unitRateRial: 10,
    date: '2026-10-15',
    jalaliDate: '1405/07/24',
    dueDate: '2026-11-05',
    jalaliDueDate: '1405/08/15',
    affectsAccount: true,
    accountId: 'acc-blubank',
    note: 'دنگ ویلا و غذای سفر شمال',
    status: 'active'
  },
  {
    id: 'debt-2',
    personId: 'p-mohammad',
    direction: 'borrowed', // بدهکارم (من قرض گرفتم)
    amountRial: 500000000, // 50,000,000 Toman
    originalUnit: 'toman',
    unitQuantity: 50000000,
    unitRateRial: 10,
    date: '2026-09-20',
    jalaliDate: '1405/06/30',
    dueDate: '2026-12-01',
    jalaliDueDate: '1405/09/11',
    affectsAccount: false,
    note: 'قرض برادرانه بابت تعمیر موتور ماشین',
    status: 'active'
  },
  {
    id: 'debt-3',
    personId: 'p-sara',
    direction: 'lent', // طلبکارم
    amountRial: 512000000, // ۱ سکه تمام طرح جدید به ارزش ۵۱.۲ میلیون تومان
    originalUnit: 'gold_coin',
    unitQuantity: 1,
    unitRateRial: 5120000000,
    date: '2026-08-10',
    jalaliDate: '1405/05/20',
    dueDate: '2026-11-20',
    jalaliDueDate: '1405/08/30',
    affectsAccount: false,
    note: 'قرض دادن یک سکه تمام بهار آزادی جهت پیش‌پرداخت خرید خانه',
    status: 'active'
  }
];

// Initial loans with pre-generated installments
export const INITIAL_LOANS: Loan[] = [
  {
    id: 'loan-resalat',
    lender: 'بانک قرض‌الحسنه رسالت',
    principal: 3000000000, // 300,000,000 Toman (3 Billion Rial)
    interestModel: 'qard_hasan',
    annualRatePercent: 4,
    totalFee: 120000000, // 4% annual commission
    installmentCount: 12,
    frequencyMonths: 1,
    startDate: '2026-05-15',
    repaymentAccountId: 'acc-saman',
    note: 'وام قرض‌الحسنه کارآفرینی رسالت با کارمزد ۴ درصد',
    status: 'active'
  },
  {
    id: 'loan-melli-housing',
    lender: 'بانک ملی (طرح تسهیلات مسکن)',
    principal: 10000000000, // 1,000,000,000 Toman (10 Billion Rial)
    interestModel: 'reducing_balance',
    annualRatePercent: 23,
    totalFee: 50000000,
    installmentCount: 36,
    frequencyMonths: 1,
    startDate: '2026-01-10',
    repaymentAccountId: 'acc-saman',
    note: 'تسهیلات خرید مسکن اقساط مساوی بانکی',
    status: 'active'
  }
];

export function generateInitialInstallments(): LoanInstallment[] {
  const result: LoanInstallment[] = [];

  // Loan 1: Resalat (12 installments, starting from 1405/03/15)
  const resalatSched = generateAmortizationSchedule(3000000000, 4, 12, '1405/03/15', 'qard_hasan', 'loan-resalat');
  resalatSched.schedule.forEach((row, idx) => {
    const isPaid = idx < 5;
    const isDue = idx === 5;
    result.push({
      id: `inst-resalat-${row.installmentNumber}`,
      loanId: 'loan-resalat',
      installmentNumber: row.installmentNumber,
      dueDate: `2026-${(idx + 6).toString().padStart(2, '0')}-05`,
      jalaliDueDate: row.jalaliDueDate,
      amount: row.paymentAmount,
      principalPart: row.principalPart,
      interestPart: row.interestPart,
      status: isPaid ? 'paid' : (isDue ? 'due' : 'upcoming'),
      paidDate: isPaid ? '1405/07/15' : undefined,
      penaltyAccrued: 0
    });
  });

  // Loan 2: Melli (36 installments, starting from 1404/11/10)
  const melliSched = generateAmortizationSchedule(10000000000, 23, 36, '1404/11/10', 'reducing_balance', 'loan-melli-housing');
  melliSched.schedule.forEach((row, idx) => {
    const isPaid = idx < 9;
    const isUpcoming = idx === 9;
    result.push({
      id: `inst-melli-${row.installmentNumber}`,
      loanId: 'loan-melli-housing',
      installmentNumber: row.installmentNumber,
      dueDate: `2026-11-10`,
      jalaliDueDate: row.jalaliDueDate,
      amount: row.paymentAmount,
      principalPart: row.principalPart,
      interestPart: row.interestPart,
      status: isPaid ? 'paid' : (isUpcoming ? 'upcoming' : 'upcoming'),
      paidDate: isPaid ? '1405/07/10' : undefined,
      penaltyAccrued: 0
    });
  });

  return result;
}

export const INITIAL_INSTALLMENTS = generateInitialInstallments();

export const INITIAL_CHEQUES: Cheque[] = [
  {
    id: 'ch-1',
    direction: 'issued', // پرداختی
    number: '7482910384729104',
    bank: 'بانک سامان',
    amount: 400000000, // 40,000,000 Toman
    issueDate: '2026-09-10',
    dueDate: '2026-11-15',
    jalaliDueDate: '1405/08/25',
    counterparty: 'حاج احمد فلاح (اجاره دفتر کار)',
    status: 'pending',
    note: 'چک صیادی بابت ۳ ماه اجاره دفتر'
  },
  {
    id: 'ch-2',
    direction: 'received', // دریافتی
    number: '9928174620183749',
    bank: 'بانک پاسارگاد',
    amount: 250000000, // 25,000,000 Toman
    issueDate: '2026-10-01',
    dueDate: '2026-11-20',
    jalaliDueDate: '1405/08/30',
    counterparty: 'شرکت فناوران عصر نوین',
    status: 'pending',
    note: 'قسط دوم دستمزد قرارداد توسعه وب‌سایت'
  }
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'asset-gold-18k',
    symbol: 'GOLD_18K',
    name: 'طلای ۱۸ عیار (آب‌شده)',
    class: 'gold_physical',
    unit: 'گرم',
    currentPriceRial: 44500000, // 4,450,000 Toman per gram = 44,500,000 Rial
    previousClosePriceRial: 43800000,
    lastUpdated: '1405/08/04 11:30',
    source: 'market'
  },
  {
    id: 'asset-coin-emami',
    symbol: 'COIN_EMAMI',
    name: 'سکه تمام طرح جدید (امامی)',
    class: 'gold_coin',
    unit: 'عدد',
    currentPriceRial: 512000000, // 51,200,000 Toman
    previousClosePriceRial: 504000000,
    lastUpdated: '1405/08/04 11:30',
    source: 'market'
  },
  {
    id: 'asset-fund-ayar',
    symbol: 'AYAR',
    name: 'صندوق طلای عیار مفید',
    class: 'gold_etf',
    unit: 'واحد',
    currentPriceRial: 125400, // 12,540 Toman
    previousClosePriceRial: 123000,
    lastUpdated: '1405/08/04 12:15',
    source: 'market'
  },
  {
    id: 'asset-stock-foolad',
    symbol: 'فولاد',
    name: 'فولاد مبارکه اصفهان',
    class: 'stock',
    unit: 'سهم',
    currentPriceRial: 4620, // 462 Toman
    previousClosePriceRial: 4580,
    lastUpdated: '1405/08/04 12:30',
    source: 'market'
  },
  {
    id: 'asset-crypto-usdt',
    symbol: 'USDT',
    name: 'تتر (دلار دیجیتال)',
    class: 'crypto',
    unit: 'USDT',
    currentPriceRial: 688000, // 68,800 Toman
    previousClosePriceRial: 682000,
    lastUpdated: '1405/08/04 12:45',
    source: 'market'
  },
  {
    id: 'asset-fx-usd',
    symbol: 'USD',
    name: 'اسکناس دلار آمریکا',
    class: 'fx',
    unit: 'دلار',
    currentPriceRial: 685000, // 68,500 Toman
    previousClosePriceRial: 681000,
    lastUpdated: '1405/08/04 11:30',
    source: 'market'
  }
];

export const INITIAL_INVESTMENT_LOTS: InvestmentLot[] = [
  {
    id: 'lot-1',
    assetId: 'asset-gold-18k',
    type: 'buy',
    date: '2026-04-10',
    jalaliDate: '1405/01/21',
    quantity: 45.5, // 45.5 grams
    pricePerUnitRial: 37500000, // 3,750,000 Toman/g
    feeRial: 12000000,
    accountId: 'acc-saman',
    note: 'خرید طلای آب‌شده جهت حفظ ارزش سرمایه'
  },
  {
    id: 'lot-2',
    assetId: 'asset-coin-emami',
    type: 'buy',
    date: '2026-03-05',
    jalaliDate: '1404/12/15',
    quantity: 3, // 3 coins
    pricePerUnitRial: 410000000, // 41,000,000 Toman each
    feeRial: 5000000,
    accountId: 'acc-saman',
    note: 'خرید ۳ سکه تمام طرح جدید'
  },
  {
    id: 'lot-3',
    assetId: 'asset-fund-ayar',
    type: 'buy',
    date: '2026-06-15',
    jalaliDate: '1405/03/25',
    quantity: 2500, // units
    pricePerUnitRial: 104000, // 10,400 Toman
    feeRial: 150000,
    accountId: 'acc-brokerage',
    note: 'سرمایه‌گذاری در صندوق عیار از طریق مفید آنلاین'
  },
  {
    id: 'lot-4',
    assetId: 'asset-stock-foolad',
    type: 'buy',
    date: '2026-02-18',
    jalaliDate: '1404/11/29',
    quantity: 12000, // shares
    pricePerUnitRial: 4100, // 410 Toman
    feeRial: 600000,
    accountId: 'acc-brokerage',
    note: 'خرید سهم بنیادی فولاد در کف قیمتی'
  },
  {
    id: 'lot-5',
    assetId: 'asset-crypto-usdt',
    type: 'buy',
    date: '2026-07-20',
    jalaliDate: '1405/04/29',
    quantity: 850,
    pricePerUnitRial: 595000,
    feeRial: 200000,
    accountId: 'acc-saman',
    note: 'خرید تتر برای پرداخت‌های ارزی'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-1',
    kind: 'expense',
    accountId: 'acc-blubank',
    amount: 14500000, // 1,450,000 Toman
    date: '2026-10-24T18:30:00Z',
    jalaliDate: '1405/08/03',
    categoryId: 'cat-groceries',
    note: 'خرید هفتگی هایپرمی و اقلام شوینده',
    tags: ['خرید_خانه', 'هفتگی'],
    status: 'posted'
  },
  {
    id: 'txn-2',
    kind: 'expense',
    accountId: 'acc-blubank',
    amount: 3500000, // 350,000 Toman
    date: '2026-10-24T12:00:00Z',
    jalaliDate: '1405/08/03',
    categoryId: 'cat-fuel',
    note: 'بنزین سوپر پمپ بنزین پاسداران',
    tags: ['خودرو'],
    status: 'posted'
  },
  {
    id: 'txn-3',
    kind: 'expense',
    accountId: 'acc-saman',
    amount: 8800000, // 880,000 Toman
    date: '2026-10-23T21:15:00Z',
    jalaliDate: '1405/08/02',
    categoryId: 'cat-restaurant',
    note: 'شام دورهمی رستوران ارکیده',
    tags: ['تفریح', 'شام'],
    status: 'posted'
  },
  {
    id: 'txn-4',
    kind: 'income',
    accountId: 'acc-saman',
    amount: 420000000, // 42,000,000 Toman
    date: '2026-10-20T09:00:00Z',
    jalaliDate: '1405/07/29',
    categoryId: 'cat-income-salary',
    note: 'واریز حقوق ماه مهر شرکت داده‌پردازی',
    tags: ['حقوق', 'ماهیانه'],
    status: 'posted'
  },
  {
    id: 'txn-5',
    kind: 'transfer',
    accountId: 'acc-saman',
    toAccountId: 'acc-blubank',
    amount: 100000000, // 10,000,000 Toman
    fee: 7200, // 720 Toman card to card fee
    date: '2026-10-21T14:10:00Z',
    jalaliDate: '1405/07/30',
    note: 'شارژ کارت بلو برای خریدهای خرد',
    tags: ['انتقال_داخلی'],
    status: 'posted'
  },
  {
    id: 'txn-6',
    kind: 'expense',
    accountId: 'acc-blubank',
    amount: 1850000, // 185,000 Toman
    date: '2026-10-22T08:45:00Z',
    jalaliDate: '1405/08/01',
    categoryId: 'cat-snapp',
    note: 'اسنپ رفت و برگشت به جلسه سعادت‌آباد',
    tags: ['کاری', 'اسنپ'],
    status: 'posted'
  },
  {
    id: 'txn-7',
    kind: 'expense',
    accountId: 'acc-saman',
    amount: 12000000, // 1,200,000 Toman
    date: '2026-10-18T16:00:00Z',
    jalaliDate: '1405/07/27',
    categoryId: 'cat-bills',
    note: 'قبوض تلفن همراه و برق منزل',
    tags: ['قبوض'],
    status: 'posted'
  }
];

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal-emergency-fund',
    name: 'صندوق اضطراری ۶ ماهه',
    targetAmountRial: 2500000000, // 250M Toman
    currentAmountRial: 1200000000,
    targetDate: '2027-04-01',
    jalaliTargetDate: '1406/01/12',
    linkedAccountId: 'acc-melli-savings',
    icon: 'ShieldCheck',
    color: '#0284c7'
  },
  {
    id: 'goal-gold-purchase',
    name: 'خرید ۵ سکه تمام برای سرمایه‌گذاری',
    targetAmountRial: 2560000000, // 256M Toman
    currentAmountRial: 1536000000,
    targetDate: '2027-02-28',
    jalaliTargetDate: '1405/12/10',
    icon: 'Coins',
    color: '#eab308'
  }
];

export const INITIAL_SCENARIOS: Scenario[] = [
  {
    id: 'sc-loan-100m',
    name: 'دریافت وام ۱۰۰ میلیون تومانی جدید',
    description: 'دریافت وام با بازپرداخت ۲۴ ماهه قسط ۴.۵ میلیون تومان',
    active: false,
    type: 'loan',
    deltaMonthlyRial: -450000000, // monthly installment payment
    deltaOneTimeRial: 10000000000, // 100M Toman immediate liquidity
    startMonthOffset: 1,
    durationMonths: 24
  },
  {
    id: 'sc-gold-dca',
    name: 'پس‌انداز ماهانه ۵ میلیون تومان در طلا',
    description: 'خرید منظم ماهانه نیم‌گرم طلا جهت پوشش تورم',
    active: false,
    type: 'gold_dca',
    deltaMonthlyRial: -500000000,
    deltaOneTimeRial: 0,
    startMonthOffset: 0,
    durationMonths: 12
  },
  {
    id: 'sc-skip-trip',
    name: 'حذف سفر عید نوروز و پس‌انداز',
    description: 'صرفه‌جویی ۱۵ میلیون تومانی در هزینه‌های اسفند و فروردین',
    active: false,
    type: 'skip_expense',
    deltaMonthlyRial: 0,
    deltaOneTimeRial: 1500000000,
    startMonthOffset: 4,
    durationMonths: 1
  }
];
