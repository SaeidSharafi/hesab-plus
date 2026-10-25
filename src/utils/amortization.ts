import { InterestModel, LoanInstallment } from '../types';
import { addJalaliMonths } from './jalali';

export interface AmortizationScheduleRow {
  installmentNumber: number;
  jalaliDueDate: string;
  paymentAmount: number;
  principalPart: number;
  interestPart: number;
  remainingPrincipal: number;
}

/**
 * Calculates amortization schedule for different Iranian loan models
 */
export function generateAmortizationSchedule(
  principalRial: number,
  annualRatePercent: number,
  installmentCount: number,
  firstDueJalaliDate: string,
  model: InterestModel,
  loanId: string = 'new-loan'
): { schedule: AmortizationScheduleRow[]; monthlyInstallment: number; totalPayment: number; totalInterest: number } {
  const schedule: AmortizationScheduleRow[] = [];
  let remaining = principalRial;
  let monthlyInstallment = 0;
  let totalInterest = 0;

  if (model === 'reducing_balance') {
    // Annuity formula PMT = P * r / (1 - (1+r)^-n)
    const monthlyRate = (annualRatePercent / 100) / 12;
    if (monthlyRate === 0) {
      monthlyInstallment = Math.round(principalRial / installmentCount);
    } else {
      monthlyInstallment = Math.round(
        (principalRial * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -installmentCount))
      );
    }

    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = addJalaliMonths(firstDueJalaliDate, i - 1);
      const interestPart = Math.round(remaining * monthlyRate);
      let principalPart = monthlyInstallment - interestPart;

      if (i === installmentCount || principalPart > remaining) {
        principalPart = remaining;
        monthlyInstallment = principalPart + interestPart;
      }

      remaining = Math.max(0, remaining - principalPart);
      totalInterest += interestPart;

      schedule.push({
        installmentNumber: i,
        jalaliDueDate: dueDate,
        paymentAmount: principalPart + interestPart,
        principalPart,
        interestPart,
        remainingPrincipal: remaining
      });
    }
  } else if (model === 'flat_rate') {
    // Flat rate formula common in Iranian BNPL and merchant credit
    const years = installmentCount / 12;
    totalInterest = Math.round(principalRial * (annualRatePercent / 100) * years);
    const totalPayment = principalRial + totalInterest;
    monthlyInstallment = Math.round(totalPayment / installmentCount);
    const principalPerMonth = Math.round(principalRial / installmentCount);
    const interestPerMonth = monthlyInstallment - principalPerMonth;

    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = addJalaliMonths(firstDueJalaliDate, i - 1);
      const pPart = (i === installmentCount) ? remaining : principalPerMonth;
      remaining = Math.max(0, remaining - pPart);

      schedule.push({
        installmentNumber: i,
        jalaliDueDate: dueDate,
        paymentAmount: monthlyInstallment,
        principalPart: pPart,
        interestPart: interestPerMonth,
        remainingPrincipal: remaining
      });
    }
  } else {
    // 0% Qard al-Hasan
    monthlyInstallment = Math.round(principalRial / installmentCount);
    totalInterest = 0;

    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = addJalaliMonths(firstDueJalaliDate, i - 1);
      const pPart = (i === installmentCount) ? remaining : monthlyInstallment;
      remaining = Math.max(0, remaining - pPart);

      schedule.push({
        installmentNumber: i,
        jalaliDueDate: dueDate,
        paymentAmount: pPart,
        principalPart: pPart,
        interestPart: 0,
        remainingPrincipal: remaining
      });
    }
  }

  const totalPayment = principalRial + totalInterest;
  return { schedule, monthlyInstallment, totalPayment, totalInterest };
}

/**
 * Early Payoff Calculator
 * Computes how much interest and months are saved if extra principal is paid now
 */
export function calculateEarlyPayoffSavings(
  remainingPrincipalRial: number,
  annualRatePercent: number,
  remainingInstallmentsCount: number,
  extraPaymentRial: number
): {
  interestSavedRial: number;
  newInstallmentsCount: number;
  monthsSaved: number;
} {
  if (extraPaymentRial <= 0 || remainingPrincipalRial <= 0) {
    return { interestSavedRial: 0, newInstallmentsCount: remainingInstallmentsCount, monthsSaved: 0 };
  }

  const monthlyRate = (annualRatePercent / 100) / 12;
  const originalMonthlyPayment = (remainingPrincipalRial * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingInstallmentsCount));
  const originalTotalRemaining = originalMonthlyPayment * remainingInstallmentsCount;
  const originalInterest = originalTotalRemaining - remainingPrincipalRial;

  const newPrincipal = Math.max(0, remainingPrincipalRial - extraPaymentRial);
  if (newPrincipal === 0) {
    return {
      interestSavedRial: Math.round(originalInterest),
      newInstallmentsCount: 0,
      monthsSaved: remainingInstallmentsCount
    };
  }

  // Recalculate months needed with the same monthly installment
  const newN = Math.ceil(
    -Math.log(1 - (newPrincipal * monthlyRate) / originalMonthlyPayment) / Math.log(1 + monthlyRate)
  );
  const clampedN = Math.min(newN, remainingInstallmentsCount);
  const newTotalPayments = clampedN * originalMonthlyPayment;
  const newInterest = Math.max(0, newTotalPayments - newPrincipal);
  const interestSaved = Math.max(0, originalInterest - newInterest);

  return {
    interestSavedRial: Math.round(interestSaved),
    newInstallmentsCount: clampedN,
    monthsSaved: Math.max(0, remainingInstallmentsCount - clampedN)
  };
}

/**
 * Calculates late penalty (جریمه دیرکرد)
 * Usually 6% additional annual penalty on overdue amount per day
 */
export function calculateOverduePenalty(
  overdueAmountRial: number,
  daysOverdue: number,
  annualPenaltyPercent: number = 6
): number {
  if (daysOverdue <= 0) return 0;
  const dailyRate = (annualPenaltyPercent / 100) / 365;
  return Math.round(overdueAmountRial * dailyRate * daysOverdue);
}
