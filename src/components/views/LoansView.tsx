import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, parseUserInputToRial, toEnglishDigits, toPersianDigits } from '../../utils/money';
import { daysBetweenJalali, getTodayJalali } from '../../utils/jalali';
import { 
  Landmark, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ShieldAlert, 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  ArrowRight,
  BatteryCharging,
  BellRing
} from 'lucide-react';
import { calculateEarlyPayoffSavings, calculateOverduePenalty, generateAmortizationSchedule } from '../../utils/amortization';
import { InterestModel, Loan } from '../../types';

export const LoansView: React.FC = () => {
  const { 
    loans, 
    installments, 
    accounts, 
    currencyUnit, 
    numeralStyle, 
    payLoanInstallment, 
    snoozeInstallment,
    addLoan 
  } = useApp();

  const todayJalali = getTodayJalali();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>(loans[0]?.id || '');
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(loans[0]?.id || null);
  const [earlyPayoffInput, setEarlyPayoffInput] = useState<string>('50000000'); // 50M Toman
  const [showHealthCheck, setShowHealthCheck] = useState<boolean>(false);

  // New Loan Form State
  const [newLender, setNewLender] = useState('');
  const [newPrincipalRaw, setNewPrincipalRaw] = useState('');
  const [newRate, setNewRate] = useState('23');
  const [newMonths, setNewMonths] = useState('24');
  const [newModel, setNewModel] = useState<InterestModel>('reducing_balance');
  const [newFirstDueDate, setNewFirstDueDate] = useState(todayJalali);
  const [newAccountId, setNewAccountId] = useState(accounts[0]?.id || '');

  const activeLoan = loans.find(l => l.id === (selectedLoanId || loans[0]?.id));
  const activeInstallments = installments.filter(i => i.loanId === activeLoan?.id);

  // Remaining principal and interest
  const remainingPrincipal = activeInstallments
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.principalPart, 0);

  const remainingInterest = activeInstallments
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.interestPart, 0);

  const totalPaidPrincipal = activeInstallments
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.principalPart, 0);

  const paidCount = activeInstallments.filter(i => i.status === 'paid').length;
  const progressPercent = activeLoan ? Math.round((paidCount / activeLoan.installmentCount) * 100) : 0;

  // Early payoff computation
  const extraPaymentRial = parseUserInputToRial(earlyPayoffInput, currencyUnit);
  const earlyPayoffResult = activeLoan ? calculateEarlyPayoffSavings(
    remainingPrincipal,
    activeLoan.annualRatePercent,
    activeInstallments.filter(i => i.status !== 'paid').length,
    extraPaymentRial
  ) : null;

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const principalRial = parseUserInputToRial(newPrincipalRaw, currencyUnit);
    if (!newLender || principalRial <= 0) return;

    addLoan({
      lender: newLender,
      principal: principalRial,
      annualRatePercent: parseFloat(newRate) || 0,
      totalFee: 0,
      installmentCount: parseInt(newMonths, 10) || 12,
      frequencyMonths: 1,
      startDate: newFirstDueDate,
      repaymentAccountId: newAccountId,
      status: 'active',
      interestModel: newModel
    });

    setIsAddModalOpen(false);
    setNewLender('');
    setNewPrincipalRaw('');
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Banner & Title */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
            <Landmark className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">وام‌ها</h2>
            <span className="text-[11px] text-slate-400">
              {toPersianDigits(loans.length)} وام فعال
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowHealthCheck(!showHealthCheck)}
            className="p-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
            title="راهنمای یادآورها"
            aria-label="یادآورها"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </button>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ وام</span>
          </button>
        </div>
      </div>

      {/* Android Alarm Checklist Drawer */}
      {showHealthCheck && (
        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <BellRing className="w-4 h-4 text-amber-700" />
              <span>راهنمای یادآورها</span>
            </div>
            <button
              onClick={() => setShowHealthCheck(false)}
              className="text-amber-800 text-xs hover:underline"
            >
              بستن
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs">
              <span className="font-bold text-slate-800 block mb-0.5">شیائومی:</span>
              <p className="text-[11px] text-slate-600">تنظیمات → برنامه‌ها → مجوز شروع خودکار (Autostart)</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs">
              <span className="font-bold text-slate-800 block mb-0.5">سامسونگ:</span>
              <p className="text-[11px] text-slate-600">باتری → خروج از برنامه‌های خواب عمیق</p>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs">
              <span className="font-bold text-slate-800 block mb-0.5">مجوز آلارم دقیق:</span>
              <div className="flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>فعال و تایید شده</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loans Carousel / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loans.map((loan) => {
          const lInstallments = installments.filter(i => i.loanId === loan.id);
          const lPaidCount = lInstallments.filter(i => i.status === 'paid').length;
          const lRemainingPrincipal = lInstallments
            .filter(i => i.status !== 'paid')
            .reduce((sum, i) => sum + i.principalPart, 0);
          const nextDue = lInstallments.find(i => i.status !== 'paid');
          const isSelected = loan.id === selectedLoanId;

          return (
            <div
              key={loan.id}
              onClick={() => setSelectedLoanId(loan.id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-lg border-slate-900'
                  : 'bg-white text-slate-900 hover:border-slate-300 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[11px] font-semibold block mb-0.5 ${isSelected ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    {loan.interestModel === 'reducing_balance' ? 'بانکی' : loan.interestModel === 'qard_hasan' ? 'قرض‌الحسنه' : 'کارمزد ثابت'}
                  </span>
                  <h3 className="text-sm font-bold truncate">{loan.lender}</h3>
                  <span className={`text-xs block mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    اصل وام: {formatMoney(loan.principal, currencyUnit, numeralStyle)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] block opacity-75">اقساط:</span>
                  <span className="text-sm font-bold font-mono">
                    {toPersianDigits(lPaidCount)} از {toPersianDigits(loan.installmentCount)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/30 rounded-full h-2 my-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((lPaidCount / loan.installmentCount) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/20">
                <div>
                  <span className="opacity-70">مانده اصل: </span>
                  <span className="font-bold font-mono">
                    {formatMoney(lRemainingPrincipal, currencyUnit, numeralStyle)}
                  </span>
                </div>
                {nextDue && (
                  <div className="text-amber-400 text-[11px] font-medium">
                    قسط بعدی: {nextDue.jalaliDueDate}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Loan Details & Tools */}
      {activeLoan && (
        <div className="space-y-4">
          
          {/* Early Payoff Calculator */}
          <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 space-y-3">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
              <Calculator className="w-4 h-4 text-indigo-700" />
              <span>ماشین‌حساب تسویه زودهنگام</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-[11px] font-semibold text-indigo-900 block mb-1">
                  مبلغ تسویه اضافه ({currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'}):
                </label>
                <input
                  type="text"
                  value={earlyPayoffInput}
                  onChange={(e) => setEarlyPayoffInput(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-indigo-200 rounded-lg font-mono text-left"
                  dir="ltr"
                />
              </div>

              {earlyPayoffResult && (
                <>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-200 text-xs">
                    <span className="text-[11px] text-slate-500 block">سود صرفه‌جویی شده:</span>
                    <span className="text-emerald-700 font-bold font-mono">
                      {formatMoney(earlyPayoffResult.interestSavedRial, currencyUnit, numeralStyle)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-indigo-200 text-xs">
                    <span className="text-[11px] text-slate-500 block">کاهش مدت وام:</span>
                    <span className="text-indigo-700 font-bold font-mono">
                      {toPersianDigits(earlyPayoffResult.monthsSaved)} ماه سریع‌تر
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Installment Cards with Mobile Ergonomics */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  اقساط وام {activeLoan.lender}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {activeInstallments.filter(i => i.status === 'paid').length} پرداخت شده / {activeInstallments.filter(i => i.status !== 'paid').length} مانده
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {activeInstallments.map((inst) => {
                const isPaid = inst.status === 'paid';
                const isDue = inst.status === 'due';
                const isOverdue = inst.status === 'overdue';
                const daysDiff = daysBetweenJalali(todayJalali, inst.jalaliDueDate);

                return (
                  <div
                    key={inst.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isPaid
                        ? 'bg-slate-50/70 border-slate-200'
                        : isDue
                        ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                        : isOverdue
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Header: Installment Number & Status Pill */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono font-bold text-[11px] flex items-center justify-center">
                          {toPersianDigits(inst.installmentNumber)}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 font-mono">
                          سررسید: {inst.jalaliDueDate}
                        </span>
                      </div>

                      {isPaid ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>پرداخت شده</span>
                        </span>
                      ) : isDue ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          سررسید امروز
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                          معوق
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {toPersianDigits(Math.max(0, daysDiff))} روز مانده
                        </span>
                      )}
                    </div>

                    {/* Amount & Principal/Interest breakdown */}
                    <div className="flex items-center justify-between py-1 border-t border-slate-100 mt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block">مبلغ قسط:</span>
                        <span className="text-sm font-bold font-mono text-slate-900">
                          {formatMoney(inst.amount, currencyUnit, numeralStyle)}
                        </span>
                      </div>
                      <div className="text-left text-[10px] text-slate-500 font-mono space-y-0.5">
                        <div>اصل: {formatMoney(inst.principalPart, currencyUnit, numeralStyle)}</div>
                        <div>سود: {formatMoney(inst.interestPart, currencyUnit, numeralStyle)}</div>
                      </div>
                    </div>

                    {/* Action buttons if unpaid */}
                    {!isPaid && (
                      <div className="flex items-center gap-2 pt-2 mt-1 border-t border-slate-100">
                        <button
                          onClick={() => payLoanInstallment(inst.id, activeLoan.repaymentAccountId)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-transform active:scale-98 shadow-xs"
                        >
                          پرداخت قسط
                        </button>
                        <button
                          onClick={() => snoozeInstallment(inst.id, 7)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
                        >
                          اسنوز (۷ روز)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Add Loan Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">تعریف وام بانکی یا تسهیلات جدید</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">نام بانک یا پرداخت‌کننده تسهیلات</label>
                <input
                  type="text"
                  placeholder="مثلاً: بانک ملت (طرح رشد) یا قرض‌الحسنه رسالت"
                  value={newLender}
                  onChange={(e) => setNewLender(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  اصل مبلغ وام ({currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'})
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: 100,000,000"
                  value={newPrincipalRaw}
                  onChange={(e) => setNewPrincipalRaw(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">مدل محاسبه سود</label>
                  <select
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value as InterestModel)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="reducing_balance">کاهش‌یابنده مساوی بانکی (فرمول PMT)</option>
                    <option value="flat_rate">کارمزد ثابت (Flat Rate / BNPL)</option>
                    <option value="qard_hasan">قرض‌الحسنه ۴٪ یا ۰٪</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">نرخ سود سالانه (درصد)</label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">تعداد اقساط ماهانه</label>
                  <input
                    type="number"
                    value={newMonths}
                    onChange={(e) => setNewMonths(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">تاریخ اولین قسط</label>
                  <input
                    type="text"
                    value={newFirstDueDate}
                    onChange={(e) => setNewFirstDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">حساب واریز اصل و کسر اقساط</label>
                <select
                  value={newAccountId}
                  onChange={(e) => setNewAccountId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} - موجودی: {formatMoney(acc.balance, currencyUnit, numeralStyle)}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 transition-colors"
                >
                  محاسبه جدول استهلاک و ثبت وام
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
