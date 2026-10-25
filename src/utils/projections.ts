import { Account, Cheque, DebtEntry, LoanInstallment, Scenario, Transaction } from '../types';
import { addJalaliMonths, daysBetweenJalali, getTodayJalali, parseJalali } from './jalali';

export interface DayForecastPoint {
  dayOffset: number;
  jalaliDate: string;
  projectedBalanceRial: number;
  lowerBandRial: number; // p25
  upperBandRial: number; // p75
  realTermsBalanceRial: number; // Deflated for inflation
  inflowRial: number;
  outflowRial: number;
  shortfallAmountRial: number;
  events: string[];
}

export interface ShortfallAlert {
  dayOffset: number;
  jalaliDate: string;
  accountId: string;
  accountName: string;
  projectedShortfallRial: number;
  suggestedSourceAccountId?: string;
  suggestedSourceAccountName?: string;
  suggestedSourceAvailableRial?: number;
  reason: string;
}

/**
 * Projects daily cash flow and liquidity over specified horizon (30 to 365 days)
 */
export function generateCashFlowForecast(
  accounts: Account[],
  transactions: Transaction[],
  installments: LoanInstallment[],
  cheques: Cheque[],
  debts: DebtEntry[],
  scenarios: Scenario[],
  horizonDays: number = 90,
  annualInflationPercent: number = 38
): {
  points: DayForecastPoint[];
  lowestBalanceRial: number;
  lowestPointDate: string;
  shortfalls: ShortfallAlert[];
  endOfMonthProjectedSavingsRial: number;
  debtFreeDateJalali: string | null;
} {
  // Total initial liquid balance (cash, bank, card, wallet)
  const liquidAccounts = accounts.filter(a => ['cash', 'bank', 'card', 'wallet'].includes(a.type));
  let runningTotalLiquid = liquidAccounts.reduce((sum, a) => sum + a.balance, 0);

  // Calculate historical monthly average burn rate (variable expenses)
  const pastExpenses = transactions.filter(t => t.kind === 'expense');
  const past30DaysExpense = pastExpenses.reduce((sum, t) => sum + t.amount, 0);
  const baselineDailyExpense = past30DaysExpense > 0 ? Math.round(past30DaysExpense / 30) : 15000000; // ~1.5M Toman/day default if empty

  // Calculate historical recurring income (e.g. salary)
  const pastIncomes = transactions.filter(t => t.kind === 'income');
  const monthlySalaryEstimate = pastIncomes.length > 0 ? Math.round(pastIncomes.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, pastIncomes.length)) : 350000000; // 35M Toman

  const todayJalali = getTodayJalali();
  const { jd } = parseJalali(todayJalali);

  const points: DayForecastPoint[] = [];
  const shortfalls: ShortfallAlert[] = [];
  let lowestBalanceRial = runningTotalLiquid;
  let lowestPointDate = todayJalali;

  // Track active scenarios
  const activeScenarios = scenarios.filter(s => s.active);
  const scenarioMonthlyDelta = activeScenarios.reduce((sum, s) => sum + s.deltaMonthlyRial, 0);
  const scenarioOneTimeDelta = activeScenarios.reduce((sum, s) => sum + s.deltaOneTimeRial, 0);

  let currentBalance = runningTotalLiquid + scenarioOneTimeDelta;
  let runningMonthInflow = 0;
  let runningMonthOutflow = 0;

  // Inflation daily discount factor: (1 + i)^(1/365)
  const dailyInflationRate = Math.pow(1 + annualInflationPercent / 100, 1 / 365) - 1;

  for (let day = 0; day <= horizonDays; day++) {
    // Jalali date calculation for offset
    const dayJalali = day === 0 ? todayJalali : addJalaliMonths(todayJalali, Math.floor(day / 30));
    const events: string[] = [];
    let dayInflow = 0;
    let dayOutflow = 0;

    // Check for monthly recurring salary on day 28-30
    if ((day + jd) % 30 === 28) {
      const salaryAmount = monthlySalaryEstimate;
      dayInflow += salaryAmount;
      events.push(`واریز حقوق تخمینی (${Math.round(salaryAmount / 10000000)} م.ت)`);
    }

    // Baseline statistical spending (Engine B) with small daily variation
    const dailySpend = Math.round(baselineDailyExpense * (0.9 + (day % 7 === 5 || day % 7 === 6 ? 0.3 : 0))); // More on weekends
    dayOutflow += dailySpend;

    // Check scheduled obligations (Engine A)
    // 1. Loan installments due
    const dueInstallments = installments.filter(inst => {
      if (inst.status !== 'paid' && inst.status !== 'deferred') {
        const diff = daysBetweenJalali(todayJalali, inst.jalaliDueDate);
        return diff === day;
      }
      return false;
    });

    for (const inst of dueInstallments) {
      dayOutflow += inst.amount;
      events.push(`سررسید قسط وام (${Math.round(inst.amount / 10000000)} م.ت)`);
    }

    // 2. Cheques due
    const dueCheques = cheques.filter(ch => {
      if (ch.status === 'pending') {
        const diff = daysBetweenJalali(todayJalali, ch.jalaliDueDate);
        return diff === day;
      }
      return false;
    });

    for (const ch of dueCheques) {
      if (ch.direction === 'issued') {
        dayOutflow += ch.amount;
        events.push(`پاس شدن چک صادر شده (${Math.round(ch.amount / 10000000)} م.ت)`);
      } else {
        dayInflow += ch.amount;
        events.push(`وصول چک دریافتی (${Math.round(ch.amount / 10000000)} م.ت)`);
      }
    }

    // 3. Debts promised due dates
    const dueDebts = debts.filter(d => {
      if (d.status === 'active' && d.jalaliDueDate) {
        const diff = daysBetweenJalali(todayJalali, d.jalaliDueDate);
        return diff === day;
      }
      return false;
    });

    for (const d of dueDebts) {
      if (d.direction === 'lent') {
        dayInflow += d.amountRial;
        events.push(`سررسید وصول طلب از شخص (${Math.round(d.amountRial / 10000000)} م.ت)`);
      } else {
        dayOutflow += d.amountRial;
        events.push(`سررسید پرداخت بدهی به شخص (${Math.round(d.amountRial / 10000000)} م.ت)`);
      }
    }

    // Scenario monthly impact spread across days
    if (scenarioMonthlyDelta !== 0) {
      const dailyScenarioImpact = Math.round(scenarioMonthlyDelta / 30);
      if (dailyScenarioImpact > 0) {
        dayInflow += dailyScenarioImpact;
      } else {
        dayOutflow += Math.abs(dailyScenarioImpact);
      }
    }

    currentBalance = currentBalance + dayInflow - dayOutflow;

    if (day <= 30) {
      runningMonthInflow += dayInflow;
      runningMonthOutflow += dayOutflow;
    }

    if (currentBalance < lowestBalanceRial) {
      lowestBalanceRial = currentBalance;
      lowestPointDate = dayJalali;
    }

    // Check shortfall
    let shortfall = 0;
    if (currentBalance < 0) {
      shortfall = Math.abs(currentBalance);
      if (events.length > 0) {
        shortfalls.push({
          dayOffset: day,
          jalaliDate: dayJalali,
          accountId: liquidAccounts[0]?.id || 'acc-1',
          accountName: liquidAccounts[0]?.name || 'حساب اصلی',
          projectedShortfallRial: shortfall,
          suggestedSourceAccountId: accounts.find(a => a.type === 'savings' && a.balance > shortfall)?.id,
          suggestedSourceAccountName: accounts.find(a => a.type === 'savings' && a.balance > shortfall)?.name,
          suggestedSourceAvailableRial: accounts.find(a => a.type === 'savings' && a.balance > shortfall)?.balance,
          reason: events.join('، ')
        });
      }
    }

    // Uncertainty band increases with time (p25 to p75)
    const uncertaintySpread = Math.round(dailySpend * Math.sqrt(day + 1) * 2.5);
    const realTermsBalance = Math.round(currentBalance / Math.pow(1 + dailyInflationRate, day));

    points.push({
      dayOffset: day,
      jalaliDate: dayJalali,
      projectedBalanceRial: currentBalance,
      lowerBandRial: currentBalance - uncertaintySpread,
      upperBandRial: currentBalance + uncertaintySpread,
      realTermsBalanceRial: realTermsBalance,
      inflowRial: dayInflow,
      outflowRial: dayOutflow,
      shortfallAmountRial: shortfall,
      events
    });
  }

  // Debt-free date: find latest unpaid loan installment
  const unpaidInstallments = installments.filter(i => i.status !== 'paid');
  let debtFreeDateJalali: string | null = null;
  if (unpaidInstallments.length > 0) {
    const latest = unpaidInstallments.reduce((max, inst) => 
      inst.jalaliDueDate > max ? inst.jalaliDueDate : max, unpaidInstallments[0].jalaliDueDate
    );
    debtFreeDateJalali = latest;
  }

  return {
    points,
    lowestBalanceRial,
    lowestPointDate,
    shortfalls,
    endOfMonthProjectedSavingsRial: runningMonthInflow - runningMonthOutflow,
    debtFreeDateJalali
  };
}
