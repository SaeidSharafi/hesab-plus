import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, toPersianDigits } from '../../utils/money';
import { generateCashFlowForecast } from '../../utils/projections';
import { 
  LineChart, 
  AlertTriangle, 
  TrendingUp, 
  Sliders, 
  ShieldCheck, 
  Calendar, 
  ArrowLeftRight, 
  Target, 
  Clock, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { getTodayJalali } from '../../utils/jalali';

export const ProjectionsView: React.FC = () => {
  const { 
    accounts, 
    transactions, 
    installments, 
    cheques, 
    debts, 
    scenarios, 
    toggleScenario,
    goals,
    currencyUnit, 
    numeralStyle 
  } = useApp();

  const [horizonDays, setHorizonDays] = useState<number>(90);
  const [inflationPercent, setInflationPercent] = useState<number>(38); // 38% annual inflation
  const [showRealTerms, setShowRealTerms] = useState<boolean>(false);

  const forecast = generateCashFlowForecast(
    accounts,
    transactions,
    installments,
    cheques,
    debts,
    scenarios,
    horizonDays,
    inflationPercent
  );

  const todayJalali = getTodayJalali();

  // Find min and max for chart SVG scaling
  const points = forecast.points;
  const values = points.map(p => showRealTerms ? p.realTermsBalanceRial : p.projectedBalanceRial);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values, 10000000);
  const range = maxVal - minVal || 1;

  // Generate SVG path for the forecast curve
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 20;
  const paddingY = 25;

  const getX = (idx: number) => paddingX + (idx / (points.length - 1)) * (svgWidth - 2 * paddingX);
  const getY = (val: number) => svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - 2 * paddingY);

  const linePath = points.map((p, idx) => {
    const x = getX(idx);
    const y = getY(showRealTerms ? p.realTermsBalanceRial : p.projectedBalanceRial);
    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  // SVG Area path
  const areaPath = `${linePath} L ${svgWidth - paddingX} ${svgHeight - paddingY} L ${paddingX} ${svgHeight - paddingY} Z`;

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
            <LineChart className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">پیش‌بینی نقدینگی</h2>
          </div>
        </div>

        {/* Horizon selector buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          {[30, 90, 180].map((days) => (
            <button
              key={days}
              onClick={() => setHorizonDays(days)}
              className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                horizonDays === days
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {toPersianDigits(days)} روز
            </button>
          ))}
        </div>
      </div>

      {/* Real-Terms vs Nominal Toggle & Inflation Control */}
      <div className="flex flex-col gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRealTerms}
            onChange={(e) => setShowRealTerms(e.target.checked)}
            className="rounded text-indigo-600 w-4 h-4 shrink-0"
          />
          <span className="text-xs font-bold text-slate-800 leading-tight">
            محاسبه با احتساب تورم
          </span>
        </label>

        {showRealTerms && (
          <div className="flex items-center justify-between gap-2 text-xs pt-1.5 border-t border-slate-100">
            <span className="text-slate-500">نرخ تورم سالانه:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={inflationPercent}
                onChange={(e) => setInflationPercent(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono font-bold"
              />
              <span className="text-slate-500">٪</span>
            </div>
          </div>
        )}
      </div>

      {/* Shortfall & Low-Balance Alert Banner */}
      {forecast.shortfalls.length > 0 ? (
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>هشدار کسری بودجه:</span>
          </div>
          <div className="space-y-1.5">
            {forecast.shortfalls.slice(0, 3).map((sf, i) => (
              <div key={i} className="text-xs text-rose-800 bg-white/70 p-3 rounded-xl border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold">{sf.jalaliDate}:</span> کسری برای {sf.reason} (<span className="font-mono font-bold text-rose-600">{formatMoney(sf.projectedShortfallRial, currencyUnit, numeralStyle)}</span>)
                </div>
                {sf.suggestedSourceAccountId && (
                  <div className="text-[11px] text-emerald-800 font-medium">
                    پیشنهاد: انتقال از {sf.suggestedSourceAccountName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-2 text-emerald-900 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>وضعیت نقدینگی پایدار است.</span>
        </div>
      )}

      {/* Interactive Forecast SVG Curve */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              نمودار مسیر نقدینگی {showRealTerms ? '(با تورم)' : ''}
            </h3>
            <span className="text-[11px] text-slate-400">
              پایین‌ترین نقطه در {forecast.lowestPointDate}: {formatMoney(forecast.lowestBalanceRial, currencyUnit, numeralStyle)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-indigo-600" />
            <span className="text-slate-600 font-medium">موجودی پیش‌بینی شده</span>
          </div>
        </div>

        {/* SVG Container */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56 select-none">
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Zero line if negative */}
            {minVal < 0 && (
              <line
                x1={paddingX}
                y1={getY(0)}
                x2={svgWidth - paddingX}
                y2={getY(0)}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
            )}

            {/* Area fill */}
            <path d={areaPath} fill="url(#curveGradient)" />

            {/* Main line */}
            <path d={linePath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />

            {/* Start and end points */}
            {points.length > 0 && (
              <>
                <circle
                  cx={getX(0)}
                  cy={getY(showRealTerms ? points[0].realTermsBalanceRial : points[0].projectedBalanceRial)}
                  r="4"
                  fill="#4f46e5"
                />
                <circle
                  cx={getX(points.length - 1)}
                  cy={getY(showRealTerms ? points[points.length - 1].realTermsBalanceRial : points[points.length - 1].projectedBalanceRial)}
                  r="4"
                  fill="#4f46e5"
                />
              </>
            )}
          </svg>
        </div>

        {/* X Axis milestones */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-2 pt-1 border-t border-slate-100">
          <span>امروز ({todayJalali})</span>
          <span>{toPersianDigits(Math.round(horizonDays / 2))} روز دیگر</span>
          <span>{toPersianDigits(horizonDays)} روز دیگر</span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">پس‌انداز تخمینی ماه:</span>
          <span className={`text-base font-bold font-mono ${forecast.endOfMonthProjectedSavingsRial >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatMoney(forecast.endOfMonthProjectedSavingsRial, currencyUnit, numeralStyle)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">تاریخ تسویه وام‌ها:</span>
          <span className="text-base font-bold font-mono text-indigo-700">
            {forecast.debtFreeDateJalali || 'وام فعالی ندارید'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
          <span className="text-xs text-slate-500 block mb-1">کمترین نقدینگی:</span>
          <span className="text-base font-bold font-mono text-slate-900">
            {formatMoney(forecast.lowestBalanceRial, currencyUnit, numeralStyle)}
          </span>
        </div>
      </div>

      {/* What-If Scenarios Overlays */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900">
              سناریوهای فرضی
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              onClick={() => toggleScenario(sc.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                sc.active
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">{sc.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  sc.active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {sc.active ? 'فعال در نمودار' : 'غیرفعال'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{sc.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Goals Tracker */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900">اهداف مالی و پس‌انداز هدفمند (Savings Goals)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentAmountRial / g.targetAmountRial) * 100));
            return (
              <div key={g.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{g.name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-700">{toPersianDigits(pct)}٪</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: g.color || '#10b981' }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>ذخیره شده: {formatMoney(g.currentAmountRial, currencyUnit, numeralStyle)}</span>
                  <span>هدف: {formatMoney(g.targetAmountRial, currencyUnit, numeralStyle)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
