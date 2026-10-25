import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, parseUserInputToRial, toPersianDigits } from '../../utils/money';
import { getTodayJalali, daysBetweenJalali } from '../../utils/jalali';
import { 
  FileCheck2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building2,
  Calendar
} from 'lucide-react';
import { Cheque, ChequeStatus } from '../../types';

export const ChequesView: React.FC = () => {
  const { 
    cheques, 
    accounts, 
    currencyUnit, 
    numeralStyle, 
    addCheque, 
    updateChequeStatus 
  } = useApp();

  const todayJalali = getTodayJalali();

  const [isAddChequeOpen, setIsAddChequeOpen] = useState(false);
  const [filterDirection, setFilterDirection] = useState<'all' | 'received' | 'issued'>('all');

  // Form State
  const [chDirection, setChDirection] = useState<'received' | 'issued'>('issued');
  const [chNumber, setChNumber] = useState('');
  const [chBank, setChBank] = useState('بانک سامان');
  const [chAmountRaw, setChAmountRaw] = useState('');
  const [chDueDate, setChDueDate] = useState('');
  const [chCounterparty, setChCounterparty] = useState('');
  const [chNote, setChNote] = useState('');

  const filteredCheques = cheques.filter(c => {
    if (filterDirection !== 'all' && c.direction !== filterDirection) return false;
    return true;
  });

  const totalIssuedPending = cheques
    .filter(c => c.direction === 'issued' && c.status === 'pending')
    .reduce((s, c) => s + c.amount, 0);

  const totalReceivedPending = cheques
    .filter(c => c.direction === 'received' && c.status === 'pending')
    .reduce((s, c) => s + c.amount, 0);

  const handleCreateCheque = (e: React.FormEvent) => {
    e.preventDefault();
    const amountRial = parseUserInputToRial(chAmountRaw, currencyUnit);
    if (amountRial <= 0 || !chNumber || !chDueDate) return;

    addCheque({
      direction: chDirection,
      number: chNumber,
      bank: chBank,
      amount: amountRial,
      issueDate: todayJalali,
      dueDate: new Date().toISOString(),
      jalaliDueDate: chDueDate,
      counterparty: chCounterparty || 'عمومی',
      status: 'pending',
      note: chNote.trim() || undefined
    });

    setIsAddChequeOpen(false);
    setChNumber('');
    setChAmountRaw('');
    setChCounterparty('');
    setChNote('');
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
            <FileCheck2 className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">چک‌های صیاد</h2>
          </div>
        </div>

        <button
          onClick={() => setIsAddChequeOpen(true)}
          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ چک</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">چک‌های پرداختی:</span>
            <span className="text-base font-bold font-mono text-rose-700">
              {formatMoney(totalIssuedPending, currencyUnit, numeralStyle)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">چک‌های دریافتی:</span>
            <span className="text-base font-bold font-mono text-emerald-700">
              {formatMoney(totalReceivedPending, currencyUnit, numeralStyle)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Cheques Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterDirection('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg ${filterDirection === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              همه
            </button>
            <button
              onClick={() => setFilterDirection('issued')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg ${filterDirection === 'issued' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              پرداختی
            </button>
            <button
              onClick={() => setFilterDirection('received')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg ${filterDirection === 'received' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              دریافتی
            </button>
          </div>
          <span className="text-xs text-slate-400 font-mono">{toPersianDigits(filteredCheques.length)} چک</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredCheques.map((ch) => {
            const isIssued = ch.direction === 'issued';
            const isPending = ch.status === 'pending';
            const isCashed = ch.status === 'cashed';
            const daysDiff = daysBetweenJalali(todayJalali, ch.jalaliDueDate);

            return (
              <div key={ch.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isIssued ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isIssued ? 'صادره' : 'وارده'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{ch.counterparty}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {ch.bank}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        صیاد: {ch.number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>سررسید: {ch.jalaliDueDate}</span>
                      {isPending && (
                        <>
                          <span>·</span>
                          <span className={daysDiff <= 3 ? 'text-amber-600 font-bold' : ''}>
                            {daysDiff < 0 ? `${toPersianDigits(Math.abs(daysDiff))} روز گذشته` : `${toPersianDigits(daysDiff)} روز مانده`}
                          </span>
                        </>
                      )}
                      {ch.note && (
                        <>
                          <span>·</span>
                          <span>بابت: {ch.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-slate-900 block">
                      {formatMoney(ch.amount, currencyUnit, numeralStyle)}
                    </span>
                    <span className={`text-[10px] font-medium ${isCashed ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isCashed ? 'پاس / وصول شده' : 'در انتظار سررسید'}
                    </span>
                  </div>

                  {isPending && (
                    <button
                      onClick={() => updateChequeStatus(ch.id, 'cashed', accounts[0]?.id)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition-transform active:scale-95"
                    >
                      {isIssued ? 'ثبت پاس شدن چک' : 'ثبت وصول چک'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Cheque Modal */}
      {isAddChequeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">ثبت برگه چک صیادی جدید</h3>
              <button onClick={() => setIsAddChequeOpen(false)} className="text-slate-400 hover:text-slate-700 text-base font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCheque} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setChDirection('issued')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    chDirection === 'issued' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  چک صادر شده (پرداختی من)
                </button>
                <button
                  type="button"
                  onClick={() => setChDirection('received')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    chDirection === 'received' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700'
                  }`}
                >
                  چک دریافت شده (از دیگری)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  شناسه ۱۶ رقمی صیاد / شماره چک
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: 9821-4458-1029-3847"
                  value={chNumber}
                  onChange={(e) => setChNumber(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center tracking-wider"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">بانک صادرکننده</label>
                  <input
                    type="text"
                    value={chBank}
                    onChange={(e) => setChBank(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    مبلغ چک ({currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'})
                  </label>
                  <input
                    type="text"
                    placeholder="مثلاً: 40,000,000"
                    value={chAmountRaw}
                    onChange={(e) => setChAmountRaw(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">تاریخ سررسید چک</label>
                  <input
                    type="text"
                    placeholder="1405/09/15"
                    value={chDueDate}
                    onChange={(e) => setChDueDate(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-center"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">گیرنده / صادرکننده</label>
                  <input
                    type="text"
                    placeholder="نام شخص یا شرکت"
                    value={chCounterparty}
                    onChange={(e) => setChCounterparty(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">بابت و شرح</label>
                <input
                  type="text"
                  placeholder="مثلاً: قسط رهن یا فاکتور تجهیزات..."
                  value={chNote}
                  onChange={(e) => setChNote(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 transition-colors"
                >
                  ثبت چک در سامانه یادآورها
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
