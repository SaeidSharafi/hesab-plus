import { addJalaliMonths, isSameJalaliDay, parseJalali, type JalaliDate } from './jalali';
import type { InterestModel } from './types';

export interface ScheduleRow {
  number: number;
  dueJalali: string;
  amountRial: number;
  principalRial: number;
  interestRial: number;
  remainingPrincipalRial: number;
}

export interface AmortizationResult {
  rows: ScheduleRow[];
  installmentRial: number;
  totalPaymentRial: number;
  totalPrincipalRial: number;
  totalInterestRial: number;
}

export interface AmortizationInput {
  principalRial: number;
  annualRatePercent: number;
  installmentCount: number;
  frequencyMonths: number;
  firstDueJalali: string;
  model: InterestModel;
  customRows?: Array<{ dueJalali: string; amountRial: number; principalRial: number; interestRial: number }>;
}

function parseDateOrThrow(input: string): JalaliDate {
  const parsed = parseJalali(input);
  if (!parsed) throw new RangeError(`Invalid Jalali date: ${input}`);
  return parsed;
}

function dueDate(first: JalaliDate, offsetMonths: number): string {
  const next = addJalaliMonths(first, offsetMonths);
  return `${next.jy}/${String(next.jm).padStart(2, '0')}/${String(next.jd).padStart(2, '0')}`;
}

export function assertLoanInput(input: AmortizationInput): void {
  if (!Number.isFinite(input.principalRial) || input.principalRial <= 0) {
    throw new RangeError('Loan principal must be positive');
  }
  if (!Number.isInteger(input.installmentCount) || input.installmentCount < 1 || input.installmentCount > 600) {
    throw new RangeError('Installment count must be between 1 and 600');
  }
  if (!Number.isInteger(input.frequencyMonths) || input.frequencyMonths < 1 || input.frequencyMonths > 12) {
    throw new RangeError('Frequency must be between 1 and 12 months');
  }
  if (!Number.isFinite(input.annualRatePercent) || input.annualRatePercent < 0 || input.annualRatePercent > 200) {
    throw new RangeError('Rate must be between 0 and 200');
  }
  parseDateOrThrow(input.firstDueJalali);
}

/**
 * Builds an amortization schedule.
 *
 * - reducing_balance: equal payments (PMT), interest on the remaining balance.
 * - flat_rate: interest computed once on the full principal and split evenly.
 * - qard_hasan: equal principal, no interest.
 * - custom: caller-provided rows (Iranian bank tables often do not match a formula).
 *
 * Rounding is adjusted on the last row so principal always sums exactly to the loan.
 */
export function buildSchedule(input: AmortizationInput): AmortizationResult {
  assertLoanInput(input);
  const { principalRial, annualRatePercent, installmentCount, frequencyMonths, model } = input;
  const first = parseDateOrThrow(input.firstDueJalali);

  if (model === 'custom') {
    const custom = input.customRows ?? [];
    if (custom.length === 0) throw new RangeError('Custom schedules require rows');
    let remaining = principalRial;
    let totalInterest = 0;
    const rows: ScheduleRow[] = custom.map((row, index) => {
      const principal = Math.min(Math.max(0, Math.round(row.principalRial)), remaining);
      remaining -= principal;
      const interest = Math.max(0, Math.round(row.interestRial));
      totalInterest += interest;
      return {
        number: index + 1,
        dueJalali: (parseJalali(row.dueJalali) ? row.dueJalali : dueDate(first, index * frequencyMonths)),
        amountRial: Math.max(0, Math.round(row.amountRial)) || principal + interest,
        principalRial: principal,
        interestRial: interest,
        remainingPrincipalRial: remaining
      };
    });
    return {
      rows,
      installmentRial: rows[0]?.amountRial ?? 0,
      totalPaymentRial: principalRial - remaining + totalInterest,
      totalPrincipalRial: principalRial - remaining,
      totalInterestRial: totalInterest
    };
  }

  const rows: ScheduleRow[] = [];
  let remaining = principalRial;
  let totalInterest = 0;

  if (model === 'flat_rate') {
    const years = (installmentCount * frequencyMonths) / 12;
    const totalInterestRial = Math.round(principalRial * (annualRatePercent / 100) * years);
    const basePrincipal = Math.floor(principalRial / installmentCount);
    const baseInterest = Math.floor(totalInterestRial / installmentCount);

    for (let index = 0; index < installmentCount; index += 1) {
      const isLast = index === installmentCount - 1;
      const principal = isLast ? remaining : Math.min(basePrincipal, remaining);
      const interest = isLast ? totalInterestRial - baseInterest * (installmentCount - 1) : baseInterest;
      remaining = Math.max(0, remaining - principal);
      totalInterest += interest;
      rows.push({
        number: index + 1,
        dueJalali: dueDate(first, index * frequencyMonths),
        amountRial: principal + interest,
        principalRial: principal,
        interestRial: interest,
        remainingPrincipalRial: remaining
      });
    }
  } else if (model === 'qard_hasan') {
    const basePrincipal = Math.floor(principalRial / installmentCount);
    for (let index = 0; index < installmentCount; index += 1) {
      const isLast = index === installmentCount - 1;
      const principal = isLast ? remaining : Math.min(basePrincipal, remaining);
      remaining = Math.max(0, remaining - principal);
      rows.push({
        number: index + 1,
        dueJalali: dueDate(first, index * frequencyMonths),
        amountRial: principal,
        principalRial: principal,
        interestRial: 0,
        remainingPrincipalRial: remaining
      });
    }
  } else {
    // reducing balance / annuity
    const periodicRate = (annualRatePercent / 100) * (frequencyMonths / 12);
    const payment =
      periodicRate === 0
        ? Math.round(principalRial / installmentCount)
        : Math.round((principalRial * periodicRate) / (1 - Math.pow(1 + periodicRate, -installmentCount)));

    for (let index = 0; index < installmentCount; index += 1) {
      const isLast = index === installmentCount - 1;
      const interest = Math.round(remaining * periodicRate);
      const principal = isLast ? remaining : Math.max(0, Math.min(payment - interest, remaining));
      remaining = Math.max(0, remaining - principal);
      totalInterest += interest;
      rows.push({
        number: index + 1,
        dueJalali: dueDate(first, index * frequencyMonths),
        amountRial: principal + interest,
        principalRial: principal,
        interestRial: interest,
        remainingPrincipalRial: remaining
      });
    }
  }

  return {
    rows,
    installmentRial: rows[0]?.amountRial ?? 0,
    totalPaymentRial: principalRial + totalInterest,
    totalPrincipalRial: principalRial,
    totalInterestRial: totalInterest
  };
}

export interface EarlyPayoffResult {
  interestSavedRial: number;
  newInstallmentsCount: number;
  monthsSaved: number;
  newPayoffJalali: string | null;
}

/**
 * Estimates savings from an extra principal payment, keeping the same installment.
 * Only reducing-balance loans can genuinely save interest; flat-rate and qard
 * schedules are reported as zero so the UI never invents savings.
 */
export function calculateEarlyPayoff(params: {
  remainingPrincipalRial: number;
  annualRatePercent: number;
  remainingInstallments: number;
  extraPaymentRial: number;
  model: InterestModel;
  firstUnpaidDueJalali: string;
}): EarlyPayoffResult {
  const {
    remainingPrincipalRial,
    annualRatePercent,
    remainingInstallments,
    extraPaymentRial,
    model,
    firstUnpaidDueJalali
  } = params;

  const noSaving: EarlyPayoffResult = {
    interestSavedRial: 0,
    newInstallmentsCount: remainingInstallments,
    monthsSaved: 0,
    newPayoffJalali: null
  };

  if (
    extraPaymentRial <= 0 ||
    remainingPrincipalRial <= 0 ||
    remainingInstallments <= 0 ||
    annualRatePercent <= 0 ||
    model !== 'reducing_balance'
  ) {
    return noSaving;
  }

  const rate = annualRatePercent / 100 / 12;
  const payment =
    (remainingPrincipalRial * rate) / (1 - Math.pow(1 + rate, -remainingInstallments));
  const originalInterest = payment * remainingInstallments - remainingPrincipalRial;
  const newPrincipal = remainingPrincipalRial - Math.min(extraPaymentRial, remainingPrincipalRial);

  if (newPrincipal <= 0) {
    return {
      interestSavedRial: Math.round(originalInterest),
      newInstallmentsCount: 0,
      monthsSaved: remainingInstallments,
      newPayoffJalali: null
    };
  }

  const ratio = (newPrincipal * rate) / payment;
  const months = ratio >= 1 ? remainingInstallments : Math.ceil(-Math.log(1 - ratio) / Math.log(1 + rate));
  const newCount = Math.max(1, Math.min(months, remainingInstallments));
  const newInterest = Math.max(0, newCount * payment - newPrincipal);
  const saved = Math.max(0, originalInterest - newInterest);
  const payoff = addJalaliMonths(parseDateOrThrow(firstUnpaidDueJalali), Math.max(0, newCount - 1));

  return {
    interestSavedRial: Math.round(saved),
    newInstallmentsCount: newCount,
    monthsSaved: Math.max(0, remainingInstallments - newCount),
    newPayoffJalali: `${payoff.jy}/${String(payoff.jm).padStart(2, '0')}/${String(payoff.jd).padStart(2, '0')}`
  };
}

/** Late-payment penalty (جریمه دیرکرد) accrued on an overdue amount. */
export function calculatePenalty(
  overdueAmountRial: number,
  daysOverdue: number,
  annualPenaltyPercent = 6
): number {
  if (overdueAmountRial <= 0 || daysOverdue <= 0 || annualPenaltyPercent <= 0) return 0;
  const dailyRate = annualPenaltyPercent / 100 / 365;
  return Math.round(overdueAmountRial * dailyRate * daysOverdue);
}

/** Compares two Jalali date strings. Exported here for schedule consumers. */
export function isSameDueDate(a: string, b: string): boolean {
  const da = parseJalali(a);
  const db = parseJalali(b);
  return Boolean(da && db && isSameJalaliDay(da, db));
}
