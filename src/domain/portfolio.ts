import { calculateXIRR, type CashFlow } from './xirr';
import { diffJalaliDays, jalaliToIso, parseJalali, todayJalali } from './jalali';
import type { Asset, InvestmentLot } from './types';

export interface LotSlice {
  lotId: string;
  dateJalali: string;
  quantity: number;
  remaining: number;
  costPerUnitRial: number;
  feeRial: number;
  source: 'buy' | 'sell';
}

export interface Holding {
  asset: Asset;
  quantity: number;
  costBasisRial: number;
  averageCostRial: number;
  marketValueRial: number;
  unrealizedPlRial: number;
  unrealizedPlPercent: number;
  realizedPlRial: number;
  feesRial: number;
  openLots: LotSlice[];
  soldQuantity: number;
  oversold: boolean;
}

export interface PortfolioSummary {
  holdings: Holding[];
  marketValueRial: number;
  costBasisRial: number;
  unrealizedPlRial: number;
  unrealizedPlPercent: number;
  realizedPlRial: number;
  totalFeesRial: number;
  xirr: number | null;
  allocation: Array<{ label: string; valueRial: number; percent: number; color: string }>;
}

const CLASS_LABELS: Record<Asset['class'], string> = {
  gold: 'طلای آب‌شده',
  coin: 'سکه',
  gold_fund: 'صندوق طلا',
  fx: 'ارز',
  crypto: 'رمزارز',
  fund: 'صندوق سرمایه‌گذاری',
  stock: 'سهام',
  deposit: 'سپرده',
  manual: 'دارایی دستی'
};

export function assetClassLabel(assetClass: Asset['class']): string {
  return CLASS_LABELS[assetClass];
}

const CLASS_COLORS: Record<Asset['class'], string> = {
  gold: '#b7791f',
  coin: '#d69e2e',
  gold_fund: '#f6ad55',
  fx: '#2b6cb0',
  crypto: '#6b46c1',
  fund: '#2c7a7b',
  stock: '#2f855a',
  deposit: '#4a5568',
  manual: '#718096'
};

function roundRial(value: number): number {
  return Math.round(value);
}

interface RawLot {
  id: string;
  dateJalali: string;
  quantity: number;
  remaining: number;
  costPerUnitRial: number;
  feeRial: number;
  source: 'buy' | 'sell';
}

/**
 * FIFO cost basis. Buys become lots; sells consume the oldest open lots first.
 * A sell that exceeds the quantity held is clamped and flagged, never negative.
 */
export function computeHoldings(asset: Asset, lots: InvestmentLot[]): Holding {
  const sorted = [...lots]
    .filter((lot) => lot.assetId === asset.id && lot.quantity > 0 && lot.pricePerUnitRial >= 0)
    .sort((a, b) => {
      const dateCompare = a.dateJalali.localeCompare(b.dateJalali);
      if (dateCompare !== 0) return dateCompare;
      return a.createdAt.localeCompare(b.createdAt);
    });

  const open: RawLot[] = [];
  let realizedPlRial = 0;
  let feesRial = 0;
  let soldQuantity = 0;
  let oversold = false;

  for (const lot of sorted) {
    if (lot.type === 'buy') {
      const totalCost = lot.quantity * lot.pricePerUnitRial + lot.feeRial;
      feesRial += lot.feeRial;
      open.push({
        id: lot.id,
        dateJalali: lot.dateJalali,
        quantity: lot.quantity,
        remaining: lot.quantity,
        costPerUnitRial: totalCost / lot.quantity,
        feeRial: lot.feeRial,
        source: 'buy'
      });
      continue;
    }

    let toSell = lot.quantity;
    const requested = toSell;
    const proceeds = lot.quantity * lot.pricePerUnitRial - lot.feeRial;
    feesRial += lot.feeRial;
    let costSold = 0;
    let sold = 0;

    for (const openLot of open) {
      if (toSell <= 0) break;
      const take = Math.min(openLot.remaining, toSell);
      if (take <= 0) continue;
      openLot.remaining -= take;
      toSell -= take;
      sold += take;
      costSold += take * openLot.costPerUnitRial;
    }

    if (toSell > 1e-9) oversold = true;
    if (requested > 0 && sold > 0) {
      const realizedProceeds = proceeds * (sold / requested);
      realizedPlRial += realizedProceeds - costSold;
      soldQuantity += sold;
    }
  }

  const quantity = open.reduce((sum, lot) => sum + lot.remaining, 0);
  const costBasisRial = open.reduce((sum, lot) => sum + lot.remaining * lot.costPerUnitRial, 0);
  const marketValueRial = quantity * asset.currentPriceRial;
  const unrealizedPlRial = marketValueRial - costBasisRial;

  return {
    asset,
    quantity,
    costBasisRial: roundRial(costBasisRial),
    averageCostRial: quantity > 0 ? roundRial(costBasisRial / quantity) : 0,
    marketValueRial: roundRial(marketValueRial),
    unrealizedPlRial: roundRial(unrealizedPlRial),
    unrealizedPlPercent: costBasisRial > 0 ? (unrealizedPlRial / costBasisRial) * 100 : 0,
    realizedPlRial: roundRial(realizedPlRial),
    feesRial: roundRial(feesRial),
    openLots: open
      .filter((lot) => lot.remaining > 1e-9)
      .map((lot) => ({
        lotId: lot.id,
        dateJalali: lot.dateJalali,
        quantity: lot.quantity,
        remaining: lot.remaining,
        costPerUnitRial: lot.costPerUnitRial,
        feeRial: lot.feeRial,
        source: lot.source
      })),
    soldQuantity,
    oversold
  };
}

export function computePortfolio(assets: Asset[], lots: InvestmentLot[]): PortfolioSummary {
  const holdings = assets
    .map((asset) => computeHoldings(asset, lots))
    .filter((holding) => holding.quantity > 1e-9 || holding.realizedPlRial !== 0);

  const marketValueRial = holdings.reduce((sum, holding) => sum + holding.marketValueRial, 0);
  const costBasisRial = holdings.reduce((sum, holding) => sum + holding.costBasisRial, 0);
  const realizedPlRial = holdings.reduce((sum, holding) => sum + holding.realizedPlRial, 0);
  const totalFeesRial = holdings.reduce((sum, holding) => sum + holding.feesRial, 0);
  const unrealizedPlRial = marketValueRial - costBasisRial;

  const today = todayJalali();
  const cashFlows: CashFlow[] = [];
  for (const lot of lots) {
    if (lot.quantity <= 0) continue;
    const asset = assets.find((item) => item.id === lot.assetId);
    if (!asset) continue;
    const date = parseJalali(lot.dateJalali) ?? today;
    const iso = jalaliToIso(date);
    if (lot.type === 'buy') {
      cashFlows.push({ amountRial: -(lot.quantity * lot.pricePerUnitRial + lot.feeRial), date: iso });
    } else {
      cashFlows.push({ amountRial: lot.quantity * lot.pricePerUnitRial - lot.feeRial, date: iso });
    }
  }
  if (marketValueRial > 0) {
    cashFlows.push({ amountRial: marketValueRial, date: jalaliToIso(today) });
  }
  const xirr = calculateXIRR(cashFlows);

  const totalByClass = new Map<Asset['class'], number>();
  for (const holding of holdings) {
    if (holding.marketValueRial <= 0) continue;
    totalByClass.set(
      holding.asset.class,
      (totalByClass.get(holding.asset.class) ?? 0) + holding.marketValueRial
    );
  }
  const total = [...totalByClass.values()].reduce((sum, value) => sum + value, 0);
  const allocation = [...totalByClass.entries()]
    .map(([assetClass, valueRial]) => ({
      label: assetClassLabel(assetClass),
      valueRial,
      percent: total > 0 ? (valueRial / total) * 100 : 0,
      color: CLASS_COLORS[assetClass]
    }))
    .sort((a, b) => b.valueRial - a.valueRial);

  return {
    holdings,
    marketValueRial,
    costBasisRial,
    unrealizedPlRial,
    unrealizedPlPercent: costBasisRial > 0 ? (unrealizedPlRial / costBasisRial) * 100 : 0,
    realizedPlRial,
    totalFeesRial,
    xirr,
    allocation
  };
}

/** Days between the first lot and today, used for simple annualized return labels. */
export function holdingDays(holding: Holding): number {
  const first = holding.openLots[0]?.dateJalali;
  if (!first) return 0;
  const from = parseJalali(first);
  return from ? diffJalaliDays(from, todayJalali()) : 0;
}
