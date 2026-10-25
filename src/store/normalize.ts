import { createBaseData, createId, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../domain/defaults';
import { gregorianToJalali, parseJalali, todayJalali } from '../domain/jalali';
import type {
  Account,
  AccountType,
  AppData,
  Asset,
  AssetClass,
  Budget,
  Category,
  Cheque,
  ChequeStatus,
  DebtEntry,
  DebtStatus,
  DebtUnit,
  Goal,
  InstallmentStatus,
  InterestModel,
  InvestmentLot,
  Loan,
  LoanInstallment,
  Person,
  Scenario,
  Settings,
  ThemeMode,
  Transaction,
  TransactionKind
} from '../domain/types';

type Rec = Record<string, unknown>;

const isRec = (value: unknown): value is Rec => typeof value === 'object' && value !== null && !Array.isArray(value);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asBool = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);

const TXN_KINDS: TransactionKind[] = ['expense', 'income', 'transfer', 'investment', 'loan', 'debt'];
const REF_KINDS = ['loan', 'loan_installment', 'cheque', 'debt', 'debt_settlement', 'investment_lot'] as const;
const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'card', 'wallet', 'savings', 'investment', 'credit', 'loan'];
const ASSET_CLASSES: AssetClass[] = ['gold', 'coin', 'gold_fund', 'fund', 'stock', 'fx', 'crypto', 'deposit', 'manual'];
const DEBT_UNITS: DebtUnit[] = ['rial', 'toman', 'usd', 'gold_gram', 'gold_coin'];
const DEBT_STATUSES: DebtStatus[] = ['active', 'settled', 'forgiven'];
const CHEQUE_STATUSES: ChequeStatus[] = ['pending', 'cashed', 'bounced', 'returned', 'canceled'];
const INTEREST_MODELS: InterestModel[] = ['reducing_balance', 'flat_rate', 'qard_hasan', 'custom'];
const INSTALLMENT_STATUSES: InstallmentStatus[] = ['paid', 'overdue', 'due', 'upcoming', 'deferred'];
const THEMES: ThemeMode[] = ['light', 'dark', 'system'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateKey(input: unknown): string {
  const text = asString(input);
  const parsed = parseJalali(text);
  if (parsed) return `${parsed.jy}/${pad(parsed.jm)}/${pad(parsed.jd)}`;
  if (text) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      const jalali = gregorianToJalali({
        gy: date.getFullYear(),
        gm: date.getMonth() + 1,
        gd: date.getDate()
      });
      return `${jalali.jy}/${pad(jalali.jm)}/${pad(jalali.jd)}`;
    }
  }
  const today = todayJalali();
  return `${today.jy}/${pad(today.jm)}/${pad(today.jd)}`;
}

function toTimestamp(input: unknown): string {
  const text = asString(input);
  if (text) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function normalizeSettings(raw: unknown): Settings {
  const rec = isRec(raw) ? raw : {};
  const currency = rec.currencyUnit === 'RIAL' ? 'RIAL' : 'TOMAN';
  const numerals = rec.numerals === 'en' ? 'en' : 'fa';
  const theme = THEMES.includes(rec.theme as ThemeMode) ? (rec.theme as ThemeMode) : 'system';
  return {
    ...DEFAULT_SETTINGS,
    currencyUnit: currency,
    numerals,
    theme,
    hideBalances: asBool(rec.hideBalances, false),
    onboardingDone: asBool(rec.onboardingDone, false),
    activePersonId: typeof rec.activePersonId === 'string' ? rec.activePersonId : undefined,
    inflationPercent: Math.max(0, Math.min(300, asNumber(rec.inflationPercent, 35)))
  };
}

function normalizeAccounts(raw: unknown[]): Account[] {
  const seen = new Set<string>();
  const accounts: Account[] = [];
  for (const item of raw) {
    if (!isRec(item)) continue;
    const id = asString(item.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    accounts.push({
      id,
      name: asString(item.name, 'حساب'),
      type: ACCOUNT_TYPES.includes(item.type as AccountType) ? (item.type as AccountType) : 'bank',
      bankName: typeof item.bankName === 'string' ? item.bankName : undefined,
      number: typeof item.number === 'string' ? item.number : undefined,
      openingBalanceRial: Math.round(asNumber(item.openingBalanceRial, 0)),
      color: asString(item.color, '#0f766e'),
      icon: asString(item.icon, 'Wallet'),
      includeInNetWorth: asBool(item.includeInNetWorth, true),
      archived: asBool(item.archived, false),
      createdAt: toTimestamp(item.createdAt)
    });
  }
  return accounts;
}

function normalizeTransactions(raw: unknown[], accountIds: Set<string>, categoryIds: Set<string>): Transaction[] {
  const seen = new Set<string>();
  const transactions: Transaction[] = [];
  for (const item of raw) {
    if (!isRec(item)) continue;
    const id = asString(item.id) || createId('txn');
    if (seen.has(id)) continue;
    const kind = TXN_KINDS.includes(item.kind as TransactionKind) ? (item.kind as TransactionKind) : null;
    if (!kind) continue;
    const accountId = asString(item.accountId);
    if (!accountIds.has(accountId)) continue;
    const toAccountId = asString(item.toAccountId);
    if (kind === 'transfer' && (!toAccountId || !accountIds.has(toAccountId) || toAccountId === accountId)) continue;
    const amountRial = Math.round(asNumber(item.amountRial, 0));
    if (amountRial <= 0) continue;

    const dateJalali = toDateKey(item.dateJalali ?? item.date);
    const categoryId = asString(item.categoryId);
    const splits = asArray(item.splits)
      .map((split) => {
        if (!isRec(split)) return null;
        const splitCategory = asString(split.categoryId);
        const splitAmount = Math.round(asNumber(split.amountRial, 0));
        if (!categoryIds.has(splitCategory) || splitAmount <= 0) return null;
        return {
          id: asString(split.id) || createId('split'),
          categoryId: splitCategory,
          amountRial: splitAmount,
          note: typeof split.note === 'string' ? split.note : undefined
        };
      })
      .filter((split): split is NonNullable<typeof split> => split !== null);

    const refKind = REF_KINDS.includes(item.refKind as (typeof REF_KINDS)[number])
      ? (item.refKind as Transaction['refKind'])
      : undefined;
    const cashDirection =
      item.cashDirection === 'in' || item.cashDirection === 'out'
        ? (item.cashDirection as 'in' | 'out')
        : undefined;

    transactions.push({
      id,
      kind,
      accountId,
      toAccountId: kind === 'transfer' ? toAccountId : undefined,
      amountRial,
      feeRial: Math.max(0, Math.round(asNumber(item.feeRial, 0))),
      dateJalali,
      createdAt: toTimestamp(item.createdAt ?? item.date),
      categoryId: categoryIds.has(categoryId) ? categoryId : undefined,
      personId: typeof item.personId === 'string' ? item.personId : undefined,
      note: typeof item.note === 'string' ? item.note : undefined,
      tags: asArray(item.tags).filter((tag): tag is string => typeof tag === 'string' && tag.length > 0),
      splits: splits.length > 0 ? splits : undefined,
      cashDirection,
      loanInterestRial:
        typeof item.loanInterestRial === 'number' && item.loanInterestRial >= 0
          ? Math.round(item.loanInterestRial)
          : undefined,
      refKind,
      refId: typeof item.refId === 'string' ? item.refId : undefined,
      installmentId: typeof item.installmentId === 'string' ? item.installmentId : undefined,
      chequeId: typeof item.chequeId === 'string' ? item.chequeId : undefined,
      debtId: typeof item.debtId === 'string' ? item.debtId : undefined,
      lotId: typeof item.lotId === 'string' ? item.lotId : undefined
    });
    seen.add(id);
  }
  return transactions;
}

function normalizeCategories(raw: unknown[]): Category[] {
  const categories: Category[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRec(item)) continue;
    const id = asString(item.id);
    if (!id || seen.has(id)) continue;
    const kind = item.kind === 'income' ? 'income' : item.kind === 'expense' ? 'expense' : null;
    if (!kind) continue;
    seen.add(id);
    categories.push({
      id,
      parentId: typeof item.parentId === 'string' && item.parentId ? item.parentId : null,
      name: asString(item.name, 'دسته'),
      kind,
      icon: asString(item.icon, 'CircleEllipsis'),
      color: asString(item.color, '#64748b'),
      archived: asBool(item.archived, false)
    });
  }
  // Drop orphans and cycles.
  const byId = new Map(categories.map((category) => [category.id, category]));
  for (const category of categories) {
    if (category.parentId && !byId.has(category.parentId)) category.parentId = null;
  }
  for (const category of categories) {
    let child = category;
    let guard = 0;
    while (child.parentId && guard < 20) {
      child = byId.get(child.parentId) as Category;
      guard += 1;
      if (child.id === category.id) {
        category.parentId = null;
        break;
      }
    }
  }
  return categories;
}

function normalizePeople(raw: unknown[]): Person[] {
  return raw
    .filter(isRec)
    .map((item) => ({
      id: asString(item.id) || createId('person'),
      name: asString(item.name, 'بدون نام'),
      phone: typeof item.phone === 'string' ? item.phone : undefined,
      note: typeof item.note === 'string' ? item.note : undefined,
      avatarColor: asString(item.avatarColor, '#0f766e')
    }))
    .filter((person) => person.name.length > 0);
}

function normalizeLoans(raw: unknown[], accountIds: Set<string>): Loan[] {
  return raw
    .filter(isRec)
    .map((item) => ({
      id: asString(item.id) || createId('loan'),
      lender: asString(item.lender, 'وام'),
      principalRial: Math.max(0, Math.round(asNumber(item.principalRial, 0))),
      interestModel: INTEREST_MODELS.includes(item.interestModel as InterestModel)
        ? (item.interestModel as InterestModel)
        : 'reducing_balance',
      annualRatePercent: Math.max(0, asNumber(item.annualRatePercent, 0)),
      totalFeeRial: Math.max(0, Math.round(asNumber(item.totalFeeRial, 0))),
      installmentCount: Math.max(1, Math.round(asNumber(item.installmentCount, 1))),
      frequencyMonths: Math.max(1, Math.min(12, Math.round(asNumber(item.frequencyMonths, 1)))),
      disbursementJalali: toDateKey(item.disbursementJalali),
      firstDueJalali: toDateKey(item.firstDueJalali),
      accountId: accountIds.has(asString(item.accountId)) ? asString(item.accountId) : [...accountIds][0] ?? '',
      penaltyAnnualPercent: Math.max(0, asNumber(item.penaltyAnnualPercent, 6)),
      status: item.status === 'settled' ? 'settled' : 'active',
      note: typeof item.note === 'string' ? item.note : undefined,
      createdAt: toTimestamp(item.createdAt)
    }))
    .filter((loan) => loan.principalRial > 0 && loan.accountId);
}

function normalizeInstallments(raw: unknown[], loans: Loan[], accountIds: Set<string>): LoanInstallment[] {
  const loanById = new Map(loans.map((loan) => [loan.id, loan]));
  const installments: LoanInstallment[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRec(item)) continue;
    const loanId = asString(item.loanId);
    const loan = loanById.get(loanId);
    if (!loan) continue;
    const id = asString(item.id) || createId('inst');
    if (seen.has(id)) continue;
    seen.add(id);
    const amountRial = Math.round(asNumber(item.amountRial, 0));
    if (amountRial <= 0) continue;
    installments.push({
      id,
      loanId,
      number: Math.max(1, Math.round(asNumber(item.number, installments.length + 1))),
      dueJalali: toDateKey(item.dueJalali),
      amountRial,
      principalRial: Math.max(0, Math.round(asNumber(item.principalRial, amountRial))),
      interestRial: Math.max(0, Math.round(asNumber(item.interestRial, 0))),
      penaltyRial: Math.max(0, Math.round(asNumber(item.penaltyRial, 0))),
      paidAtJalali: item.paidAtJalali ? toDateKey(item.paidAtJalali) : undefined,
      paidTxnId: typeof item.paidTxnId === 'string' ? item.paidTxnId : undefined,
      deferredToJalali: item.deferredToJalali ? toDateKey(item.deferredToJalali) : undefined
    });
  }
  return installments;
}

function normalizeDebts(raw: unknown[], peopleIds: Set<string>, accountIds: Set<string>): DebtEntry[] {
  return raw
    .filter(isRec)
    .map((item) => {
      const personId = asString(item.personId);
      const amountRial = Math.max(0, Math.round(asNumber(item.amountRial, 0)));
      const status = DEBT_STATUSES.includes(item.status as DebtStatus) ? (item.status as DebtStatus) : 'active';
      const settlements = asArray(item.settlements)
        .filter(isRec)
        .map((settlement) => ({
          id: asString(settlement.id) || createId('settle'),
          dateJalali: toDateKey(settlement.dateJalali),
          amountRial: Math.max(0, Math.round(asNumber(settlement.amountRial, 0))),
          accountId: accountIds.has(asString(settlement.accountId)) ? asString(settlement.accountId) : undefined,
          txnId: typeof settlement.txnId === 'string' ? settlement.txnId : undefined
        }));
      return {
        id: asString(item.id) || createId('debt'),
        personId,
        direction: item.direction === 'borrowed' ? 'borrowed' : 'lent',
        amountRial,
        originalUnit: DEBT_UNITS.includes(item.originalUnit as DebtUnit) ? (item.originalUnit as DebtUnit) : 'toman',
        quantity: Math.max(0, asNumber(item.quantity, amountRial / 10)),
        unitRateRial: Math.max(0, asNumber(item.unitRateRial, 10)),
        dateJalali: toDateKey(item.dateJalali),
        dueJalali: item.dueJalali ? toDateKey(item.dueJalali) : undefined,
        affectsAccount: asBool(item.affectsAccount, false),
        accountId: accountIds.has(asString(item.accountId)) ? asString(item.accountId) : undefined,
        note: typeof item.note === 'string' ? item.note : undefined,
        status,
        settlements,
        forgivenAtJalali: item.forgivenAtJalali ? toDateKey(item.forgivenAtJalali) : undefined,
        createdAt: toTimestamp(item.createdAt)
      } satisfies DebtEntry;
    })
    .filter((debt) => debt.amountRial > 0 && peopleIds.has(debt.personId));
}

function normalizeCheques(raw: unknown[], accountIds: Set<string>): Cheque[] {
  return raw
    .filter(isRec)
    .map((item) => ({
      id: asString(item.id) || createId('cheque'),
      direction: item.direction === 'received' ? 'received' : 'issued',
      number: asString(item.number),
      bank: asString(item.bank, 'بانک'),
      amountRial: Math.max(0, Math.round(asNumber(item.amountRial, 0))),
      issueJalali: toDateKey(item.issueJalali),
      dueJalali: toDateKey(item.dueJalali),
      counterparty: asString(item.counterparty, 'طرف حساب'),
      status: CHEQUE_STATUSES.includes(item.status as ChequeStatus) ? (item.status as ChequeStatus) : 'pending',
      note: typeof item.note === 'string' ? item.note : undefined,
      accountId: accountIds.has(asString(item.accountId)) ? asString(item.accountId) : undefined,
      txnId: typeof item.txnId === 'string' ? item.txnId : undefined,
      createdAt: toTimestamp(item.createdAt)
    }))
    .filter((cheque) => cheque.amountRial > 0);
}

function normalizeAssets(raw: unknown[]): Asset[] {
  return raw
    .filter(isRec)
    .map((item) => {
      const currentPriceRial = Math.max(0, Math.round(asNumber(item.currentPriceRial, 0)));
      const history = asArray(item.priceHistory)
        .filter(isRec)
        .map((point) => ({
          dateJalali: toDateKey(point.dateJalali),
          priceRial: Math.max(0, Math.round(asNumber(point.priceRial, 0)))
        }))
        .filter((point) => point.priceRial > 0);
      return {
        id: asString(item.id) || createId('asset'),
        symbol: asString(item.symbol, 'ASSET'),
        name: asString(item.name, 'دارایی'),
        class: ASSET_CLASSES.includes(item.class as AssetClass) ? (item.class as AssetClass) : 'manual',
        unit: asString(item.unit, 'واحد'),
        currentPriceRial,
        previousClosePriceRial: Math.max(0, Math.round(asNumber(item.previousClosePriceRial, currentPriceRial))),
        lastUpdatedJalali: toDateKey(item.lastUpdatedJalali),
        priceHistory:
          history.length > 0 ? history : [{ dateJalali: toDateKey(item.lastUpdatedJalali), priceRial: currentPriceRial }],
        source: item.source === 'market' ? 'market' : 'manual'
      } satisfies Asset;
    })
    .filter((asset) => asset.currentPriceRial >= 0);
}

function normalizeLots(raw: unknown[], assetIds: Set<string>, accountIds: Set<string>): InvestmentLot[] {
  return raw
    .filter(isRec)
    .map((item) => ({
      id: asString(item.id) || createId('lot'),
      assetId: asString(item.assetId),
      type: item.type === 'sell' ? 'sell' : 'buy',
      dateJalali: toDateKey(item.dateJalali),
      quantity: Math.max(0, asNumber(item.quantity, 0)),
      pricePerUnitRial: Math.max(0, Math.round(asNumber(item.pricePerUnitRial, 0))),
      feeRial: Math.max(0, Math.round(asNumber(item.feeRial, 0))),
      accountId: accountIds.has(asString(item.accountId)) ? asString(item.accountId) : undefined,
      txnId: typeof item.txnId === 'string' ? item.txnId : undefined,
      note: typeof item.note === 'string' ? item.note : undefined,
      createdAt: toTimestamp(item.createdAt)
    }))
    .filter((lot) => lot.quantity > 0 && assetIds.has(lot.assetId));
}

function normalizeGoals(raw: unknown[], accountIds: Set<string>): Goal[] {
  return raw
    .filter(isRec)
    .map((item) => ({
      id: asString(item.id) || createId('goal'),
      name: asString(item.name, 'هدف'),
      targetRial: Math.max(0, Math.round(asNumber(item.targetRial, 0))),
      savedRial: Math.max(0, Math.round(asNumber(item.savedRial, 0))),
      targetJalali: toDateKey(item.targetJalali),
      accountId: accountIds.has(asString(item.accountId)) ? asString(item.accountId) : undefined,
      icon: asString(item.icon, 'Target'),
      color: asString(item.color, '#0f766e')
    }))
    .filter((goal) => goal.targetRial > 0);
}

function normalizeBudgets(raw: unknown[], categoryIds: Set<string>): Budget[] {
  return raw
    .filter(isRec)
    .map((item) => ({
      id: asString(item.id) || createId('budget'),
      categoryId: asString(item.categoryId),
      amountRial: Math.max(0, Math.round(asNumber(item.amountRial, 0))),
      rollover: asBool(item.rollover, false)
    }))
    .filter((budget) => budget.amountRial > 0 && categoryIds.has(budget.categoryId));
}

function normalizeScenarios(raw: unknown[]): Scenario[] {
  return raw
    .filter(isRec)
    .map((item) => ({
      id: asString(item.id) || createId('scenario'),
      name: asString(item.name, 'سناریو'),
      description: asString(item.description),
      type: ['loan', 'skip_expense', 'income_boost', 'gold_dca'].includes(asString(item.type))
        ? (item.type as Scenario['type'])
        : 'gold_dca',
      active: asBool(item.active, false),
      monthlyDeltaRial: Math.round(asNumber(item.monthlyDeltaRial, 0)),
      oneTimeDeltaRial: Math.round(asNumber(item.oneTimeDeltaRial, 0)),
      startMonthOffset: Math.max(0, Math.round(asNumber(item.startMonthOffset, 0))),
      durationMonths: Math.max(1, Math.round(asNumber(item.durationMonths, 12)))
    }))
    .filter((scenario) => scenario.name.length > 0);
}

/**
 * Validates and normalizes an unknown persisted object into AppData.
 * Returns null when the payload is not a usable app snapshot.
 */
export function normalizeAppData(raw: unknown, options: { forceOnboarding?: boolean } = {}): AppData | null {
  if (!isRec(raw)) return null;
  const base = createBaseData();

  const categories = normalizeCategories(asArray(raw.categories));
  const safeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES.map((category) => ({ ...category }));
  const categoryIds = new Set(safeCategories.map((category) => category.id));

  const accounts = normalizeAccounts(asArray(raw.accounts));
  if (accounts.length === 0) return null;
  const accountIds = new Set(accounts.map((account) => account.id));
  const people = normalizePeople(asArray(raw.people));
  const peopleIds = new Set(people.map((person) => person.id));

  const loans = normalizeLoans(asArray(raw.loans), accountIds);
  const assets = normalizeAssets(asArray(raw.assets));
  const assetIds = new Set(assets.map((asset) => asset.id));

  let installments = normalizeInstallments(asArray(raw.installments), loans, accountIds);
  const transactions = normalizeTransactions(asArray(raw.transactions), accountIds, categoryIds);

  // Repair loan payments that lost their transaction link.
  const txnById = new Map(transactions.map((txn) => [txn.id, txn]));
  for (const installment of installments) {
    if (installment.paidTxnId && txnById.has(installment.paidTxnId)) continue;
    if (installment.paidAtJalali) {
      const loan = loans.find((item) => item.id === installment.loanId);
      if (!loan) continue;
      const linked = transactions.find(
        (txn) => txn.kind === 'loan' && txn.installmentId === installment.id
      );
      if (linked) {
        installment.paidTxnId = linked.id;
      } else {
        installment.paidTxnId = undefined;
        installment.paidAtJalali = undefined;
      }
    }
  }
  installments = installments.filter((installment) => {
    if (!installment.paidTxnId) return true;
    return txnById.has(installment.paidTxnId);
  });

  const debts = normalizeDebts(asArray(raw.debts), peopleIds, accountIds);
  const cheques = normalizeCheques(asArray(raw.cheques), accountIds);
  const lots = normalizeLots(asArray(raw.lots), assetIds, accountIds);
  const goals = normalizeGoals(asArray(raw.goals), accountIds);
  const budgets = normalizeBudgets(asArray(raw.budgets), categoryIds);
  const scenarios = normalizeScenarios(asArray(raw.scenarios));

  const settings = normalizeSettings(raw.settings);
  const hasContent = transactions.length > 0 || accounts.length > 1;
  if (options.forceOnboarding) settings.onboardingDone = false;
  else if (raw.settings === undefined) settings.onboardingDone = hasContent;

  return {
    schemaVersion: 2,
    settings,
    accounts,
    categories: safeCategories,
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
    demo: asBool(raw.demo, false),
    createdAt: toTimestamp(raw.createdAt),
    updatedAt: toTimestamp(raw.updatedAt)
  };
}

export const normalizerInternals = {
  toDateKey,
  toTimestamp,
  INSTALLMENT_STATUSES
};
