import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, toPersianDigits } from '../../utils/money';
import { 
  Receipt, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight,
  X,
  Check,
  Edit2,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { TransactionKind } from '../../types';

export const TransactionsView: React.FC = () => {
  const { 
    transactions, 
    accounts, 
    categories, 
    people, 
    currencyUnit, 
    numeralStyle, 
    deleteTransaction,
    setIsQuickAddOpen,
    setEditingTransaction 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<string>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Extract all unique tags
  const allTags = Array.from(new Set(transactions.flatMap(t => t.tags))).filter(Boolean);

  // Count active filters
  const activeFiltersCount = 
    (filterKind !== 'all' ? 1 : 0) + 
    (filterAccountId !== 'all' ? 1 : 0) + 
    (filterTag !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setFilterKind('all');
    setFilterAccountId('all');
    setFilterTag('all');
  };

  const filteredTxns = transactions.filter((t) => {
    if (filterKind !== 'all' && t.kind !== filterKind) return false;
    if (filterAccountId !== 'all' && t.accountId !== filterAccountId && t.toAccountId !== filterAccountId) return false;
    if (filterTag !== 'all' && !t.tags.includes(filterTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNote = t.note?.toLowerCase().includes(q);
      const matchTag = t.tags.some(tag => tag.toLowerCase().includes(q));
      const person = people.find(p => p.id === t.personId);
      const matchPerson = person?.name.toLowerCase().includes(q);
      return matchNote || matchTag || matchPerson;
    }
    return true;
  });

  const totalFilteredAmount = filteredTxns.reduce((s, t) => s + t.amount, 0);

  const handleRowClick = (txn: typeof transactions[0]) => {
    setEditingTransaction(txn);
    setIsQuickAddOpen(true);
  };

  return (
    <div className="space-y-4 pb-20">
      
      {/* Top Section Header */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
            <Receipt className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">تراکنش‌ها</h2>
            <span className="text-[11px] text-slate-400">
              {toPersianDigits(filteredTxns.length)} تراکنش
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingTransaction(null);
            setIsQuickAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ ثبت</span>
        </button>
      </div>

      {/* Search Bar + Filter Trigger Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو در تراکنش‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pr-9 pl-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Drawer / Modal Trigger Button */}
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className={`h-10 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors shadow-sm ${
            activeFiltersCount > 0
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="فیلترهای پیشرفته"
          aria-label="فیلترها"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>فیلترها</span>
          {activeFiltersCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-mono">
              {toPersianDigits(activeFiltersCount)}
            </span>
          )}
        </button>
      </div>

      {/* Active Filter Chips (Quiet inline tags if active) */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-1 text-xs">
          <span className="text-[11px] text-slate-400">فیلترهای فعال:</span>
          {filterKind !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
              نوع: {filterKind === 'expense' ? 'هزینه‌ها' : filterKind === 'income' ? 'درآمدها' : 'انتقال‌ها'}
              <button onClick={() => setFilterKind('all')} className="text-slate-400 hover:text-slate-700">×</button>
            </span>
          )}
          {filterAccountId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
              حساب: {accounts.find(a => a.id === filterAccountId)?.name}
              <button onClick={() => setFilterAccountId('all')} className="text-slate-400 hover:text-slate-700">×</button>
            </span>
          )}
          {filterTag !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
              #{filterTag}
              <button onClick={() => setFilterTag('all')} className="text-slate-400 hover:text-slate-700">×</button>
            </span>
          )}
          <button
            onClick={resetFilters}
            className="text-[11px] text-rose-600 hover:underline px-1 whitespace-nowrap"
          >
            پاک کردن همه
          </button>
        </div>
      )}

      {/* Transactions Summary Strip */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <span>تراکنش‌ها</span>
        <span className="tabular-nums font-semibold text-slate-800">
          مجموع: {formatMoney(totalFilteredAmount, currencyUnit, numeralStyle)}
        </span>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredTxns.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-2">
            <div>تراکنشی یافت نشد.</div>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-emerald-700 hover:underline font-semibold"
              >
                حذف فیلترها
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTxns.map((txn) => {
              const isExpense = txn.kind === 'expense';
              const isIncome = txn.kind === 'income';
              const isTransfer = txn.kind === 'transfer';
              const fromAcc = accounts.find(a => a.id === txn.accountId);
              const toAcc = accounts.find(a => a.id === txn.toAccountId);
              const cat = categories.find(c => c.id === txn.categoryId);
              const person = people.find(p => p.id === txn.personId);

              return (
                <div 
                  key={txn.id} 
                  onClick={() => handleRowClick(txn)}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors cursor-pointer group"
                  title="کلیک برای ویرایش و مشاهده جزئیات تراکنش"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isExpense
                          ? 'bg-rose-50 text-rose-600'
                          : isIncome
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-sky-50 text-sky-600'
                      }`}
                    >
                      {isExpense ? <ArrowDownLeft className="w-5 h-5" /> : isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowLeftRight className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate max-w-[140px] xs:max-w-[170px]">
                          {txn.note || (isExpense ? 'هزینه' : isIncome ? 'درآمد' : 'انتقال حساب')}
                        </span>
                        {cat && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            · {cat.name}
                          </span>
                        )}
                        {person && (
                          <span className="text-[10px] text-indigo-600 font-medium">
                            · {person.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 truncate">
                        <span className="font-mono">{txn.jalaliDate}</span>
                        <span>·</span>
                        <span className="truncate">
                          {isTransfer ? `${fromAcc?.name} ← ${toAcc?.name}` : fromAcc?.name}
                        </span>
                        {txn.tags.length > 0 && (
                          <span className="text-slate-400 truncate">#{txn.tags[0]}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Left: Amount with Tabular Figures and Edit Indicator */}
                  <div className="flex items-center gap-2 shrink-0 text-left">
                    <span
                      className={`text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap ${
                        isExpense ? 'text-rose-600' : isIncome ? 'text-emerald-600' : 'text-slate-800'
                      }`}
                    >
                      {isExpense ? '-' : isIncome ? '+' : ''}
                      {formatMoney(txn.amount, currencyUnit, numeralStyle)}
                    </span>
                    <Edit2 className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet / Modal */}
      {isFilterSheetOpen && (
        <div 
          className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsFilterSheetOpen(false)}
        >
          <div 
            className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 space-y-4 animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-2 mb-2" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">فیلتر تراکنش‌ها</h3>
              </div>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Kind Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">نوع تراکنش:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'all', label: 'همه' },
                  { id: 'expense', label: 'هزینه‌ها' },
                  { id: 'income', label: 'درآمدها' },
                  { id: 'transfer', label: 'انتقال‌ها' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilterKind(item.id)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap ${
                      filterKind === item.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">انتخاب حساب بانکی یا کیف پول:</label>
              <select
                value={filterAccountId}
                onChange={(e) => setFilterAccountId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              >
                <option value="all">تمام حساب‌ها</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.bankName || 'حساب'})</option>
                ))}
              </select>
            </div>

            {/* Tag Selector */}
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">برچسب‌ها:</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                  <button
                    type="button"
                    onClick={() => setFilterTag('all')}
                    className={`px-2.5 py-1 text-xs rounded-lg border ${
                      filterTag === 'all'
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    همه
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFilterTag(tag)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-mono ${
                        filterTag === tag
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sheet Actions */}
            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={resetFilters}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 whitespace-nowrap shrink-0"
              >
                پاک کردن
              </button>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap"
              >
                اعمال فیلترها
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
