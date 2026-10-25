import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, toPersianDigits } from '../../utils/money';
import { 
  TrendingUp, 
  TrendingDown, 
  Landmark, 
  Wallet, 
  Coins, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle,
  Plus,
  CreditCard,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { daysBetweenJalali, getTodayJalali } from '../../utils/jalali';

export const DashboardView: React.FC = () => {
  const { 
    accounts, 
    transactions, 
    loans, 
    installments, 
    debts, 
    people,
    cheques, 
    assets, 
    investmentLots,
    currencyUnit, 
    numeralStyle, 
    setIsQuickAddOpen,
    setEditingTransaction,
    setActiveTab,
    payLoanInstallment,
    deleteTransaction
  } = useApp();

  const todayJalali = getTodayJalali();

  // 1. Calculate Total Liquid Accounts (Cash, Bank, Cards)
  const totalLiquid = accounts
    .filter(a => a.includeInNetWorth && ['cash', 'bank', 'card', 'wallet', 'savings'].includes(a.type))
    .reduce((sum, a) => sum + a.balance, 0);

  // 2. Calculate Total Market Value of Investments
  const totalInvestments = investmentLots.reduce((sum, lot) => {
    const asset = assets.find(a => a.id === lot.assetId);
    if (!asset) return sum;
    return sum + (lot.quantity * asset.currentPriceRial);
  }, 0);

  // 3. Calculate Debts: What I am Owed (Lent) vs What I Owe (Borrowed)
  const totalLent = debts
    .filter(d => d.direction === 'lent' && d.status === 'active')
    .reduce((sum, d) => sum + d.amountRial, 0);

  const totalBorrowed = debts
    .filter(d => d.direction === 'borrowed' && d.status === 'active')
    .reduce((sum, d) => sum + d.amountRial, 0);

  // 4. Calculate Remaining Loan Liabilities
  const remainingLoanPrincipal = installments
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.principalPart, 0);

  // Net Worth = (Liquid + Investments + Lent) - (Borrowed + Loan Principals)
  const totalAssets = totalLiquid + totalInvestments + totalLent;
  const totalLiabilities = totalBorrowed + remainingLoanPrincipal;
  const netWorth = totalAssets - totalLiabilities;

  // Monthly Income vs Expense
  const thisMonthTxns = transactions.filter(t => t.jalaliDate.startsWith(todayJalali.substring(0, 7)));
  const monthlyExpense = thisMonthTxns
    .filter(t => t.kind === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = thisMonthTxns
    .filter(t => t.kind === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // Upcoming Obligations in the next 14 days (Loans, Cheques, Debts)
  const upcomingInstallments = installments
    .filter(i => i.status !== 'paid')
    .map(i => {
      const loan = loans.find(l => l.id === i.loanId);
      const daysDiff = daysBetweenJalali(todayJalali, i.jalaliDueDate);
      return {
        id: i.id,
        type: 'installment' as const,
        title: `قسط ${loan?.lender || 'وام'}`,
        amount: i.amount,
        jalaliDueDate: i.jalaliDueDate,
        daysDiff,
        status: i.status,
        installmentId: i.id,
        repaymentAccountId: loan?.repaymentAccountId || accounts[0]?.id
      };
    })
    .filter(item => item.daysDiff >= -30 && item.daysDiff <= 14);

  const upcomingCheques = cheques
    .filter(c => c.status === 'pending')
    .map(c => {
      const daysDiff = daysBetweenJalali(todayJalali, c.jalaliDueDate);
      return {
        id: c.id,
        type: 'cheque' as const,
        title: `چک ${c.direction === 'issued' ? 'صادر شده به' : 'دریافتی از'} ${c.counterparty}`,
        amount: c.amount,
        jalaliDueDate: c.jalaliDueDate,
        daysDiff,
        status: c.status
      };
    })
    .filter(item => item.daysDiff >= -30 && item.daysDiff <= 14);

  const allUpcoming = [...upcomingInstallments, ...upcomingCheques].sort((a, b) => a.daysDiff - b.daysDiff);

  return (
    <div className="space-y-6 pb-20">
      
      {/* Hero Net Worth Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400">
              دارایی خالص
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono tabular-nums break-words">
              {formatMoney(netWorth, currencyUnit, numeralStyle)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap pt-0.5">
              <span>دارایی: <span className="text-white font-mono">{formatMoney(totalAssets, currencyUnit, numeralStyle)}</span></span>
              <span>·</span>
              <span>بدهی: <span className="text-rose-400 font-mono">{formatMoney(totalLiabilities, currencyUnit, numeralStyle)}</span></span>
            </div>
          </div>

          {/* Quick Metrics Cluster (2-Column Mobile Grid) */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] text-slate-300 block mb-0.5">نقد و بانک</span>
              <span className="text-xs font-bold font-mono text-white block truncate">
                {formatMoney(totalLiquid, currencyUnit, numeralStyle)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10">
              <span className="text-[10px] text-amber-300 block mb-0.5">سرمایه‌گذاری</span>
              <span className="text-xs font-bold font-mono text-amber-300 block truncate">
                {formatMoney(totalInvestments, currencyUnit, numeralStyle)}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10 col-span-2 flex items-center justify-between">
              <span className="text-[10px] text-rose-300">کل بدهی‌ها:</span>
              <span className="text-xs font-bold font-mono text-rose-300">
                {formatMoney(totalLiabilities, currencyUnit, numeralStyle)}
              </span>
            </div>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Monthly Cash Flow Inflow/Outflow Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">درآمد ماه</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatMoney(monthlyIncome, currencyUnit, numeralStyle)}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('reports')} 
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            گزارش
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">هزینه‌های ماه</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatMoney(monthlyExpense, currencyUnit, numeralStyle)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">تراز:</span>
            <span className={`text-xs font-bold font-mono ${monthlyIncome >= monthlyExpense ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatMoney(monthlyIncome - monthlyExpense, currencyUnit, numeralStyle)}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Obligations Strip */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">سررسیدهای پیش‌رو</h3>
          </div>
          <button
            onClick={() => setActiveTab('loans')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            مشاهده همه ←
          </button>
        </div>

        {allUpcoming.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
            سررسیدی در ۲ هفته آینده وجود ندارد.
          </div>
        ) : (
          <div className="space-y-2">
            {allUpcoming.map((item) => {
              const isOverdue = item.daysDiff < 0;
              const isDueToday = item.daysDiff === 0;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all ${
                    isOverdue
                      ? 'bg-rose-50 border-rose-200'
                      : isDueToday
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isOverdue ? 'bg-rose-600 text-white' : isDueToday ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {item.type === 'installment' ? 'وام' : 'چک'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{item.title}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>سررسید: {item.jalaliDueDate}</span>
                        <span>·</span>
                        <span className={isOverdue ? 'text-rose-600 font-bold' : isDueToday ? 'text-amber-700 font-bold' : ''}>
                          {isOverdue 
                            ? `${toPersianDigits(Math.abs(item.daysDiff))} روز گذشته`
                            : isDueToday
                            ? 'امروز'
                            : `${toPersianDigits(item.daysDiff)} روز مانده`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 sm:mt-0 justify-between sm:justify-end">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {formatMoney(item.amount, currencyUnit, numeralStyle)}
                    </span>
                    {item.type === 'installment' && (
                      <button
                        onClick={() => payLoanInstallment(item.installmentId, item.repaymentAccountId)}
                        className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                      >
                        پرداخت
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accounts Overview Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">حساب‌ها</h3>
          </div>
          <button 
            onClick={() => setIsQuickAddOpen(true)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            + انتقال
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{acc.name}</h4>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {acc.cardNumber || acc.accountNumber || (acc.type === 'cash' ? 'وجه نقد' : 'حساب سرمایه‌گذاری')}
                  </span>
                </div>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: acc.color }}
                >
                  {acc.name.substring(0, 1)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">موجودی:</span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {formatMoney(acc.balance, currencyUnit, numeralStyle)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions List with Quick Delete */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">تراکنش‌های اخیر</h3>
          <button
            onClick={() => setActiveTab('transactions')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium whitespace-nowrap shrink-0"
          >
            مشاهده همه ←
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {transactions.slice(0, 6).map((txn) => {
            const isExpense = txn.kind === 'expense';
            const isIncome = txn.kind === 'income';
            return (
              <div 
                key={txn.id} 
                onClick={() => {
                  setEditingTransaction(txn);
                  setIsQuickAddOpen(true);
                }}
                className="py-3 px-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 active:bg-slate-100/70 rounded-xl transition-colors group"
                title="کلیک برای مشاهده و ویرایش تراکنش"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isExpense
                        ? 'bg-rose-50 text-rose-600'
                        : isIncome
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-sky-50 text-sky-600'
                    }`}
                  >
                    {isExpense ? '↓' : isIncome ? '↑' : '⇄'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[150px] xs:max-w-[180px] group-hover:text-emerald-700 transition-colors">
                      {txn.note || (isExpense ? 'هزینه متفرقه' : isIncome ? 'درآمد' : 'انتقال حساب')}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                      <span className="font-mono">{txn.jalaliDate}</span>
                      {txn.tags.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="truncate">#{txn.tags[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-left">
                  <span
                    className={`text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap ${
                      isExpense ? 'text-rose-600' : isIncome ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                  >
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatMoney(txn.amount, currencyUnit, numeralStyle)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
