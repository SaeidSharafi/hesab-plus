import {
  addJalaliDays,
  diffJalaliDays,
  endOfJalaliMonth,
  jalaliMonthDays,
  jalaliToIso,
  jalaliWeekday,
  parseJalali,
  startOfJalaliMonth,
  todayJalali,
  type JalaliDate
} from './jalali';
import { computeNetWorth, debtOutstanding, deriveBalances, splitBreakdown, totalsForPeriod } from './analytics';
import type {
  Account,
  AppData,
  Cheque,
  DebtEntry,
  Goal,
  Loan,
  LoanInstallment,
  Person,
  Scenario,
  Transaction
} from './types';

export interface ForecastInput {
  accounts: Account[];
  transactions: Transaction[];
  loans: Loan[];
  installments: LoanInstallment[];
  cheques: Cheque[];
  debts: DebtEntry[];
  people: Person[];
  scenarios: Scenario[];
  goals: Goal[];
  inflationPercent: number;
}

export type EventType = 'installment' | 'cheque' | 'debt' | 'salary' | 'baseline' | 'scenario';

export interface ForecastEvent {
  dateJalali: string;
  title: string;
  amountRial: number;
  direction: 'in' | 'out';
  type: EventType;
  accountId: string;
  refId?: string;
}

export interface ForecastPoint {
  offsetDays: number;
  dateJalali: string;
  isoDate: string;
  balanceRial: number;
  lowerRial: number;
  upperRial: number;
  realRial: number;
  inflowRial: number;
  outflowRial: number;
  baselineRial: number;
  events: ForecastEvent[];
  accountBalancesRial: Record<string, number>;
}

export interface Shortfall {
  offsetDays: number;
  dateJalali: string;
  accountId: string;
  accountName: string;
  amountRial: number;
  reason: string;
  suggestedAccountId?: string;
  suggestedAccountName?: string;
  suggestedAvailableRial?: number;
}

export interface GoalProjection {
  goal: Goal;
  percent: number;
  monthsLeft: number;
  requiredMonthlyRial: number;
  projectedSavedRial: number;
  onTrack: boolean;
}

export interface ForecastResult {
  points: ForecastPoint[];
  startBalanceRial: number;
  endBalanceRial: number;
  lowestBalanceRial: number;
  lowestPoint: ForecastPoint | null;
  shortfalls: Shortfall[];
  baselineMonthlyRial: number;
  baselineLowMonthlyRial: number;
  baselineHighMonthlyRial: number;
  salaryMonthlyRial: number;
  salaryPayday: number;
  monthIncomeProjectedRial: number;
  monthExpenseProjectedRial: number;
  endOfMonthSavingsRial: number;
  debtFreeJalali: string | null;
  averageMonthlyNetRial: number;
  goals: GoalProjection[];
}

const LIQUID_TYPES = new Set(['cash', 'bank', 'card', 'wallet', 'savings']);

function jalaliKey(date: JalaliDate): string {
  return `${date.jy}/${String(date.jm).padStart(2, '0')}/${String(date.jd).padStart(2, '0')}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
    : (sorted[mid] as number);
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next === undefined ? (sorted[base] as number) : (sorted[base] as number) + rest * (next - (sorted[base] as number));
}

function monthStartOffset(date: JalaliDate): number {
  return date.jy * 12 + (date.jm - 1);
}

function pickPrimaryAccount(
  accounts: Account[],
  transactions: Transaction[],
  kind: 'expense' | 'income'
): Account | undefined {
  const ids = new Set(accounts.map((account) => account.id));
  const counts = new Map<string, number>();
  for (const txn of transactions) {
    if (txn.kind !== kind || !ids.has(txn.accountId)) continue;
    counts.set(txn.accountId, (counts.get(txn.accountId) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked[0]) return accounts.find((account) => account.id === ranked[0]?.[0]);
  return accounts[0];
}

function historicalMonths(today: JalaliDate, count: number): JalaliDate[] {
  const months: JalaliDate[] = [];
  for (let i = count; i >= 1; i -= 1) {
    const total = today.jy * 12 + (today.jm - 1) - i;
    months.push({ jy: Math.floor(total / 12), jm: (total % 12) + 1, jd: 1 });
  }
  return months;
}

function keyOfMonth(date: JalaliDate): string {
  return `${date.jy}/${String(date.jm).padStart(2, '0')}`;
}

/**
 * Projects daily liquidity from three sources:
 *  - scheduled obligations (installments, cheques, debt promises),
 *  - historical baselines (median spend per category, median income),
 *  - active what-if scenarios.
 *
 * It never invents a default burn rate: an empty ledger produces a flat line.
 */
export function generateForecast(input: ForecastInput, horizonDays = 90, today = todayJalali()): ForecastResult {
  const days = Math.max(7, Math.min(730, Math.round(horizonDays)));
  const accounts = input.accounts.filter(
    (account) => !account.archived && account.includeInNetWorth && LIQUID_TYPES.has(account.type)
  );
  const balances = deriveBalances(input.accounts, input.transactions);
  const startAccountBalances: Record<string, number> = {};
  for (const account of accounts) startAccountBalances[account.id] = balances.get(account.id) ?? 0;
  const startBalanceRial = accounts.reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0);

  const spendingAccount = pickPrimaryAccount(accounts, input.transactions, 'expense') ?? accounts[0];
  const incomeAccount = pickPrimaryAccount(accounts, input.transactions, 'income') ?? spendingAccount;
  const fallbackAccountId = spendingAccount?.id ?? '';

  // Baseline spending: median of the last three complete months, per category.
  const history = historicalMonths(today, 3);
  const perCategoryMonths = new Map<string, number[]>();
  const incomeMonths = new Map<string, number>();
  const incomeDays: number[] = [];

  for (const month of history) {
    const mapKey = keyOfMonth(month);
    let income = 0;
    for (const txn of input.transactions) {
      if (!txn.dateJalali.startsWith(mapKey)) continue;
      if (txn.kind === 'income') {
        income += txn.amountRial;
        const date = parseJalali(txn.dateJalali);
        if (date) incomeDays.push(date.jd);
      }
      if (txn.kind !== 'expense') continue;
      for (const row of splitBreakdown(txn)) {
        const list = perCategoryMonths.get(row.categoryId) ?? [];
        const index = history.findIndex((item) => keyOfMonth(item) === mapKey);
        list[index] = (list[index] ?? 0) + row.amountRial;
        perCategoryMonths.set(row.categoryId, list);
      }
    }
    incomeMonths.set(mapKey, income);
  }

  // Ensure every category has a value for every month (missing = 0).
  for (const [categoryId, list] of perCategoryMonths) {
    const filled = history.map((_, index) => list[index] ?? 0);
    perCategoryMonths.set(categoryId, filled);
  }

  const categoryMedians = [...perCategoryMonths.values()].map((list) => median(list));
  const categoryLow = [...perCategoryMonths.values()].map((list) => quantile(list, 0.25));
  const categoryHigh = [...perCategoryMonths.values()].map((list) => quantile(list, 0.75));
  const baselineMonthlyRial = categoryMedians.reduce((sum, value) => sum + value, 0);
  const baselineLowMonthlyRial = categoryLow.reduce((sum, value) => sum + value, 0);
  const baselineHighMonthlyRial = categoryHigh.reduce((sum, value) => sum + value, 0);
  const spreadMonthlyRial = Math.max(0, baselineHighMonthlyRial - baselineLowMonthlyRial);

  const incomeValues = history.map((month) => incomeMonths.get(keyOfMonth(month)) ?? 0);
  const salaryMonthlyRial = median(incomeValues);
  const salaryPayday = incomeDays.length > 0 ? Math.min(29, Math.max(1, Math.round(median(incomeDays)))) : 30;

  // Scheduled events keyed by date.
  const eventsByDate = new Map<string, ForecastEvent[]>();
  const addEvent = (dateJalali: string, event: ForecastEvent) => {
    const list = eventsByDate.get(dateJalali) ?? [];
    list.push(event);
    eventsByDate.set(dateJalali, list);
  };
  const accountExists = (id?: string) => Boolean(id && accounts.some((account) => account.id === id));
  const todayKey = jalaliKey(today);

  const pushEvent = (dueJalali: string, event: ForecastEvent) => {
    const due = parseJalali(dueJalali);
    if (!due) return;
    const daysUntil = diffJalaliDays(today, due);
    if (daysUntil > days) return;
    const key = daysUntil < 0 ? todayKey : jalaliKey(due);
    addEvent(key, event);
  };

  for (const installment of input.installments) {
    if (installment.paidTxnId) continue;
    const loan = input.loans.find((item) => item.id === installment.loanId);
    if (!loan || loan.status !== 'active') continue;
    const due = parseJalali(installment.deferredToJalali ?? installment.dueJalali);
    if (!due) continue;
    const accountId = accountExists(loan.accountId) ? loan.accountId : fallbackAccountId;
    pushEvent(installment.deferredToJalali ?? installment.dueJalali, {
      dateJalali: installment.deferredToJalali ?? installment.dueJalali,
      title: `قسط ${installment.number} ${loan.lender}`,
      amountRial: installment.amountRial + installment.penaltyRial,
      direction: 'out',
      type: 'installment',
      accountId,
      refId: installment.id
    });
  }

  for (const cheque of input.cheques) {
    if (cheque.status !== 'pending') continue;
    const accountId = accountExists(cheque.accountId) ? (cheque.accountId as string) : fallbackAccountId;
    pushEvent(cheque.dueJalali, {
      dateJalali: cheque.dueJalali,
      title: `چک ${cheque.counterparty}`,
      amountRial: cheque.amountRial,
      direction: cheque.direction === 'issued' ? 'out' : 'in',
      type: 'cheque',
      accountId,
      refId: cheque.id
    });
  }

  for (const debt of input.debts) {
    if (debt.status !== 'active' || !debt.dueJalali) continue;
    const outstanding = debtOutstanding(debt);
    if (outstanding <= 0) continue;
    const person = input.people.find((item) => item.id === debt.personId);
    const accountId = accountExists(debt.accountId) ? (debt.accountId as string) : fallbackAccountId;
    pushEvent(debt.dueJalali, {
      dateJalali: debt.dueJalali,
      title:
        debt.direction === 'lent'
          ? `دریافت طلب از ${person?.name ?? 'شخص'}`
          : `پرداخت بدهی به ${person?.name ?? 'شخص'}`,
      amountRial: outstanding,
      direction: debt.direction === 'lent' ? 'in' : 'out',
      type: 'debt',
      accountId,
      refId: debt.id
    });
  }

  // Scenarios: monthly deltas and one-time amounts, on month boundaries.
  const currentMonthIndex = monthStartOffset(today);
  for (const scenario of input.scenarios) {
    if (!scenario.active) continue;
    const startIndex = currentMonthIndex + scenario.startMonthOffset;
    const duration = Math.max(1, scenario.durationMonths);
    for (let index = 0; index < duration; index += 1) {
      const monthIndex = startIndex + index;
      const jy = Math.floor(monthIndex / 12);
      const jm = (monthIndex % 12) + 1;
      let date: JalaliDate = { jy, jm, jd: 1 };
      if (monthIndex < currentMonthIndex) continue;
      if (monthIndex === currentMonthIndex && date.jd < today.jd) date = today;
      if (scenario.monthlyDeltaRial !== 0) {
        addEvent(jalaliKey(date), {
          dateJalali: jalaliKey(date),
          title: scenario.name,
          amountRial: Math.abs(scenario.monthlyDeltaRial),
          direction: scenario.monthlyDeltaRial >= 0 ? 'in' : 'out',
          type: 'scenario',
          accountId: fallbackAccountId,
          refId: scenario.id
        });
      }
    }
    if (scenario.oneTimeDeltaRial !== 0) {
      const jy = Math.floor(startIndex / 12);
      const jm = (startIndex % 12) + 1;
      const date: JalaliDate =
        startIndex < currentMonthIndex ? today : { jy, jm, jd: 1 };
      addEvent(jalaliKey(date), {
        dateJalali: jalaliKey(date),
        title: scenario.name,
        amountRial: Math.abs(scenario.oneTimeDeltaRial),
        direction: scenario.oneTimeDeltaRial >= 0 ? 'in' : 'out',
        type: 'scenario',
        accountId: fallbackAccountId,
        refId: scenario.id
      });
    }
  }

  // Salary baseline begins next month to avoid double-counting this month's actual salary.
  const currentMonthKey = keyOfMonth(today);
  const points: ForecastPoint[] = [];
  const shortfalls: Shortfall[] = [];
  const accountBalances: Record<string, number> = { ...startAccountBalances };
  let lowestBalanceRial = startBalanceRial;
  let lowestPoint: ForecastPoint | null = null;
  let monthIncomeProjectedRial = 0;
  let monthExpenseProjectedRial = 0;
  const actualMonth = totalsForPeriod(input.transactions, startOfJalaliMonth(today), today);
  const shortfallLastSeen = new Map<string, number>();
  const dailyInflation = Math.pow(1 + Math.max(0, input.inflationPercent) / 100, 1 / 365) - 1;

  for (let offset = 0; offset <= days; offset += 1) {
    const date = addJalaliDays(today, offset);
    const dateKey = jalaliKey(date);
    const events = [...(eventsByDate.get(dateKey) ?? [])];
    let inflow = 0;
    let outflow = 0;
    let baselineForDay = 0;

    // Baseline spending starts tomorrow; today's actuals are already in the ledger.
    if (offset > 0 && baselineMonthlyRial > 0) {
      const daysInMonth = jalaliMonthDays(date.jy, date.jm);
      const weekendFactor = [5, 6].includes(dayOfWeek(date)) ? 1.18 : 0.97;
      baselineForDay = Math.round((baselineMonthlyRial * weekendFactor) / daysInMonth);
      if (spendingAccount) {
        accountBalances[spendingAccount.id] = (accountBalances[spendingAccount.id] ?? 0) - baselineForDay;
        outflow += baselineForDay;
      }
    }

    // Salary every payday after today.
    if (offset > 0 && salaryMonthlyRial > 0 && date.jd === salaryPayday) {
      const accountId = incomeAccount?.id ?? fallbackAccountId;
      accountBalances[accountId] = (accountBalances[accountId] ?? 0) + salaryMonthlyRial;
      inflow += salaryMonthlyRial;
      events.push({
        dateJalali: dateKey,
        title: 'درآمد ماهانه (تخمینی)',
        amountRial: salaryMonthlyRial,
        direction: 'in',
        type: 'salary',
        accountId
      });
    }

    for (const event of events) {
      const amount = Math.max(0, Math.round(event.amountRial));
      if (event.direction === 'in') {
        accountBalances[event.accountId] = (accountBalances[event.accountId] ?? 0) + amount;
        inflow += amount;
      } else {
        accountBalances[event.accountId] = (accountBalances[event.accountId] ?? 0) - amount;
        outflow += amount;
      }
    }

    if (dateKey.startsWith(currentMonthKey)) {
      if (offset > 0) {
        monthIncomeProjectedRial += inflow;
        monthExpenseProjectedRial += outflow;
      }
    }

    const totalBalanceRial = accounts.reduce((sum, account) => sum + (accountBalances[account.id] ?? 0), 0);
    if (totalBalanceRial < lowestBalanceRial) {
      lowestBalanceRial = totalBalanceRial;
    }

    const uncertainty = baselineMonthlyRial > 0 ? spreadMonthlyRial * Math.sqrt(offset / 30) : 0;
    const point: ForecastPoint = {
      offsetDays: offset,
      dateJalali: dateKey,
      isoDate: jalaliToIso(date),
      balanceRial: Math.round(totalBalanceRial),
      lowerRial: Math.round(totalBalanceRial - uncertainty),
      upperRial: Math.round(totalBalanceRial + uncertainty),
      realRial: Math.round(totalBalanceRial / Math.pow(1 + dailyInflation, offset)),
      inflowRial: inflow,
      outflowRial: outflow,
      baselineRial: baselineForDay,
      events,
      accountBalancesRial: { ...accountBalances }
    };
    if (!lowestPoint || point.balanceRial < lowestPoint.balanceRial) lowestPoint = point;
    points.push(point);

    for (const account of accounts) {
      const balance = accountBalances[account.id] ?? 0;
      if (balance >= 0) {
        shortfallLastSeen.delete(account.id);
        continue;
      }
      const lastSeen = shortfallLastSeen.get(account.id);
      if (lastSeen !== undefined && offset - lastSeen < 7) continue;
      shortfallLastSeen.set(account.id, offset);
      const suggested = accounts
        .filter((item) => item.id !== account.id && (accountBalances[item.id] ?? 0) > Math.abs(balance))
        .sort((a, b) => (accountBalances[b.id] ?? 0) - (accountBalances[a.id] ?? 0))[0];
      const reason = events.length > 0 ? events.map((event) => event.title).join('، ') : 'هزینه‌های روزانه';
      shortfalls.push({
        offsetDays: offset,
        dateJalali: dateKey,
        accountId: account.id,
        accountName: account.name,
        amountRial: Math.abs(balance),
        reason,
        suggestedAccountId: suggested?.id,
        suggestedAccountName: suggested?.name,
        suggestedAvailableRial: suggested ? accountBalances[suggested.id] ?? 0 : undefined
      });
    }
  }

  // Debt-free date: latest unpaid installment.
  const unpaidInstallments = input.installments.filter((installment) => !installment.paidTxnId);
  let debtFreeJalali: string | null = null;
  for (const installment of unpaidInstallments) {
    const due = installment.deferredToJalali ?? installment.dueJalali;
    if (!debtFreeJalali || due.localeCompare(debtFreeJalali) > 0) debtFreeJalali = due;
  }

  // Historical net savings (median of the last three complete months) for goal pacing.
  const monthlyNets = history.map((month) => {
    const from = startOfJalaliMonth(month);
    const to = endOfJalaliMonth(month);
    const totals = totalsForPeriod(input.transactions, from, to);
    return totals.netRial;
  });
  const averageMonthlyNetRial = median(monthlyNets);

  const goalProjections: GoalProjection[] = input.goals.map((goal) => {
    const target = parseJalali(goal.targetJalali);
    const monthsLeft = target
      ? Math.max(0, (target.jy - today.jy) * 12 + (target.jm - today.jm) + (target.jd >= today.jd ? 0 : -1))
      : 0;
    const remaining = Math.max(0, goal.targetRial - goal.savedRial);
    const requiredMonthlyRial = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
    const projectedSavedRial = Math.max(
      goal.savedRial,
      goal.savedRial + Math.max(0, averageMonthlyNetRial) * monthsLeft
    );
    return {
      goal,
      percent: goal.targetRial > 0 ? Math.min(100, (goal.savedRial / goal.targetRial) * 100) : 0,
      monthsLeft,
      requiredMonthlyRial,
      projectedSavedRial: Math.round(projectedSavedRial),
      onTrack: projectedSavedRial >= goal.targetRial
    };
  });

  return {
    points,
    startBalanceRial,
    endBalanceRial: points[points.length - 1]?.balanceRial ?? startBalanceRial,
    lowestBalanceRial,
    lowestPoint,
    shortfalls,
    baselineMonthlyRial,
    baselineLowMonthlyRial,
    baselineHighMonthlyRial,
    salaryMonthlyRial,
    salaryPayday,
    monthIncomeProjectedRial,
    monthExpenseProjectedRial,
    endOfMonthSavingsRial: Math.round(
      actualMonth.incomeRial + monthIncomeProjectedRial - actualMonth.expenseRial - monthExpenseProjectedRial
    ),
    debtFreeJalali,
    averageMonthlyNetRial,
    goals: goalProjections
  };
}

function dayOfWeek(date: JalaliDate): number {
  return jalaliWeekday(date);
}

/** Convenience wrapper for a full AppData snapshot. */
export function forecastFromData(data: AppData, horizonDays = 90): ForecastResult {
  return generateForecast(
    {
      accounts: data.accounts,
      transactions: data.transactions,
      loans: data.loans,
      installments: data.installments,
      cheques: data.cheques,
      debts: data.debts,
      people: data.people,
      scenarios: data.scenarios,
      goals: data.goals,
      inflationPercent: data.settings.inflationPercent
    },
    horizonDays
  );
}

export function forecastNetWorth(data: AppData, daysAhead = 365): number {
  const forecast = forecastFromData(data, daysAhead);
  const last = forecast.points[forecast.points.length - 1];
  const netWorth = computeNetWorth(data);
  return netWorth.netWorthRial + (last ? last.balanceRial - forecast.startBalanceRial : 0);
}
