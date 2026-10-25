import { buildSchedule } from './amortization';
import { calculateXIRR } from './xirr';
import {
  compareJalali,
  diffJalaliDays,
  endOfJalaliMonth,
  formatJalali,
  jalaliMonthKey,
  jalaliToIso,
  jalaliToJdn,
  parseJalali,
  startOfJalaliMonth,
  todayJalali,
  type JalaliDate
} from './jalali';
import { computePortfolio, type PortfolioSummary } from './portfolio';
import type {
  Account,
  AppData,
  Asset,
  Budget,
  Category,
  Cheque,
  DebtEntry,
  DerivedAccount,
  Goal,
  InstallmentState,
  InvestmentLot,
  Loan,
  LoanInstallment,
  Person,
  Transaction,
  TransactionKind
} from './types';

export const UNCATEGORIZED_ID = '__uncategorized';
export const LOAN_INTEREST_ID = 'cat-loan-interest';

const kindDirection: Record<TransactionKind, 'in' | 'out' | 'none'> = {
  expense: 'out',
  income: 'in',
  transfer: 'none',
  investment: 'none',
  loan: 'none',
  debt: 'none'
};

/** Cash delta of a transaction on one account, in Rial. */
export function transactionDelta(txn: Transaction, accountId: string): number {
  const amount = Math.max(0, Math.trunc(txn.amountRial));
  const fee = Math.max(0, Math.trunc(txn.feeRial || 0));

  if (txn.kind === 'expense') {
    return txn.accountId === accountId ? -amount : 0;
  }
  if (txn.kind === 'income') {
    return txn.accountId === accountId ? amount : 0;
  }
  if (txn.kind === 'transfer') {
    if (txn.accountId === accountId) return -(amount + fee);
    if (txn.toAccountId === accountId) return amount;
    return 0;
  }

  const direction = txn.cashDirection ?? kindDirection[txn.kind];
  if (txn.accountId !== accountId) return 0;
  if (direction === 'in') return amount - fee;
  if (direction === 'out') return -(amount + fee);
  return 0;
}

export function deriveBalances(accounts: Account[], transactions: Transaction[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const account of accounts) balances.set(account.id, account.openingBalanceRial);
  for (const txn of transactions) {
    for (const [accountId, balance] of balances) {
      const delta = transactionDelta(txn, accountId);
      if (delta !== 0) balances.set(accountId, balance + delta);
    }
  }
  return new Map([...balances.entries()].map(([id, value]) => [id, Math.round(value)]));
}

export function deriveAccounts(accounts: Account[], transactions: Transaction[]): DerivedAccount[] {
  const balances = deriveBalances(accounts, transactions);
  return accounts.map((account) => ({ ...account, balanceRial: balances.get(account.id) ?? 0 }));
}

export function splitBreakdown(txn: Transaction): Array<{ categoryId: string; amountRial: number }> {
  if (txn.kind !== 'expense' && txn.kind !== 'income') return [];
  if (txn.splits && txn.splits.length > 0) {
    const rows = txn.splits.map((split) => ({
      categoryId: split.categoryId || UNCATEGORIZED_ID,
      amountRial: Math.max(0, split.amountRial)
    }));
    const splitTotal = rows.reduce((sum, row) => sum + row.amountRial, 0);
    const remainder = txn.amountRial - splitTotal;
    if (remainder !== 0) {
      rows.push({ categoryId: txn.categoryId ?? UNCATEGORIZED_ID, amountRial: remainder });
    }
    return rows;
  }
  return [{ categoryId: txn.categoryId ?? UNCATEGORIZED_ID, amountRial: txn.amountRial }];
}

/** Amount that belongs to expense/income reports for this transaction. */
export function reportableAmount(txn: Transaction, forKind: 'expense' | 'income'): number {
  if (forKind === 'expense') {
    if (txn.kind === 'expense') return txn.amountRial;
    if (txn.kind === 'loan') return Math.max(0, txn.loanInterestRial ?? 0);
    return 0;
  }
  if (txn.kind === 'income') return txn.amountRial;
  return 0;
}

export interface CategoryTotal {
  id: string;
  name: string;
  kind: 'expense' | 'income';
  color: string;
  icon: string;
  directRial: number;
  totalRial: number;
  percentOfTotal: number;
  children: CategoryTotal[];
  isUncategorized?: boolean;
}

export interface ReportFilter {
  kind: 'expense' | 'income';
  from?: JalaliDate | null;
  to?: JalaliDate | null;
  categoryIds?: string[];
  accountId?: string;
  personId?: string;
  tag?: string;
}

export function inDateRange(txn: Transaction, from?: JalaliDate | null, to?: JalaliDate | null): boolean {
  const date = parseJalali(txn.dateJalali);
  if (!date) return false;
  if (from && compareJalali(date, from) < 0) return false;
  if (to && compareJalali(date, to) > 0) return false;
  return true;
}

export function totalsForPeriod(transactions: Transaction[], from?: JalaliDate | null, to?: JalaliDate | null) {
  let incomeRial = 0;
  let expenseRial = 0;
  let loanInterestRial = 0;
  for (const txn of transactions) {
    if (!inDateRange(txn, from, to)) continue;
    if (txn.kind === 'income') incomeRial += txn.amountRial;
    if (txn.kind === 'expense') expenseRial += txn.amountRial;
    if (txn.kind === 'loan') loanInterestRial += Math.max(0, txn.loanInterestRial ?? 0);
  }
  const totalExpense = expenseRial + loanInterestRial;
  return {
    incomeRial,
    expenseRial: totalExpense,
    directExpenseRial: expenseRial,
    loanInterestRial,
    netRial: incomeRial - totalExpense,
    savingsRate: incomeRial > 0 ? ((incomeRial - totalExpense) / incomeRial) * 100 : 0
  };
}

/** Direct amounts per category for the report period. Parent rollup is done by buildCategoryTree. */
export function directCategoryTotals(
  transactions: Transaction[],
  categories: Category[],
  kind: 'expense' | 'income',
  from?: JalaliDate | null,
  to?: JalaliDate | null
): Map<string, number> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  for (const txn of transactions) {
    if (!inDateRange(txn, from, to)) continue;

    if (txn.kind === 'loan' && kind === 'expense') {
      const interest = Math.max(0, txn.loanInterestRial ?? 0);
      if (interest > 0) {
        const key = byId.has(LOAN_INTEREST_ID) ? LOAN_INTEREST_ID : UNCATEGORIZED_ID;
        totals.set(key, (totals.get(key) ?? 0) + interest);
      }
      continue;
    }

    if (txn.kind !== kind) continue;

    for (const row of splitBreakdown(txn)) {
      if (row.amountRial === 0) continue;
      const category = byId.get(row.categoryId);
      const key = category && category.kind === kind ? row.categoryId : UNCATEGORIZED_ID;
      totals.set(key, (totals.get(key) ?? 0) + row.amountRial);
    }
  }

  return totals;
}

export function buildCategoryTree(
  categories: Category[],
  direct: Map<string, number>,
  kind: 'expense' | 'income',
  total: number
): CategoryTotal[] {
  const relevant = categories.filter((category) => category.kind === kind && !category.archived);
  const byParent = new Map<string | null, Category[]>();
  for (const category of relevant) {
    const key = category.parentId;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }

  const build = (category: Category): CategoryTotal => {
    const children = (byParent.get(category.id) ?? [])
      .map(build)
      .filter((child) => child.totalRial !== 0)
      .sort((a, b) => b.totalRial - a.totalRial);
    const directRial = direct.get(category.id) ?? 0;
    const totalRial = directRial + children.reduce((sum, child) => sum + child.totalRial, 0);
    return {
      id: category.id,
      name: category.name,
      kind,
      color: category.color,
      icon: category.icon,
      directRial,
      totalRial,
      percentOfTotal: total > 0 ? (totalRial / total) * 100 : 0,
      children
    };
  };

  const roots = (byParent.get(null) ?? [])
    .map(build)
    .filter((node) => node.totalRial !== 0)
    .sort((a, b) => b.totalRial - a.totalRial);

  const uncategorized = direct.get(UNCATEGORIZED_ID) ?? 0;
  if (uncategorized !== 0) {
    roots.push({
      id: UNCATEGORIZED_ID,
      name: 'دسته‌بندی نشده',
      kind,
      color: '#94a3b8',
      icon: 'CircleHelp',
      directRial: uncategorized,
      totalRial: uncategorized,
      percentOfTotal: total > 0 ? (uncategorized / total) * 100 : 0,
      children: [],
      isUncategorized: true
    });
  }

  return roots;
}

export function categoryPath(categories: Category[], categoryId: string | undefined): Category[] {
  if (!categoryId) return [];
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: Category[] = [];
  let current = byId.get(categoryId);
  let guard = 0;
  while (current && guard < 20) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return path;
}

export function descendantIds(categories: Category[], categoryId: string): Set<string> {
  const ids = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function monthKeysBetween(from: JalaliDate, to: JalaliDate): string[] {
  const keys: string[] = [];
  let cursor: JalaliDate = { jy: from.jy, jm: from.jm, jd: 1 };
  for (let i = 0; i < 480; i += 1) {
    if (compareJalali(cursor, to) > 0) break;
    keys.push(jalaliMonthKey(cursor));
    cursor = cursor.jm === 12 ? { jy: cursor.jy + 1, jm: 1, jd: 1 } : { jy: cursor.jy, jm: cursor.jm + 1, jd: 1 };
  }
  return keys;
}

export function monthlySeries(
  transactions: Transaction[],
  months: string[],
  kind: 'expense' | 'income'
): Array<{ month: string; valueRial: number }> {
  const values = new Map(months.map((month) => [month, 0]));
  for (const txn of transactions) {
    const month = txn.dateJalali.slice(0, 7);
    if (!values.has(month)) continue;
    if (txn.kind === 'loan' && kind === 'expense') {
      values.set(month, (values.get(month) ?? 0) + Math.max(0, txn.loanInterestRial ?? 0));
      continue;
    }
    if (txn.kind === kind) values.set(month, (values.get(month) ?? 0) + txn.amountRial);
  }
  return months.map((month) => ({ month, valueRial: values.get(month) ?? 0 }));
}

export function periodPreset(preset: 'this_month' | 'last_month' | 'last_3' | 'this_year' | 'all', today = todayJalali()) {
  switch (preset) {
    case 'this_month':
      return { from: startOfJalaliMonth(today), to: today };
    case 'last_month': {
      const lastMonth: JalaliDate =
        today.jm === 1 ? { jy: today.jy - 1, jm: 12, jd: 1 } : { jy: today.jy, jm: today.jm - 1, jd: 1 };
      return { from: startOfJalaliMonth(lastMonth), to: endOfJalaliMonth(lastMonth) };
    }
    case 'last_3':
      return { from: startOfJalaliMonth(addMonths(today, -2)), to: today };
    case 'this_year':
      return { from: { jy: today.jy, jm: 1, jd: 1 }, to: today };
    case 'all':
    default:
      return { from: null, to: null };
  }
}

function addMonths(date: JalaliDate, months: number): JalaliDate {
  const total = date.jy * 12 + (date.jm - 1) + months;
  const jy = Math.floor(total / 12);
  const jm = (total % 12) + 1;
  return { jy, jm, jd: 1 };
}

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

export function installmentState(
  installment: LoanInstallment,
  loan: Loan | undefined,
  today = todayJalali()
): InstallmentState {
  const effectiveDueJalali = installment.deferredToJalali ?? installment.dueJalali;
  const due = parseJalali(effectiveDueJalali);
  let status: InstallmentState['status'];
  if (installment.paidTxnId) {
    status = 'paid';
  } else if (installment.deferredToJalali && due && diffJalaliDays(today, due) > 0) {
    status = 'deferred';
  } else if (!due) {
    status = 'upcoming';
  } else {
    const days = diffJalaliDays(today, due);
    status = days < 0 ? 'overdue' : days === 0 ? 'due' : 'upcoming';
  }
  return { ...installment, status, effectiveDueJalali };
}

export interface LoanSummary {
  loan: Loan;
  installments: InstallmentState[];
  paidCount: number;
  totalCount: number;
  overdueCount: number;
  remainingCount: number;
  paidAmountRial: number;
  remainingAmountRial: number;
  remainingPrincipalRial: number;
  paidInterestRial: number;
  remainingInterestRial: number;
  penaltyRial: number;
  progressPercent: number;
  nextDue: InstallmentState | null;
  payoffJalali: string | null;
  effectiveAnnualRate: number | null;
  totalScheduledRial: number;
}

export function summarizeLoan(
  loan: Loan,
  installments: LoanInstallment[],
  today = todayJalali()
): LoanSummary {
  const states = installments
    .filter((installment) => installment.loanId === loan.id)
    .map((installment) => installmentState(installment, loan, today))
    .sort((a, b) => a.number - b.number);

  const unpaid = states.filter((state) => state.status !== 'paid');
  const paid = states.filter((state) => state.status === 'paid');
  const remainingPrincipalRial = unpaid.reduce((sum, state) => sum + state.principalRial, 0);
  const paidAmountRial = paid.reduce((sum, state) => sum + state.amountRial, 0);
  const remainingAmountRial = unpaid.reduce((sum, state) => sum + state.amountRial, 0);
  const paidInterestRial = paid.reduce((sum, state) => sum + state.interestRial, 0);
  const remainingInterestRial = unpaid.reduce((sum, state) => sum + state.interestRial, 0);
  const penaltyRial = unpaid.reduce((sum, state) => {
    if (state.status !== 'overdue') return sum + state.penaltyRial;
    const due = parseJalali(state.effectiveDueJalali);
    if (!due) return sum + state.penaltyRial;
    const days = Math.abs(diffJalaliDays(today, due));
    const daily = loan.penaltyAnnualPercent / 100 / 365;
    return sum + state.penaltyRial + Math.round(state.amountRial * daily * days);
  }, 0);

  const nextDue = unpaid[0] ?? null;
  const lastUnpaid = unpaid[unpaid.length - 1];
  const totalCount = states.length || loan.installmentCount;
  const first = parseJalali(loan.disbursementJalali);
  const cashFlows = first
    ? [
        { amountRial: loan.principalRial - loan.totalFeeRial, date: jalaliToIso(first) },
        ...states.map((state) => {
          const due = parseJalali(state.dueJalali) ?? today;
          return { amountRial: -state.amountRial, date: jalaliToIso(due) };
        })
      ]
    : [];

  return {
    loan,
    installments: states,
    paidCount: paid.length,
    totalCount,
    overdueCount: unpaid.filter((state) => state.status === 'overdue').length,
    remainingCount: unpaid.length,
    paidAmountRial,
    remainingAmountRial,
    remainingPrincipalRial,
    paidInterestRial,
    remainingInterestRial,
    penaltyRial,
    progressPercent: totalCount > 0 ? (paid.length / totalCount) * 100 : 0,
    nextDue,
    payoffJalali: lastUnpaid?.effectiveDueJalali ?? null,
    effectiveAnnualRate: calculateXIRR(cashFlows),
    totalScheduledRial: states.reduce((sum, state) => sum + state.amountRial, 0)
  };
}

export function loanPreview(params: {
  principalRial: number;
  annualRatePercent: number;
  installmentCount: number;
  frequencyMonths: number;
  firstDueJalali: string;
}) {
  return buildSchedule({ ...params, model: 'reducing_balance' });
}

// ---------------------------------------------------------------------------
// Debts
// ---------------------------------------------------------------------------

export function debtSettledRial(debt: DebtEntry): number {
  return debt.settlements.reduce((sum, settlement) => sum + settlement.amountRial, 0);
}

export function debtOutstanding(debt: DebtEntry): number {
  if (debt.status === 'forgiven') return 0;
  return Math.max(0, debt.amountRial - debtSettledRial(debt));
}

export function debtBalanceForPerson(debts: DebtEntry[], personId: string): number {
  return debts
    .filter((debt) => debt.personId === personId && debt.status === 'active')
    .reduce((sum, debt) => {
      const outstanding = debtOutstanding(debt);
      return sum + (debt.direction === 'lent' ? outstanding : -outstanding);
    }, 0);
}

export interface PersonSummary {
  person: Person;
  balanceRial: number;
  lentRial: number;
  borrowedRial: number;
  overdueCount: number;
  activeCount: number;
  nextDue: DebtEntry | null;
}

export function summarizePerson(person: Person, debts: DebtEntry[], today = todayJalali()): PersonSummary {
  const personDebts = debts.filter((debt) => debt.personId === person.id && debt.status === 'active');
  const lentRial = personDebts
    .filter((debt) => debt.direction === 'lent')
    .reduce((sum, debt) => sum + debtOutstanding(debt), 0);
  const borrowedRial = personDebts
    .filter((debt) => debt.direction === 'borrowed')
    .reduce((sum, debt) => sum + debtOutstanding(debt), 0);
  const overdueCount = personDebts.filter((debt) => {
    const due = parseJalali(debt.dueJalali);
    return Boolean(due && diffJalaliDays(today, due) < 0);
  }).length;
  const withDue = personDebts
    .filter((debt) => Boolean(parseJalali(debt.dueJalali)))
    .sort((a, b) => (a.dueJalali ?? '').localeCompare(b.dueJalali ?? ''));
  return {
    person,
    balanceRial: lentRial - borrowedRial,
    lentRial,
    borrowedRial,
    overdueCount,
    activeCount: personDebts.length,
    nextDue: withDue[0] ?? null
  };
}

// ---------------------------------------------------------------------------
// Net worth & obligations
// ---------------------------------------------------------------------------

export interface NetWorthBreakdown {
  accountBalancesRial: number;
  portfolioValueRial: number;
  receivablesRial: number;
  totalAssetsRial: number;
  payablesRial: number;
  loanPrincipalRial: number;
  totalLiabilitiesRial: number;
  netWorthRial: number;
  liquidRial: number;
}

export function computeNetWorth(
  data: Pick<AppData, 'accounts' | 'transactions' | 'debts' | 'loans' | 'installments' | 'assets' | 'lots'>,
  today = todayJalali()
): NetWorthBreakdown {
  const balances = deriveBalances(data.accounts, data.transactions);
  let accountBalancesRial = 0;
  let liquidRial = 0;
  for (const account of data.accounts) {
    if (account.archived || !account.includeInNetWorth) continue;
    const balance = balances.get(account.id) ?? 0;
    accountBalancesRial += balance;
    if (['cash', 'bank', 'card', 'wallet', 'savings'].includes(account.type)) liquidRial += balance;
  }

  const portfolio = computePortfolio(data.assets, data.lots);
  const receivablesRial = data.debts
    .filter((debt) => debt.status === 'active' && debt.direction === 'lent')
    .reduce((sum, debt) => sum + debtOutstanding(debt), 0);
  const payablesRial = data.debts
    .filter((debt) => debt.status === 'active' && debt.direction === 'borrowed')
    .reduce((sum, debt) => sum + debtOutstanding(debt), 0);

  let loanPrincipalRial = 0;
  for (const installment of data.installments) {
    if (installment.paidTxnId) continue;
    const loan = data.loans.find((item) => item.id === installment.loanId);
    if (!loan || loan.status !== 'active') continue;
    loanPrincipalRial += installment.principalRial;
  }

  const totalAssetsRial = accountBalancesRial + portfolio.marketValueRial + receivablesRial;
  const totalLiabilitiesRial = payablesRial + loanPrincipalRial;

  return {
    accountBalancesRial,
    portfolioValueRial: portfolio.marketValueRial,
    receivablesRial,
    totalAssetsRial,
    payablesRial,
    loanPrincipalRial,
    totalLiabilitiesRial,
    netWorthRial: totalAssetsRial - totalLiabilitiesRial,
    liquidRial
  };
}

export type ObligationType = 'installment' | 'cheque' | 'debt';

export interface Obligation {
  id: string;
  type: ObligationType;
  title: string;
  subtitle: string;
  amountRial: number;
  dueJalali: string;
  days: number;
  status: 'overdue' | 'today' | 'upcoming';
  accountId?: string;
  refId: string;
  direction?: 'in' | 'out';
  penaltyRial?: number;
}

export function upcomingObligations(
  data: Pick<AppData, 'loans' | 'installments' | 'cheques' | 'debts' | 'people'>,
  options: { today?: JalaliDate; horizonDays?: number; includeOverdue?: boolean } = {}
): Obligation[] {
  const today = options.today ?? todayJalali();
  const horizonDays = options.horizonDays ?? 30;
  const includeOverdue = options.includeOverdue ?? true;
  const result: Obligation[] = [];

  for (const installment of data.installments) {
    if (installment.paidTxnId) continue;
    const loan = data.loans.find((item) => item.id === installment.loanId);
    if (!loan || loan.status !== 'active') continue;
    const state = installmentState(installment, loan, today);
    if (state.status === 'paid') continue;
    const due = parseJalali(state.effectiveDueJalali);
    if (!due) continue;
    const days = diffJalaliDays(today, due);
    if (!includeOverdue && days < 0) continue;
    if (days > horizonDays) continue;
    const penalty =
      days < 0 ? Math.round(installment.amountRial * (loan.penaltyAnnualPercent / 100 / 365) * -days) : 0;
    result.push({
      id: `inst-${installment.id}`,
      type: 'installment',
      title: `قسط ${formatJalaliNumber(installment.number)} ${loan.lender}`,
      subtitle: state.status === 'deferred' ? 'به تعویق افتاده' : state.status === 'overdue' ? 'معوق' : 'قسط وام',
      amountRial: installment.amountRial,
      dueJalali: state.effectiveDueJalali,
      days,
      status: days < 0 ? 'overdue' : days === 0 ? 'today' : 'upcoming',
      accountId: loan.accountId,
      refId: installment.id,
      direction: 'out',
      penaltyRial: penalty
    });
  }

  for (const cheque of data.cheques) {
    if (cheque.status !== 'pending') continue;
    const due = parseJalali(cheque.dueJalali);
    if (!due) continue;
    const days = diffJalaliDays(today, due);
    if (!includeOverdue && days < 0) continue;
    if (days > horizonDays) continue;
    result.push({
      id: `cheque-${cheque.id}`,
      type: 'cheque',
      title: `چک ${cheque.direction === 'issued' ? 'پرداختی به' : 'دریافتی از'} ${cheque.counterparty}`,
      subtitle: `${cheque.bank} · ${cheque.number}`,
      amountRial: cheque.amountRial,
      dueJalali: cheque.dueJalali,
      days,
      status: days < 0 ? 'overdue' : days === 0 ? 'today' : 'upcoming',
      accountId: cheque.accountId,
      refId: cheque.id,
      direction: cheque.direction === 'issued' ? 'out' : 'in'
    });
  }

  for (const debt of data.debts) {
    if (debt.status !== 'active') continue;
    const due = parseJalali(debt.dueJalali);
    if (!due) continue;
    const outstanding = debtOutstanding(debt);
    if (outstanding <= 0) continue;
    const days = diffJalaliDays(today, due);
    if (!includeOverdue && days < 0) continue;
    if (days > horizonDays) continue;
    const person = data.people.find((item) => item.id === debt.personId);
    result.push({
      id: `debt-${debt.id}`,
      type: 'debt',
      title: debt.direction === 'lent' ? `طلب از ${person?.name ?? 'شخص'}` : `بدهی به ${person?.name ?? 'شخص'}`,
      subtitle: debt.note ?? 'تسویه نشده',
      amountRial: outstanding,
      dueJalali: debt.dueJalali as string,
      days,
      status: days < 0 ? 'overdue' : days === 0 ? 'today' : 'upcoming',
      accountId: debt.accountId,
      refId: debt.id,
      direction: debt.direction === 'lent' ? 'in' : 'out'
    });
  }

  return result.sort((a, b) => a.days - b.days);
}

function formatJalaliNumber(value: number): string {
  return value.toLocaleString('fa-IR');
}

// ---------------------------------------------------------------------------
// People, search, budgets
// ---------------------------------------------------------------------------

export function sortedTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateCompare = b.dateJalali.localeCompare(a.dateJalali);
    if (dateCompare !== 0) return dateCompare;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterTransactions(
  transactions: Transaction[],
  filter: {
    query?: string;
    kind?: TransactionKind | 'all';
    accountId?: string;
    categoryIds?: Set<string>;
    tag?: string;
    from?: JalaliDate | null;
    to?: JalaliDate | null;
    personId?: string;
  }
): Transaction[] {
  const query = filter.query?.trim().toLowerCase();
  return transactions.filter((txn) => {
    if (filter.kind && filter.kind !== 'all' && txn.kind !== filter.kind) return false;
    if (filter.accountId && filter.accountId !== 'all') {
      if (txn.accountId !== filter.accountId && txn.toAccountId !== filter.accountId) return false;
    }
    if (filter.categoryIds && txn.categoryId && !filter.categoryIds.has(txn.categoryId)) {
      const inSplits = txn.splits?.some((split) => filter.categoryIds?.has(split.categoryId));
      if (!inSplits) return false;
    }
    if (filter.tag && !txn.tags.includes(filter.tag)) return false;
    if (filter.personId && txn.personId !== filter.personId) return false;
    if (!inDateRange(txn, filter.from, filter.to)) return false;
    if (query) {
      const haystack = [txn.note ?? '', ...txn.tags, txn.dateJalali].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function allTags(transactions: Transaction[]): string[] {
  return [...new Set(transactions.flatMap((txn) => txn.tags))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fa'));
}

export interface BudgetProgress {
  budget: Budget;
  category: Category | undefined;
  spentRial: number;
  percent: number;
  overRial: number;
  status: 'ok' | 'warning' | 'over';
}

export function budgetProgress(
  data: Pick<AppData, 'budgets' | 'categories' | 'transactions' | 'installments' | 'loans'>,
  month: JalaliDate = todayJalali()
): BudgetProgress[] {
  const from = startOfJalaliMonth(month);
  const to = endOfJalaliMonth(month);
  const direct = directCategoryTotals(data.transactions, data.categories, 'expense', from, to);
  return data.budgets.map((budget) => {
    const ids = descendantIds(data.categories, budget.categoryId);
    let spentRial = 0;
    for (const id of ids) spentRial += direct.get(id) ?? 0;
    const percent = budget.amountRial > 0 ? (spentRial / budget.amountRial) * 100 : 0;
    return {
      budget,
      category: data.categories.find((category) => category.id === budget.categoryId),
      spentRial,
      percent,
      overRial: Math.max(0, spentRial - budget.amountRial),
      status: percent >= 100 ? 'over' : percent >= 80 ? 'warning' : 'ok'
    };
  });
}

export interface MonthComparison {
  incomeRial: number;
  expenseRial: number;
  netRial: number;
  savingsRate: number;
  previousIncomeRial: number;
  previousExpenseRial: number;
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
}

export function monthComparison(transactions: Transaction[], today = todayJalali()): MonthComparison {
  const current = totalsForPeriod(transactions, startOfJalaliMonth(today), today);
  const previousMonth: JalaliDate =
    today.jm === 1 ? { jy: today.jy - 1, jm: 12, jd: 1 } : { jy: today.jy, jm: today.jm - 1, jd: 1 };
  const previous = totalsForPeriod(transactions, startOfJalaliMonth(previousMonth), endOfJalaliMonth(previousMonth));
  return {
    ...current,
    previousIncomeRial: previous.incomeRial,
    previousExpenseRial: previous.expenseRial,
    incomeChangePercent:
      previous.incomeRial > 0 ? ((current.incomeRial - previous.incomeRial) / previous.incomeRial) * 100 : null,
    expenseChangePercent:
      previous.expenseRial > 0 ? ((current.expenseRial - previous.expenseRial) / previous.expenseRial) * 100 : null
  };
}

export function spendingByWeekday(transactions: Transaction[], kind: 'expense' | 'income' = 'expense') {
  const totals = Array.from({ length: 7 }, () => 0);
  for (const txn of transactions) {
    if (txn.kind !== kind) continue;
    const date = parseJalali(txn.dateJalali);
    if (!date) continue;
    const index = ((jalaliToJdn(date) + 2) % 7 + 7) % 7;
    totals[index] = (totals[index] as number) + txn.amountRial;
  }
  return totals;
}

export function goalProgress(goal: Pick<Goal, 'targetRial' | 'savedRial' | 'targetJalali'>, today = todayJalali()) {
  const percent = goal.targetRial > 0 ? Math.min(100, (goal.savedRial / goal.targetRial) * 100) : 0;
  const target = parseJalali(goal.targetJalali);
  const monthsLeft = target
    ? Math.max(
        0,
        Math.ceil(
          (target.jy - today.jy) * 12 + (target.jm - today.jm) + (target.jd >= today.jd ? 0 : -1)
        )
      )
    : 0;
  const remainingRial = Math.max(0, goal.targetRial - goal.savedRial);
  const requiredMonthlyRial = monthsLeft > 0 ? Math.ceil(remainingRial / monthsLeft) : remainingRial;
  return { percent, monthsLeft, remainingRial, requiredMonthlyRial };
}

export function assetAllocationAssets(assets: Asset[], lots: InvestmentLot[]) {
  return computePortfolio(assets, lots);
}

export function sumByType(
  transactions: Transaction[],
  types: TransactionKind[],
  from?: JalaliDate | null,
  to?: JalaliDate | null
): number {
  return transactions
    .filter((txn) => types.includes(txn.kind) && inDateRange(txn, from, to))
    .reduce((sum, txn) => sum + txn.amountRial, 0);
}

export function chequeSummary(cheques: Cheque[]) {
  const pending = cheques.filter((cheque) => cheque.status === 'pending');
  return {
    issuedPendingRial: pending
      .filter((cheque) => cheque.direction === 'issued')
      .reduce((sum, cheque) => sum + cheque.amountRial, 0),
    receivedPendingRial: pending
      .filter((cheque) => cheque.direction === 'received')
      .reduce((sum, cheque) => sum + cheque.amountRial, 0),
    pendingCount: pending.length
  };
}

export function parsePeriodDates(from?: string | null, to?: string | null) {
  return {
    from: parseJalali(from ?? '') ?? null,
    to: parseJalali(to ?? '') ?? null
  };
}

export function monthGridSummary(
  data: Pick<AppData, 'transactions'>,
  month: JalaliDate
): Map<string, { incomeRial: number; expenseRial: number }> {
  const monthKey = jalaliMonthKey(month);
  const map = new Map<string, { incomeRial: number; expenseRial: number }>();
  for (const txn of data.transactions) {
    if (!txn.dateJalali.startsWith(monthKey)) continue;
    const entry = map.get(txn.dateJalali) ?? { incomeRial: 0, expenseRial: 0 };
    if (txn.kind === 'income') entry.incomeRial += txn.amountRial;
    if (txn.kind === 'expense') entry.expenseRial += txn.amountRial;
    if (txn.kind === 'loan') entry.expenseRial += Math.max(0, txn.loanInterestRial ?? 0);
    map.set(txn.dateJalali, entry);
  }
  return map;
}

export function daysUntil(dateJalali: string, today = todayJalali()): number | null {
  const due = parseJalali(dateJalali);
  return due ? diffJalaliDays(today, due) : null;
}

export function dateRangeLabel(from: JalaliDate | null, to: JalaliDate | null): string {
  if (!from && !to) return 'همه دوره‌ها';
  if (from && to) return `${formatJalali(from, 'short')} تا ${formatJalali(to, 'short')}`;
  if (from) return `از ${formatJalali(from, 'short')}`;
  return `تا ${formatJalali(to as JalaliDate, 'short')}`;
}
