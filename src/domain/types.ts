import type { JalaliDate } from './jalali';
import type { CurrencyUnit, NumeralStyle } from './money';

export type { JalaliDate, CurrencyUnit, NumeralStyle };

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  currencyUnit: CurrencyUnit;
  numerals: NumeralStyle;
  theme: ThemeMode;
  hideBalances: boolean;
  onboardingDone: boolean;
  activePersonId?: string;
  inflationPercent: number;
}

export type AccountType = 'cash' | 'bank' | 'card' | 'wallet' | 'savings' | 'investment' | 'credit' | 'loan';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName?: string;
  number?: string;
  /** Opening balance in integer Rial. Current balance is always derived from the ledger. */
  openingBalanceRial: number;
  color: string;
  icon: string;
  includeInNetWorth: boolean;
  archived: boolean;
  createdAt: string;
}

export type CategoryKind = 'expense' | 'income';

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  archived?: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  amountRial: number;
  rollover: boolean;
}

export type TransactionKind = 'expense' | 'income' | 'transfer' | 'investment' | 'loan' | 'debt';
export type CashDirection = 'in' | 'out';

export interface TransactionSplit {
  id: string;
  categoryId: string;
  amountRial: number;
  note?: string;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  /** Source account for outflows/transfers; account for inflows. */
  accountId: string;
  /** Destination account for transfers. */
  toAccountId?: string;
  /** Always a positive amount in Rial. Direction is encoded by `kind` + `cashDirection`. */
  amountRial: number;
  feeRial: number;
  dateJalali: string;
  /** ISO timestamp, used for stable ordering of same-day entries. */
  createdAt: string;
  categoryId?: string;
  personId?: string;
  note?: string;
  tags: string[];
  splits?: TransactionSplit[];
  /** Required for investment/loan/debt flows; expense/income/transfer derive it. */
  cashDirection?: CashDirection;
  /** Interest + penalty portion of a loan payment (reportable as an expense). */
  loanInterestRial?: number;
  refKind?: 'loan' | 'loan_installment' | 'cheque' | 'debt' | 'debt_settlement' | 'investment_lot';
  refId?: string;
  installmentId?: string;
  chequeId?: string;
  debtId?: string;
  lotId?: string;
}

export type InterestModel = 'reducing_balance' | 'flat_rate' | 'qard_hasan' | 'custom';

export interface Loan {
  id: string;
  lender: string;
  principalRial: number;
  interestModel: InterestModel;
  annualRatePercent: number;
  totalFeeRial: number;
  installmentCount: number;
  frequencyMonths: number;
  disbursementJalali: string;
  firstDueJalali: string;
  accountId: string;
  penaltyAnnualPercent: number;
  status: 'active' | 'settled';
  note?: string;
  createdAt: string;
}

export interface LoanInstallment {
  id: string;
  loanId: string;
  number: number;
  dueJalali: string;
  amountRial: number;
  principalRial: number;
  interestRial: number;
  penaltyRial: number;
  paidAtJalali?: string;
  paidTxnId?: string;
  deferredToJalali?: string;
}

export type InstallmentStatus = 'paid' | 'overdue' | 'due' | 'upcoming' | 'deferred';
export type InstallmentState = LoanInstallment & { status: InstallmentStatus; effectiveDueJalali: string };

export type DebtDirection = 'lent' | 'borrowed';
export type DebtUnit = 'rial' | 'toman' | 'usd' | 'gold_gram' | 'gold_coin';
export type DebtStatus = 'active' | 'settled' | 'forgiven';

export interface DebtSettlement {
  id: string;
  dateJalali: string;
  amountRial: number;
  accountId?: string;
  txnId?: string;
}

export interface DebtEntry {
  id: string;
  personId: string;
  direction: DebtDirection;
  /** Snapshot value in Rial at entry time. */
  amountRial: number;
  originalUnit: DebtUnit;
  quantity: number;
  unitRateRial: number;
  dateJalali: string;
  dueJalali?: string;
  affectsAccount: boolean;
  accountId?: string;
  note?: string;
  status: DebtStatus;
  settlements: DebtSettlement[];
  forgivenAtJalali?: string;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  avatarColor: string;
}

export type ChequeStatus = 'pending' | 'cashed' | 'bounced' | 'returned' | 'canceled';

export interface Cheque {
  id: string;
  direction: 'issued' | 'received';
  number: string;
  bank: string;
  amountRial: number;
  issueJalali: string;
  dueJalali: string;
  counterparty: string;
  status: ChequeStatus;
  note?: string;
  accountId?: string;
  txnId?: string;
  createdAt: string;
}

export type AssetClass =
  | 'gold'
  | 'coin'
  | 'gold_fund'
  | 'fund'
  | 'stock'
  | 'fx'
  | 'crypto'
  | 'deposit'
  | 'manual';

export interface PricePoint {
  dateJalali: string;
  priceRial: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  class: AssetClass;
  unit: string;
  currentPriceRial: number;
  previousClosePriceRial: number;
  lastUpdatedJalali: string;
  priceHistory: PricePoint[];
  source: 'market' | 'manual';
}

export interface InvestmentLot {
  id: string;
  assetId: string;
  type: 'buy' | 'sell';
  dateJalali: string;
  quantity: number;
  pricePerUnitRial: number;
  feeRial: number;
  accountId?: string;
  txnId?: string;
  note?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetRial: number;
  savedRial: number;
  targetJalali: string;
  accountId?: string;
  icon: string;
  color: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'loan' | 'skip_expense' | 'income_boost' | 'gold_dca';
  active: boolean;
  monthlyDeltaRial: number;
  oneTimeDeltaRial: number;
  startMonthOffset: number;
  durationMonths: number;
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  people: Person[];
  loans: Loan[];
  installments: LoanInstallment[];
  debts: DebtEntry[];
  cheques: Cheque[];
  assets: Asset[];
  lots: InvestmentLot[];
  goals: Goal[];
  budgets: Budget[];
  scenarios: Scenario[];
  demo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DerivedAccount extends Account {
  balanceRial: number;
}

export interface TransactionDraft {
  kind: 'expense' | 'income' | 'transfer';
  amountRial: number;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  dateJalali: string;
  feeRial?: number;
  note?: string;
  tags?: string[];
  personId?: string;
  splits?: TransactionSplit[];
}

export interface ReportPeriod {
  from: JalaliDate | null;
  to: JalaliDate | null;
  label: string;
}
