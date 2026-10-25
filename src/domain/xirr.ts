export interface CashFlow {
  amountRial: number;
  /** ISO date (YYYY-MM-DD or full timestamp). */
  date: string;
}

const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

function presentValue(cashFlows: CashFlow[], rate: number): number {
  const t0 = new Date(cashFlows[0]?.date ?? '').getTime();
  let value = 0;
  for (const flow of cashFlows) {
    const years = (new Date(flow.date).getTime() - t0) / YEAR_MS;
    value += flow.amountRial / Math.pow(1 + rate, years);
  }
  return value;
}

/**
 * XIRR: annualized return for irregular cash flows, solved with bracketing + bisection.
 * Bisection is slower than Newton but cannot diverge, which matters for long-tail
 * portfolio histories with very large or very small rates.
 */
export function calculateXIRR(cashFlows: CashFlow[]): number | null {
  const flows = [...cashFlows]
    .filter((flow) => Number.isFinite(flow.amountRial) && flow.amountRial !== 0 && !Number.isNaN(new Date(flow.date).getTime()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (flows.length < 2) return null;
  const hasPositive = flows.some((flow) => flow.amountRial > 0);
  const hasNegative = flows.some((flow) => flow.amountRial < 0);
  if (!hasPositive || !hasNegative) return null;

  let low = -0.9999;
  let high = 10;
  let lowValue = presentValue(flows, low);
  let highValue = presentValue(flows, high);

  // Expand the upper bracket for extraordinary returns.
  let guard = 0;
  while (lowValue * highValue > 0 && high < 1000 && guard < 12) {
    high *= 4;
    highValue = presentValue(flows, high);
    guard += 1;
  }
  if (lowValue * highValue > 0) return null;

  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    const midValue = presentValue(flows, mid);
    if (Math.abs(midValue) < 1e-9 || high - low < 1e-10) return mid;
    if (lowValue * midValue <= 0) {
      high = mid;
      highValue = midValue;
    } else {
      low = mid;
      lowValue = midValue;
    }
  }

  return (low + high) / 2;
}

export function annualizeReturn(totalReturnPercent: number, days: number): number | null {
  if (days <= 0) return null;
  const growth = 1 + totalReturnPercent / 100;
  if (growth <= 0) return -100;
  return (Math.pow(growth, 365 / days) - 1) * 100;
}
