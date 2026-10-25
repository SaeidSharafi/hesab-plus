import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, toPersianDigits } from '../../utils/money';
import { getTodayJalali, JALALI_MONTH_NAMES } from '../../utils/jalali';
import { 
  PieChart, 
  BarChart3, 
  Table, 
  GitFork, 
  ChevronRight, 
  ChevronDown, 
  Download, 
  Filter, 
  Layers, 
  ArrowUpDown,
  Sparkles,
  Coffee
} from 'lucide-react';
import { Category, Transaction } from '../../types';

type ReportViewMode = 'tree' | 'treemap' | 'pivot' | 'comparison' | 'latte';

export const ReportsView: React.FC = () => {
  const { 
    categories, 
    transactions, 
    accounts, 
    people,
    currencyUnit, 
    numeralStyle 
  } = useApp();

  const todayJalali = getTodayJalali();
  const currentYearMonth = todayJalali.substring(0, 7); // e.g. "1405/08"

  const [viewMode, setViewMode] = useState<ReportViewMode>('tree');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all'); // 'all', 'this_month', 'last_month'
  const [selectedKind, setSelectedKind] = useState<'expense' | 'income'>('expense');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    'cat-food': true,
    'cat-transport': true,
    'cat-housing': true
  });

  // Filter transactions by kind and period
  const filteredTxns = transactions.filter(t => {
    if (t.kind !== selectedKind) return false;
    if (selectedPeriod === 'this_month') {
      return t.jalaliDate.startsWith(currentYearMonth);
    }
    return true;
  });

  const totalAmount = filteredTxns.reduce((sum, t) => sum + t.amount, 0);

  // Group by Parent Categories and Sub-categories
  const parentCategories = categories.filter(c => c.kind === selectedKind && c.parentId === null);

  // Compute spend per category (including direct + child rollups)
  const getCategorySpend = (catId: string): number => {
    // 1. Direct transactions
    const direct = filteredTxns
      .filter(t => t.categoryId === catId)
      .reduce((sum, t) => sum + t.amount, 0);

    // 2. Split items
    const fromSplits = filteredTxns.reduce((sum, t) => {
      if (t.splitItems) {
        return sum + t.splitItems
          .filter(s => s.categoryId === catId)
          .reduce((ss, s) => ss + s.amount, 0);
      }
      return sum;
    }, 0);

    // 3. Children rollups
    const childCats = categories.filter(c => c.parentId === catId);
    const fromChildren = childCats.reduce((sum, child) => sum + getCategorySpend(child.id), 0);

    return direct + fromSplits + fromChildren;
  };

  const toggleCategory = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Export Pivot Table to CSV
  const handleExportCSV = () => {
    const months = ['1405/05', '1405/06', '1405/07', '1405/08'];
    const rows: string[] = [];
    rows.push(['دسته', ...months, 'مجموع'].join(','));

    const leafCats = categories.filter(c => c.kind === selectedKind && c.parentId !== null);
    leafCats.forEach(cat => {
      const rowData = [cat.name];
      let catTotal = 0;
      months.forEach(m => {
        const mSpend = transactions
          .filter(t => t.categoryId === cat.id && t.jalaliDate.startsWith(m))
          .reduce((s, t) => s + t.amount, 0);
        const displayVal = currencyUnit === 'TOMAN' ? Math.floor(mSpend / 10) : mSpend;
        catTotal += displayVal;
        rowData.push(displayVal.toString());
      });
      rowData.push(catTotal.toString());
      rows.push(rowData.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hesab_plus_report_${selectedKind}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Latte Factor: Most frequent small spends (< 500,000 Toman)
  const latteSpends = transactions
    .filter(t => t.kind === 'expense' && t.amount <= 5000000) // <= 500K Toman
    .slice(0, 10);
  const totalLatteAmount = latteSpends.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
            <PieChart className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">گزارش‌ها</h2>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap shrink-0"
          title="دریافت خروجی"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>خروجی</span>
        </button>
      </div>

      {/* View Mode Switcher (Horizontal scrollable M3 Segmented Bar) */}
      <div className="flex items-center bg-slate-200/60 p-1 rounded-2xl overflow-x-auto no-scrollbar gap-1 w-full">
        <button
          onClick={() => setViewMode('tree')}
          className={`flex-1 min-w-[75px] py-1.5 px-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
            viewMode === 'tree' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          درخت اقلام
        </button>

        <button
          onClick={() => setViewMode('treemap')}
          className={`flex-1 min-w-[75px] py-1.5 px-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
            viewMode === 'treemap' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          بلوک‌ها
        </button>

        <button
          onClick={() => setViewMode('pivot')}
          className={`flex-1 min-w-[75px] py-1.5 px-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
            viewMode === 'pivot' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ماتریس
        </button>

        <button
          onClick={() => setViewMode('latte')}
          className={`flex-1 min-w-[75px] py-1.5 px-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
            viewMode === 'latte' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          اثر لاته
        </button>
      </div>

      {/* Filter and Period Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          {/* Expense vs Income */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setSelectedKind('expense')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedKind === 'expense' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              هزینه‌ها
            </button>
            <button
              onClick={() => setSelectedKind('income')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedKind === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              درآمدها
            </button>
          </div>

          {/* Period selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          >
            <option value="all">تمام دوره‌ها</option>
            <option value="this_month">این ماه ({todayJalali.substring(5, 7)} ماه)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">مجموع دوره:</span>
          <span className="text-sm font-bold font-mono text-slate-900">
            {formatMoney(totalAmount, currencyUnit, numeralStyle)}
          </span>
          {viewMode === 'pivot' && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>خروجی اکسل/CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: Drill-Down Tree View */}
      {viewMode === 'tree' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
          <div className="text-xs font-bold text-slate-900">
            درخت تفکیک دسته‌بندی‌ها (امکان باز و بسته کردن والد و مشاهده سهم درصدی)
          </div>

          <div className="space-y-3">
            {parentCategories.map((parent) => {
              const parentSpend = getCategorySpend(parent.id);
              if (parentSpend === 0 && selectedPeriod !== 'all') return null;

              const parentShare = totalAmount > 0 ? Math.round((parentSpend / totalAmount) * 100) : 0;
              const isExpanded = expandedCats[parent.id] ?? false;
              const children = categories.filter(c => c.parentId === parent.id);

              return (
                <div key={parent.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  
                  {/* Parent Row */}
                  <div
                    onClick={() => toggleCategory(parent.id)}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-slate-400 hover:text-slate-700">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: parent.color }}
                      >
                        {parent.name.substring(0, 1)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{parent.name}</span>
                        <span className="text-[11px] text-slate-400">{children.length} زیرشاخه</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-left">
                      <div className="w-24 hidden sm:block">
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${parentShare}%`, backgroundColor: parent.color }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-slate-900 block">
                          {formatMoney(parentSpend, currencyUnit, numeralStyle)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {toPersianDigits(parentShare)}٪ از کل
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Children Rows */}
                  {isExpanded && children.length > 0 && (
                    <div className="p-3 divide-y divide-slate-100 bg-white">
                      {children.map((child) => {
                        const childSpend = getCategorySpend(child.id);
                        const childShareOfParent = parentSpend > 0 ? Math.round((childSpend / parentSpend) * 100) : 0;
                        const childShareOfTotal = totalAmount > 0 ? Math.round((childSpend / totalAmount) * 100) : 0;

                        return (
                          <div key={child.id} className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-50/60 rounded-lg">
                            <div className="flex items-center gap-2.5 pr-6">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: child.color }} />
                              <span className="text-xs text-slate-800 font-medium">{child.name}</span>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-xs font-bold font-mono text-slate-800 block">
                                  {formatMoney(childSpend, currencyUnit, numeralStyle)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {toPersianDigits(childShareOfParent)}٪ از والد ({toPersianDigits(childShareOfTotal)}٪ کل)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Visual Treemap Blocks (نمودار مستطیلی سهم هزینه‌ها) */}
      {viewMode === 'treemap' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
          <div className="text-xs font-bold text-slate-900">
            نمای بلوکی تناسبی (Treemap): هر چه سهم هزینه بیشتر باشد مساحت بلوک بزرگتر است
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {parentCategories.map((cat) => {
              const spend = getCategorySpend(cat.id);
              if (spend === 0) return null;
              const share = totalAmount > 0 ? Math.round((spend / totalAmount) * 100) : 0;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl flex flex-col justify-between text-white transition-transform active:scale-[0.98] shadow-xs min-h-[110px]"
                  style={{ backgroundColor: cat.color }}
                >
                  <div>
                    <span className="text-xs font-bold block truncate">{cat.name}</span>
                    <span className="text-[10px] opacity-80 font-mono mt-0.5 block">
                      {toPersianDigits(share)}٪ کل مخارج
                    </span>
                  </div>

                  <div className="text-left pt-2 border-t border-white/20">
                    <span className="text-xs sm:text-sm font-extrabold font-mono block truncate">
                      {formatMoney(spend, currencyUnit, numeralStyle)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: Pivot Table (ماتریس دسته‌ها × ماه‌های شمسی) */}
      {viewMode === 'pivot' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">جدول محوری ماهانه (Pivot)</h3>
            <span className="text-[10px] text-slate-400">به {currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'}</span>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                  <th className="p-2.5 font-bold">دسته‌بندی</th>
                  <th className="p-2.5 font-semibold font-mono text-center">مرداد ۱۴۰۵</th>
                  <th className="p-2.5 font-semibold font-mono text-center">شهریور ۱۴۰۵</th>
                  <th className="p-2.5 font-semibold font-mono text-center">مهر ۱۴۰۵</th>
                  <th className="p-2.5 font-semibold font-mono text-center">آبان ۱۴۰۵</th>
                  <th className="p-2.5 font-bold font-mono text-center">جمع ردیف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.filter(c => c.kind === selectedKind && c.parentId !== null).map((cat) => {
                  const m1 = transactions.filter(t => t.categoryId === cat.id && t.jalaliDate.startsWith('1405/05')).reduce((s, t) => s + t.amount, 0);
                  const m2 = transactions.filter(t => t.categoryId === cat.id && t.jalaliDate.startsWith('1405/06')).reduce((s, t) => s + t.amount, 0);
                  const m3 = transactions.filter(t => t.categoryId === cat.id && t.jalaliDate.startsWith('1405/07')).reduce((s, t) => s + t.amount, 0);
                  const m4 = transactions.filter(t => t.categoryId === cat.id && t.jalaliDate.startsWith('1405/08')).reduce((s, t) => s + t.amount, 0);
                  const rowSum = m1 + m2 + m3 + m4;

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-medium text-slate-800">{cat.name}</td>
                      <td className="p-2.5 font-mono text-center text-slate-600">{m1 > 0 ? formatMoney(m1, currencyUnit, numeralStyle, false) : '-'}</td>
                      <td className="p-2.5 font-mono text-center text-slate-600">{m2 > 0 ? formatMoney(m2, currencyUnit, numeralStyle, false) : '-'}</td>
                      <td className="p-2.5 font-mono text-center text-slate-600">{m3 > 0 ? formatMoney(m3, currencyUnit, numeralStyle, false) : '-'}</td>
                      <td className="p-2.5 font-mono text-center text-slate-600">{m4 > 0 ? formatMoney(m4, currencyUnit, numeralStyle, false) : '-'}</td>
                      <td className="p-2.5 font-mono text-center font-bold text-slate-900">{formatMoney(rowSum, currencyUnit, numeralStyle, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 4: Latte Factor (هزینه‌های پرتکرار کوچک روزانه) */}
      {viewMode === 'latte' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-700" />
            <h3 className="text-xs font-bold text-slate-900">
              تحلیل اثر لاته (Latte Factor): هزینه‌های کوچک و پرتکرار روزانه
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            مخارج کمتر از ۵۰۰ هزار تومان مانند اسنپ‌های روزمره، قهوه بیرون، تنقلات و میان‌وعده‌ها که در طول ماه جمع شده و رقم قابل توجهی می‌شوند.
          </p>

          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between">
            <span className="text-xs text-amber-900 font-bold">مجموع این خریدهای کوچک:</span>
            <span className="text-base font-bold font-mono text-amber-950">
              {formatMoney(totalLatteAmount, currencyUnit, numeralStyle)}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {latteSpends.map((txn) => (
              <div key={txn.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">{txn.note || 'خرید خرد'}</span>
                  <span className="text-[11px] text-slate-400">{txn.jalaliDate}</span>
                </div>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {formatMoney(txn.amount, currencyUnit, numeralStyle)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
