import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, parseUserInputToRial, toEnglishDigits, toPersianDigits } from '../../utils/money';
import { calculateXIRR, CashFlow } from '../../utils/xirr';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  RefreshCw, 
  PieChart, 
  Edit3, 
  Check, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Scale, 
  Layers,
  Sparkles
} from 'lucide-react';
import { Asset, AssetClass, InvestmentLot } from '../../types';
import { getTodayJalali } from '../../utils/jalali';

export const InvestmentsView: React.FC = () => {
  const { 
    assets, 
    investmentLots, 
    accounts,
    currencyUnit, 
    numeralStyle, 
    addInvestmentLot, 
    updateAssetPrice 
  } = useApp();

  const todayJalali = getTodayJalali();

  const [isAddLotOpen, setIsAddLotOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editedPriceRaw, setEditedPriceRaw] = useState('');

  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [lotType, setLotType] = useState<'buy' | 'sell'>('buy');
  const [lotQtyRaw, setLotQtyRaw] = useState('');
  const [lotPriceRaw, setLotPriceRaw] = useState('');
  const [lotFeeRaw, setLotFeeRaw] = useState('0');
  const [lotAccountId, setLotAccountId] = useState(accounts[0]?.id || '');

  // Calculate Portfolio Totals
  let totalMarketValue = 0;
  let totalCostBasis = 0;
  const cashFlows: CashFlow[] = [];

  // Group lots by asset
  const assetSummaries = assets.map((asset) => {
    const lots = investmentLots.filter(l => l.assetId === asset.id);
    let openQty = 0;
    let cost = 0;

    lots.forEach(lot => {
      if (lot.type === 'buy') {
        openQty += lot.quantity;
        cost += (lot.quantity * lot.pricePerUnitRial) + lot.feeRial;
        // Negative cash flow for XIRR
        cashFlows.push({
          amount: -((lot.quantity * lot.pricePerUnitRial) + lot.feeRial),
          date: new Date(lot.date)
        });
      } else {
        openQty = Math.max(0, openQty - lot.quantity);
        // Positive cash flow for XIRR
        cashFlows.push({
          amount: (lot.quantity * lot.pricePerUnitRial) - lot.feeRial,
          date: new Date(lot.date)
        });
      }
    });

    const marketVal = openQty * asset.currentPriceRial;
    const avgCostPerUnit = openQty > 0 ? Math.round(cost / openQty) : 0;
    const unrealizedPL = marketVal - cost;
    const unrealizedPLPercent = cost > 0 ? ((unrealizedPL / cost) * 100) : 0;

    if (openQty > 0) {
      totalMarketValue += marketVal;
      totalCostBasis += cost;
    }

    return {
      asset,
      openQty,
      avgCostPerUnit,
      marketVal,
      cost,
      unrealizedPL,
      unrealizedPLPercent
    };
  }).filter(item => item.openQty > 0 || item.asset.currentPriceRial > 0);

  // Add final current market value as positive terminal cash flow for XIRR
  if (totalMarketValue > 0) {
    cashFlows.push({
      amount: totalMarketValue,
      date: new Date()
    });
  }

  // Calculate XIRR
  const portfolioXIRR = calculateXIRR(cashFlows);
  const totalUnrealizedPL = totalMarketValue - totalCostBasis;
  const totalUnrealizedPLPercent = totalCostBasis > 0 ? ((totalUnrealizedPL / totalCostBasis) * 100) : 0;

  // Real Return vs Gold Benchmark
  const goldAsset = assets.find(a => a.symbol === 'GOLD_18K');
  const goldPriceChangePercent = goldAsset ? ((goldAsset.currentPriceRial - goldAsset.previousClosePriceRial) / goldAsset.previousClosePriceRial) * 100 : 0;

  const handleCreateLot = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(toEnglishDigits(lotQtyRaw)) || 0;
    const price = parseUserInputToRial(lotPriceRaw, currencyUnit);
    const fee = parseUserInputToRial(lotFeeRaw, currencyUnit);
    if (qty <= 0 || price <= 0) return;

    addInvestmentLot({
      assetId: selectedAssetId,
      type: lotType,
      date: new Date().toISOString(),
      jalaliDate: todayJalali,
      quantity: qty,
      pricePerUnitRial: price,
      feeRial: fee,
      accountId: lotAccountId || undefined
    });

    setIsAddLotOpen(false);
    setLotQtyRaw('');
    setLotPriceRaw('');
  };

  const handleSavePriceEdit = (assetId: string) => {
    const newPriceRial = parseUserInputToRial(editedPriceRaw, currencyUnit);
    if (newPriceRial > 0) {
      updateAssetPrice(assetId, newPriceRial);
    }
    setEditingAssetId(null);
    setEditedPriceRaw('');
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">سرمایه و دارایی</h2>
          </div>
        </div>

        <button
          onClick={() => {
            const activeAsset = assets.find(a => a.id === selectedAssetId);
            if (activeAsset) {
              setLotPriceRaw(currencyUnit === 'TOMAN' ? Math.floor(activeAsset.currentPriceRial / 10).toString() : activeAsset.currentPriceRial.toString());
            }
            setIsAddLotOpen(true);
          }}
          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ معامله</span>
        </button>
      </div>

      {/* Portfolio Performance KPI Strip (2x2 Mobile Grid) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block mb-0.5">ارزش روز:</span>
          <span className="text-sm font-bold font-mono text-slate-900 block truncate">
            {formatMoney(totalMarketValue, currencyUnit, numeralStyle)}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
            خرید: {formatMoney(totalCostBasis, currencyUnit, numeralStyle)}
          </span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block mb-0.5">سود/زیان:</span>
          <span className={`text-sm font-bold font-mono block truncate ${totalUnrealizedPL >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {totalUnrealizedPL >= 0 ? '+' : ''}{formatMoney(totalUnrealizedPL, currencyUnit, numeralStyle)}
          </span>
          <span className={`text-[9px] font-mono font-bold block mt-0.5 ${totalUnrealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ({toPersianDigits(totalUnrealizedPLPercent.toFixed(1))}٪)
          </span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-[10px] text-slate-400 block mb-0.5">بازده (XIRR):</span>
          <span className="text-sm font-bold font-mono text-indigo-700 block truncate">
            {portfolioXIRR !== null ? `${toPersianDigits((portfolioXIRR * 100).toFixed(1))}٪` : '۲+ معامله'}
          </span>
        </div>

        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
          <span className="text-[10px] text-amber-900 font-bold block mb-0.5">شاخص طلا:</span>
          <span className="text-sm font-bold font-mono text-amber-950 block truncate">
            {formatMoney(goldAsset?.currentPriceRial || 0, currencyUnit, numeralStyle)}
          </span>
        </div>
      </div>

      {/* Live Market Price Board */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-bold text-slate-900">
              نرخ روز بازار
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{todayJalali}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {assets.map((asset) => {
            const isEditing = editingAssetId === asset.id;
            const priceChange = asset.currentPriceRial - asset.previousClosePriceRial;
            const pctChange = asset.previousClosePriceRial > 0 ? (priceChange / asset.previousClosePriceRial) * 100 : 0;

            return (
              <div key={asset.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-1.5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 truncate max-w-[100px]">{asset.name}</span>
                    <button
                      onClick={() => {
                        setEditingAssetId(asset.id);
                        setEditedPriceRaw(currencyUnit === 'TOMAN' ? Math.floor(asset.currentPriceRial / 10).toString() : asset.currentPriceRial.toString());
                      }}
                      title="ویرایش دستی قیمت"
                      className="text-slate-400 hover:text-slate-800 p-0.5"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono block">{asset.symbol}</span>
                </div>

                {isEditing ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={editedPriceRaw}
                      onChange={(e) => setEditedPriceRaw(e.target.value)}
                      className="w-full text-xs p-1 bg-white border border-slate-300 rounded font-mono text-center"
                      placeholder="قیمت جدید"
                    />
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleSavePriceEdit(asset.id)}
                        className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                      >
                        ثبت
                      </button>
                      <button
                        onClick={() => setEditingAssetId(null)}
                        className="text-slate-400 text-[10px]"
                      >
                        لغو
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold font-mono text-slate-900 block truncate">
                      {formatMoney(asset.currentPriceRial, currencyUnit, numeralStyle)}
                    </span>
                    <div className="text-[10px] font-mono mt-0.5">
                      <span className={pctChange >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {pctChange >= 0 ? '▲ +' : '▼ '}{toPersianDigits(Math.abs(pctChange).toFixed(1))}٪
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Holdings & Lots Cards (Native Mobile Format) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900">دارایی‌های سبد و سود/زیان</h3>
          <span className="text-[10px] text-slate-400">روش محاسبه: FIFO</span>
        </div>

        <div className="space-y-2.5">
          {assetSummaries.filter(s => s.openQty > 0).map((item) => (
            <div key={item.asset.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{item.asset.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.asset.symbol}</span>
                </div>
                <div className="text-left">
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    item.unrealizedPL >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {item.unrealizedPL >= 0 ? '+' : ''}{toPersianDigits(item.unrealizedPLPercent.toFixed(1))}٪
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-slate-200/50">
                <div>
                  <span className="text-[10px] text-slate-400 block">ارزش روز کل:</span>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {formatMoney(item.marketVal, currencyUnit, numeralStyle)}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">مقدار / تعداد:</span>
                  <span className="text-xs font-bold font-mono text-slate-800">
                    {toPersianDigits(item.openQty)} {item.asset.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/40">
                <span>میانگین خرید: {formatMoney(item.avgCostPerUnit, currencyUnit, numeralStyle)}</span>
                <span className={item.unrealizedPL >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  سود: {item.unrealizedPL >= 0 ? '+' : ''}{formatMoney(item.unrealizedPL, currencyUnit, numeralStyle)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Investment Lot Modal */}
      {isAddLotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">ثبت خرید یا فروش دارایی در سبد</h3>
              <button onClick={() => setIsAddLotOpen(false)} className="text-slate-400 hover:text-slate-700 text-base font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateLot} className="p-5 space-y-4 overflow-y-auto">
              {/* Type: Buy vs Sell */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLotType('buy')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    lotType === 'buy' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  خرید دارایی (افزودن به سبد)
                </button>
                <button
                  type="button"
                  onClick={() => setLotType('sell')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    lotType === 'sell' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  فروش دارایی (کاهش از سبد)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">انتخاب دارایی</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    const selected = assets.find(a => a.id === e.target.value);
                    if (selected) {
                      setLotPriceRaw(currencyUnit === 'TOMAN' ? Math.floor(selected.currentPriceRial / 10).toString() : selected.currentPriceRial.toString());
                    }
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    مقدار / تعداد
                  </label>
                  <input
                    type="text"
                    value={lotQtyRaw}
                    onChange={(e) => setLotQtyRaw(e.target.value)}
                    placeholder="مثلاً: 2.5 یا 1000"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    قیمت هر واحد ({currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'})
                  </label>
                  <input
                    type="text"
                    value={lotPriceRaw}
                    onChange={(e) => setLotPriceRaw(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">کارمزد معامله ({currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'})</label>
                  <input
                    type="text"
                    value={lotFeeRaw}
                    onChange={(e) => setLotFeeRaw(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">حساب بانکی پرداخت / واریز</label>
                  <select
                    value={lotAccountId}
                    onChange={(e) => setLotAccountId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 transition-colors"
                >
                  ثبت معامله و اتصال به دفترکل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
