/**
 * XIRR (Extended Internal Rate of Return) Calculator
 * Solves for the annual rate of return for non-periodic cash flows using the Newton-Raphson method
 */

export interface CashFlow {
  amount: number; // Negative for investment buy/outflow, positive for sell/dividend/current value
  date: Date;
}

export function calculateXIRR(cashFlows: CashFlow[], guess: number = 0.1): number | null {
  if (cashFlows.length < 2) return null;

  // Check if there is at least one positive and one negative cash flow
  let hasPositive = false;
  let hasNegative = false;
  for (const cf of cashFlows) {
    if (cf.amount > 0) hasPositive = true;
    if (cf.amount < 0) hasNegative = true;
  }
  if (!hasPositive || !hasNegative) return null;

  const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const d0 = sortedFlows[0].date.getTime();

  const maxIterations = 100;
  const tolerance = 1e-6;
  let rate = guess;

  for (let iter = 0; iter < maxIterations; iter++) {
    let fValue = 0;
    let fDerivative = 0;

    for (const cf of sortedFlows) {
      const years = (cf.date.getTime() - d0) / (365.25 * 24 * 3600 * 1000);
      const discount = Math.pow(1 + rate, years);
      if (isNaN(discount) || discount === 0) break;

      fValue += cf.amount / discount;
      fDerivative -= (years * cf.amount) / (discount * (1 + rate));
    }

    if (Math.abs(fDerivative) < 1e-9) break;

    const newRate = rate - fValue / fDerivative;
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }

    rate = newRate;
    // Bound rate within sensible limits (-99% to +1000%)
    if (rate <= -0.99) rate = -0.9;
    if (rate > 50) rate = 50;
  }

  return isFinite(rate) ? rate : null;
}
