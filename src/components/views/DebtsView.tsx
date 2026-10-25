import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, parseUserInputToRial, toEnglishDigits, toPersianDigits } from '../../utils/money';
import { getTodayJalali, daysBetweenJalali } from '../../utils/jalali';
import { 
  Users2, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MessageSquare, 
  Share2, 
  Check, 
  Calculator, 
  Coins, 
  FileText, 
  Calendar, 
  Sparkles,
  Phone,
  Clock,
  Printer
} from 'lucide-react';
import { DebtDirection, DebtEntry, DebtUnit, Person } from '../../types';

export const DebtsView: React.FC = () => {
  const { 
    people, 
    debts, 
    accounts, 
    assets,
    currencyUnit, 
    numeralStyle, 
    addDebtEntry, 
    settleDebt, 
    forgiveDebt,
    addPerson
  } = useApp();

  const todayJalali = getTodayJalali();

  const [selectedPersonId, setSelectedPersonId] = useState<string>(people[0]?.id || '');
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isGroupSplitOpen, setIsGroupSplitOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  // New Debt Form State
  const [formPersonId, setFormPersonId] = useState<string>(people[0]?.id || '');
  const [formNewPersonName, setFormNewPersonName] = useState('');
  const [formDirection, setFormDirection] = useState<DebtDirection>('lent');
  const [formUnit, setFormUnit] = useState<DebtUnit>('toman');
  const [formQuantityRaw, setFormQuantityRaw] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formAffectsAccount, setFormAffectsAccount] = useState(true);
  const [formAccountId, setFormAccountId] = useState(accounts[0]?.id || '');
  const [formNote, setFormNote] = useState('');

  // Group Split Form State
  const [splitTitle, setSplitTitle] = useState('شام دورهمی و رزرو ویلا');
  const [splitTotalRaw, setSplitTotalRaw] = useState('');
  const [splitPayerAccountId, setSplitPayerAccountId] = useState(accounts[0]?.id || '');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(people.map(p => p.id));

  // Compute stats
  const totalLent = debts
    .filter(d => d.direction === 'lent' && d.status === 'active')
    .reduce((sum, d) => sum + d.amountRial, 0);

  const totalBorrowed = debts
    .filter(d => d.direction === 'borrowed' && d.status === 'active')
    .reduce((sum, d) => sum + d.amountRial, 0);

  const selectedPerson = people.find(p => p.id === selectedPersonId);
  const personDebts = debts.filter(d => d.personId === selectedPersonId);

  // Running balance for selected person
  // If direction is lent, user owes me (+). If borrowed, I owe them (-).
  const personBalanceRial = personDebts
    .filter(d => d.status === 'active')
    .reduce((sum, d) => sum + (d.direction === 'lent' ? d.amountRial : -d.amountRial), 0);

  // Generate Polite Reminder Message
  const generatePoliteMessage = (debt: DebtEntry) => {
    const person = people.find(p => p.id === debt.personId);
    const amountStr = formatMoney(debt.amountRial, currencyUnit, numeralStyle);
    const msg = `سلام ${person?.name || 'دوست عزیز'} جان، وقتت بخیر 🌸\nامیدوارم همه چیز برات عالی باشه. پیرو موضوع «${debt.note || 'مبلغ امانتی'}» به مبلغ ${amountStr}${debt.jalaliDueDate ? ` با موعد سررسید ${debt.jalaliDueDate}` : ''}، ممنون می‌شم اگر برات مقدوره و وضعیتت هماهنگه، بررسی بفرمایی و تسویه حساب کنیم.\nخیلی متشکرم و ارادتمندم.`;
    setReminderMessage(msg);
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    let targetPersonId = formPersonId;

    if (formNewPersonName.trim()) {
      const newP = addPerson({ name: formNewPersonName.trim() });
      targetPersonId = newP.id;
    }

    const qty = parseFloat(toEnglishDigits(formQuantityRaw).replace(/,/g, '')) || 0;
    if (qty <= 0) return;

    // Calculate Rial value based on unit
    let computedRial = 0;
    let rateRial = 10;
    if (formUnit === 'toman') {
      computedRial = qty * 10;
      rateRial = 10;
    } else if (formUnit === 'rial') {
      computedRial = qty;
      rateRial = 1;
    } else if (formUnit === 'usd') {
      const usdAsset = assets.find(a => a.symbol === 'USD');
      rateRial = usdAsset?.currentPriceRial || 685000;
      computedRial = qty * rateRial;
    } else if (formUnit === 'gold_coin') {
      const coinAsset = assets.find(a => a.symbol === 'COIN_EMAMI');
      rateRial = coinAsset?.currentPriceRial || 512000000;
      computedRial = qty * rateRial;
    }

    addDebtEntry({
      personId: targetPersonId,
      direction: formDirection,
      amountRial: computedRial,
      originalUnit: formUnit,
      unitQuantity: qty,
      unitRateRial: rateRial,
      date: new Date().toISOString(),
      jalaliDate: todayJalali,
      dueDate: formDueDate || undefined,
      jalaliDueDate: formDueDate || undefined,
      affectsAccount: formAffectsAccount,
      accountId: formAffectsAccount ? formAccountId : undefined,
      note: formNote.trim() || undefined,
      status: 'active'
    });

    setIsAddDebtOpen(false);
    setFormQuantityRaw('');
    setFormNote('');
    setFormNewPersonName('');
  };

  const handleGroupSplit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalRial = parseUserInputToRial(splitTotalRaw, currencyUnit);
    if (totalRial <= 0 || selectedFriendIds.length === 0) return;

    // Total participants = selected friends + me
    const totalPeopleCount = selectedFriendIds.length + 1;
    const perPersonShareRial = Math.round(totalRial / totalPeopleCount);

    // Create a receivable for each friend
    selectedFriendIds.forEach((friendId) => {
      addDebtEntry({
        personId: friendId,
        direction: 'lent', // They owe me
        amountRial: perPersonShareRial,
        originalUnit: 'toman',
        unitQuantity: Math.floor(perPersonShareRial / 10),
        unitRateRial: 10,
        date: new Date().toISOString(),
        jalaliDate: todayJalali,
        affectsAccount: false, // payer account was already charged the full total
        note: `دنگ سهم از: ${splitTitle}`,
        status: 'active'
      });
    });

    setIsGroupSplitOpen(false);
    setSplitTotalRaw('');
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
            <Users2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">بدهی و طلب</h2>
            <span className="text-[11px] text-slate-400">
              {toPersianDigits(people.length)} نفر
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsGroupSplitOpen(true)}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-colors whitespace-nowrap shrink-0"
            title="تقسیم دُنگ گروهی"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
            <span>دُنگ</span>
          </button>

          <button
            onClick={() => setIsAddDebtOpen(true)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ ثبت</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-emerald-800">طلب‌ها</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <span className="text-sm sm:text-base font-bold tabular-nums text-emerald-950 truncate">
            {formatMoney(totalLent, currencyUnit, numeralStyle)}
          </span>
        </div>

        <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-rose-800">بدهی‌ها</span>
            <ArrowDownLeft className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <span className="text-sm sm:text-base font-bold tabular-nums text-rose-950 truncate">
            {formatMoney(totalBorrowed, currencyUnit, numeralStyle)}
          </span>
        </div>
      </div>

      {/* Native Android Horizontal People Scroller */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">مخاطبین و طرف‌حساب‌ها</h3>
          <span className="text-[11px] text-slate-400 font-mono">{toPersianDigits(people.length)} نفر</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {people.map((p) => {
            const pDebts = debts.filter(d => d.personId === p.id && d.status === 'active');
            const pBal = pDebts.reduce((sum, d) => sum + (d.direction === 'lent' ? d.amountRial : -d.amountRial), 0);
            const isSelected = p.id === selectedPersonId;

            return (
              <button
                key={p.id}
                onClick={() => setSelectedPersonId(p.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 transition-all text-right ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ backgroundColor: p.avatarColor || '#0284c7' }}
                >
                  {p.name.substring(0, 1)}
                </div>
                <div>
                  <span className="text-xs font-bold block truncate max-w-[90px]">{p.name}</span>
                  <span className={`text-[10px] font-mono block ${
                    pBal > 0 ? (isSelected ? 'text-emerald-300' : 'text-emerald-600') : pBal < 0 ? (isSelected ? 'text-rose-300' : 'text-rose-600') : 'text-slate-400'
                  }`}>
                    {pBal === 0 ? 'بی‌حساب' : `${pBal > 0 ? '+' : ''}${formatMoney(pBal, currencyUnit, numeralStyle)}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Person Running Ledger */}
      <div className="space-y-4">
        {selectedPerson ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
              
              {/* Person Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-sm"
                    style={{ backgroundColor: selectedPerson.avatarColor || '#0284c7' }}
                  >
                    {selectedPerson.name.substring(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedPerson.name}</h3>
                    <p className="text-xs text-slate-500">{selectedPerson.phone || selectedPerson.notes || 'طرف حساب شخصی'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStatementOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>صورتحساب</span>
                  </button>
                  <div className="text-left bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">تراز:</span>
                    <span className={`text-sm font-bold font-mono ${
                      personBalanceRial > 0 ? 'text-emerald-700' : personBalanceRial < 0 ? 'text-rose-700' : 'text-slate-700'
                    }`}>
                      {formatMoney(personBalanceRial, currencyUnit, numeralStyle)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Polite Reminder Generator Box */}
              {reminderMessage && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-700" />
                      <span>متن یادآوری طلب:</span>
                    </div>
                    <button
                      onClick={() => setReminderMessage(null)}
                      className="text-emerald-700 hover:text-emerald-900 text-xs"
                    >
                      بستن
                    </button>
                  </div>
                  <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-emerald-100">
                    {reminderMessage}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(reminderMessage);
                      alert('متن پیام در کلیپ‌بورد کپی شد!');
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium"
                  >
                    کپی پیام
                  </button>
                </div>
              )}

              {/* Transactions History Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900">ریز حساب</div>

                {personDebts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl">
                    سابقه‌ای برای این شخص ثبت نشده است.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {personDebts.map((debt) => {
                      const isLent = debt.direction === 'lent';
                      const isSettled = debt.status === 'settled';
                      const isForgiven = debt.status === 'forgiven';

                      return (
                        <div
                          key={debt.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSettled
                              ? 'bg-slate-50/60 border-slate-200 opacity-75'
                              : isLent
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-rose-50/40 border-rose-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isLent ? 'text-emerald-800' : 'text-rose-800'}`}>
                                {isLent ? 'طلب' : 'بدهی'}
                              </span>
                              {debt.originalUnit !== 'toman' && debt.originalUnit !== 'rial' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                                  {toPersianDigits(debt.unitQuantity)} {debt.originalUnit === 'gold_coin' ? 'سکه طلا' : 'دلار'}
                                </span>
                              )}
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-600">{debt.jalaliDate}</span>
                            </div>

                            <p className="text-xs text-slate-800 mt-1">{debt.note || 'بدون بابت'}</p>

                            {debt.jalaliDueDate && (
                              <span className="text-[11px] text-amber-700 block mt-0.5">
                                وعده پرداخت: {debt.jalaliDueDate}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 justify-between sm:justify-end">
                            <div className="text-right">
                              <span className="text-xs font-bold font-mono text-slate-900 block">
                                {formatMoney(debt.amountRial, currencyUnit, numeralStyle)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {isSettled ? 'تسویه شده' : isForgiven ? 'بخشیده شد' : 'جاری'}
                              </span>
                            </div>

                            {!isSettled && !isForgiven && (
                              <div className="flex items-center gap-1.5">
                                {isLent && (
                                  <button
                                    onClick={() => generatePoliteMessage(debt)}
                                    title="تولید متن پیام یادآوری محترمانه"
                                    className="p-1.5 bg-white text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => settleDebt(debt.id, debt.amountRial, accounts[0]?.id)}
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium"
                                >
                                  تسویه کامل
                                </button>
                                <button
                                  onClick={() => forgiveDebt(debt.id)}
                                  title="بخشیدن و سوخت بدهی"
                                  className="px-1.5 py-1 text-slate-400 hover:text-rose-600 text-[11px]"
                                >
                                  بخشیدن
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              لطفاً یک مخاطب را از فهرست سمت راست انتخاب کنید.
            </div>
          )}
        </div>

      {/* Add Debt Modal */}
      {isAddDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">ثبت طلب یا بدهی جدید</h3>
              <button onClick={() => setIsAddDebtOpen(false)} className="text-slate-400 hover:text-slate-700 text-base font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateDebt} className="p-5 space-y-4 overflow-y-auto">
              
              {/* Direction: Lent vs Borrowed */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormDirection('lent')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    formDirection === 'lent' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  من قرض دادم (طلبکارم)
                </button>
                <button
                  type="button"
                  onClick={() => setFormDirection('borrowed')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    formDirection === 'borrowed' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  من قرض گرفتم (بدهکارم)
                </button>
              </div>

              {/* Person Picker or New Person */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">طرف‌حساب / شخص</label>
                <div className="space-y-2">
                  <select
                    value={formPersonId}
                    onChange={(e) => setFormPersonId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phone || 'بدون تلفن'})</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="یا افزودن نام شخص جدید..."
                    value={formNewPersonName}
                    onChange={(e) => setFormNewPersonName(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Unit: Toman, USD, Gold Coin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">واحد ارزش</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as DebtUnit)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="toman">تومان ایران</option>
                    <option value="rial">ریال ایران</option>
                    <option value="usd">دلار آمریکا ($)</option>
                    <option value="gold_coin">سکه تمام بهار آزادی</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    مقدار / مبلغ ({formUnit === 'gold_coin' ? 'تعداد سکه' : formUnit === 'usd' ? 'دلار' : 'تومان'})
                  </label>
                  <input
                    type="text"
                    value={formQuantityRaw}
                    onChange={(e) => setFormQuantityRaw(e.target.value)}
                    placeholder="مثلاً: 2 یا 15,000,000"
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Due Date & Affects Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">تاریخ وعده پرداخت</label>
                  <input
                    type="text"
                    placeholder="1405/08/30"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={formAffectsAccount}
                      onChange={(e) => setFormAffectsAccount(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span className="text-[11px] font-medium text-slate-700">از حساب بانکی کسر/واریز شود</span>
                  </label>
                </div>
              </div>

              {formAffectsAccount && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">حساب مبداء / مقصد</label>
                  <select
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} - موجودی: {formatMoney(acc.balance, currencyUnit, numeralStyle)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">توضیحات و بابت</label>
                <input
                  type="text"
                  placeholder="مثلاً: هزینه هتل سفر مشهد..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 transition-colors"
                >
                  ثبت در دفتر مطالبات و بدهی‌ها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Split (دنگی دنگی) Modal */}
      {isGroupSplitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">تقسیم خودکار فاکتور گروهی (دنگی دنگی)</h3>
              </div>
              <button onClick={() => setIsGroupSplitOpen(false)} className="text-slate-400 hover:text-slate-700 text-base font-bold">✕</button>
            </div>

            <form onSubmit={handleGroupSplit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">عنوان برنامه / مناسبت</label>
                <input
                  type="text"
                  value={splitTitle}
                  onChange={(e) => setSplitTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  مبلغ کل فاکتور پرداخت شده توسط من ({currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'})
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: 6,000,000"
                  value={splitTotalRaw}
                  onChange={(e) => setSplitTotalRaw(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  هم‌سفره‌ها / دوستان حاضر در تقسیم (سهم من + این افراد):
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {people.map(p => {
                    const isChecked = selectedFriendIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 cursor-pointer">
                        <span className="text-xs font-medium text-slate-800">{p.name}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFriendIds([...selectedFriendIds, p.id]);
                            } else {
                              setSelectedFriendIds(selectedFriendIds.filter(id => id !== p.id));
                            }
                          }}
                          className="rounded text-indigo-600"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {splitTotalRaw && selectedFriendIds.length > 0 && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs">
                  <span className="text-indigo-900 block font-bold mb-1">محاسبه سهم هر فرد:</span>
                  <p className="text-indigo-800 font-mono">
                    مبلغ برای {toPersianDigits(selectedFriendIds.length + 1)} نفر تقسیم می‌شود. سهم طلب از هر دوست: {formatMoney(Math.round(parseUserInputToRial(splitTotalRaw, currencyUnit) / (selectedFriendIds.length + 1)), currencyUnit, numeralStyle)}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  تولید خودکار طلب‌ها در دفتر اشخاص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shareable Statement Modal (قابل چاپ و ارسال در پیام‌رسان‌ها) */}
      {isStatementOpen && selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
              <h3 className="text-sm font-bold text-slate-900">صورتحساب طرف‌حساب ({selectedPerson.name})</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ / PDF</span>
                </button>
                <button onClick={() => setIsStatementOpen(false)} className="text-slate-400 hover:text-slate-700 text-base font-bold">✕</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 print-only font-sans">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">صورتحساب مالی شخصی — حساب+</h2>
                  <p className="text-xs text-slate-500">تاریخ صدور: {todayJalali}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">طرف‌حساب:</span>
                  <span className="text-sm font-bold text-slate-900">{selectedPerson.name}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-700 font-semibold">تراز پایانی حساب:</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatMoney(personBalanceRial, currencyUnit, numeralStyle)}
                  <span className="text-xs font-normal text-slate-500 mr-2">
                    ({personBalanceRial > 0 ? 'شما بستانکارید / طلب دارید' : 'شما بدهکارید'})
                  </span>
                </span>
              </div>

              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2">ردیف</th>
                    <th className="py-2">تاریخ</th>
                    <th className="py-2">شرح و بابت</th>
                    <th className="py-2">بدهکار</th>
                    <th className="py-2">بستانکار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personDebts.map((d, i) => (
                    <tr key={d.id} className="py-2">
                      <td className="py-2 font-mono">{toPersianDigits(i + 1)}</td>
                      <td className="py-2 font-mono">{d.jalaliDate}</td>
                      <td className="py-2">{d.note || 'تراکنش ثبت شده'}</td>
                      <td className="py-2 font-mono text-rose-600">
                        {d.direction === 'borrowed' ? formatMoney(d.amountRial, currencyUnit, numeralStyle) : '-'}
                      </td>
                      <td className="py-2 font-mono text-emerald-600">
                        {d.direction === 'lent' ? formatMoney(d.amountRial, currencyUnit, numeralStyle) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
