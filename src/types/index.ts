export type CurrencyUnit = 'RIAL' | 'TOMAN';
export type NumeralStyle = 'fa' | 'en';

export type AccountType = 
  | 'cash' 
  | 'bank' 
  | 'card' 
  | 'wallet' 
  | 'savings' 
  | 'loan' 
  | 'credit' 
  | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName?: string;
  accountNumber?: string;
  cardNumber?: string;
  balance: number; // Integer in Rial
  currency: 'IRR';
  color: string;
  icon: string;
  includeInNetWorth: boolean;
  isArchived?: boolean;
}

export type CategoryKind = 'expense' | 'income';

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  budgetLimitRial?: number;
}

export type TransactionKind = 'expense' | 'income' | 'transfer';
export type TransactionStatus = 'posted' | 'pending';

export interface TransactionSplit {
  id: string;
  categoryId: string;
  amount: number; // Integer in Rial
  note?: string;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  accountId: string;
  toAccountId?: string; // For transfers
  amount: number; // Integer in Rial
  fee?: number; // Integer in Rial
  date: string; // ISO string e.g. "2026-10-25T10:00:00Z"
  jalaliDate: string; // e.g. "1405/08/04"
  categoryId?: string;
  personId?: string;
  note?: string;
  tags: string[];
  status: TransactionStatus;
  splitItems?: TransactionSplit[];
  attachmentUrl?: string;
  refType?: 'loan' | 'debt' | 'investment' | 'cheque';
  refId?: string;
}

export type InterestModel = 
  | 'reducing_balance' // روش اقساط مساوی بانکی (فرمول PMT)
  | 'flat_rate'        // کارمزد ثابت روی اصل وام
  | 'qard_hasan'       // قرض‌الحسنه بدون بهره با کارمزد سالانه
  | 'custom';          // جدول اقساط دستی

export type InstallmentStatus = 'upcoming' | 'due' | 'paid' | 'partially_paid' | 'overdue' | 'deferred';

export interface LoanInstallment {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string; // ISO or Jalali
  jalaliDueDate: string;
  amount: number; // Integer in Rial
  principalPart: number;
  interestPart: number;
  status: InstallmentStatus;
  paidDate?: string;
  paidTxnId?: string;
  penaltyAccrued: number; // جریمه دیرکرد ریال
}

export interface Loan {
  id: string;
  lender: string; // مثلاً بانک ملت یا برادر
  principal: number; // اصل وام به ریال
  interestModel: InterestModel;
  annualRatePercent: number; // مثلاً ۱۸٪ یا ۲۳٪ یا ۴٪
  totalFee: number; // کارمزد اولیه
  installmentCount: number;
  frequencyMonths: number;
  startDate: string;
  repaymentAccountId: string;
  note?: string;
  status: 'active' | 'settled';
}

export type DebtDirection = 'lent' | 'borrowed'; // طلب (من قرض دادم) | بدهی (من قرض گرفتم)
export type DebtUnit = 'rial' | 'toman' | 'usd' | 'gold_coin' | 'gold_gram';

export interface DebtEntry {
  id: string;
  personId: string;
  direction: DebtDirection;
  amountRial: number; // معادل ارزش ریالی مبنا
  originalUnit: DebtUnit;
  unitQuantity: number; // مثلا ۲ سکه یا ۵۰۰ دلار
  unitRateRial: number; // نرخ واحد در زمان ثبت
  date: string;
  jalaliDate: string;
  dueDate?: string;
  jalaliDueDate?: string;
  affectsAccount: boolean;
  accountId?: string;
  note?: string;
  status: 'active' | 'settled' | 'forgiven'; // بخشیده شده یا تسویه شده
  settledAt?: string;
  settledAmountRial?: number;
  attachments?: string[];
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  avatarColor?: string;
}

export type ChequeStatus = 'pending' | 'cashed' | 'bounced' | 'returned' | 'endorsed';
export interface Cheque {
  id: string;
  direction: 'received' | 'issued'; // دریافتی | پرداختی
  number: string; // شماره چک / صیاد
  bank: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  jalaliDueDate: string;
  counterparty: string;
  status: ChequeStatus;
  note?: string;
  txnId?: string;
}

export type AssetClass = 
  | 'gold_physical' 
  | 'gold_coin' 
  | 'gold_etf' 
  | 'fund_fixed' 
  | 'fund_equity' 
  | 'stock' 
  | 'fx' 
  | 'crypto' 
  | 'deposit' 
  | 'manual';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  class: AssetClass;
  unit: string;
  currentPriceRial: number;
  previousClosePriceRial: number;
  lastUpdated: string;
  source: 'market' | 'manual';
}

export interface InvestmentLot {
  id: string;
  assetId: string;
  type: 'buy' | 'sell';
  date: string;
  jalaliDate: string;
  quantity: number;
  pricePerUnitRial: number;
  feeRial: number;
  accountId?: string;
  txnId?: string;
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmountRial: number;
  currentAmountRial: number;
  targetDate: string;
  jalaliTargetDate: string;
  linkedAccountId?: string;
  icon: string;
  color: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  active: boolean;
  type: 'loan' | 'skip_expense' | 'income_boost' | 'gold_dca';
  deltaMonthlyRial: number;
  deltaOneTimeRial: number;
  startMonthOffset: number;
  durationMonths: number;
}
