import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  ArrowLeftRight, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Trash2, 
  Tag, 
  Calendar, 
  User, 
  FileText, 
  Paperclip,
  Check
} from 'lucide-react';
import { formatMoney, numberToPersianWords, parseUserInputToRial, toEnglishDigits, toPersianDigits } from '../utils/money';
import { getTodayJalali } from '../utils/jalali';
import { TransactionKind, TransactionSplit } from '../types';

export const QuickAddModal: React.FC = () => {
  const { 
    isQuickAddOpen, 
    setIsQuickAddOpen, 
    editingTransaction,
    setEditingTransaction,
    accounts, 
    categories, 
    people, 
    addTransaction,
    updateTransaction,
    deleteTransaction,
    currencyUnit,
    numeralStyle
  } = useApp();

  const [kind, setKind] = useState<TransactionKind>('expense');
  const [rawAmount, setRawAmount] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat-groceries');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [jalaliDate, setJalaliDate] = useState<string>(getTodayJalali());
  const [feeInput, setFeeInput] = useState<string>('720'); // 720 Toman standard card-to-card
  const [isSplitActive, setIsSplitActive] = useState<boolean>(false);
  const [splits, setSplits] = useState<TransactionSplit[]>([
    { id: '1', categoryId: 'cat-groceries', amount: 0, note: '' }
  ]);
  const [attachmentName, setAttachmentName] = useState<string>('');

  // Sync state whenever modal opens or editingTransaction changes
  React.useEffect(() => {
    if (editingTransaction) {
      setKind(editingTransaction.kind);
      const displayAmount = currencyUnit === 'TOMAN' 
        ? Math.floor(editingTransaction.amount / 10) 
        : editingTransaction.amount;
      setRawAmount(displayAmount.toLocaleString('en-US'));
      setSelectedAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || accounts[1]?.id || accounts[0]?.id || '');
      setSelectedCategoryId(editingTransaction.categoryId || 'cat-groceries');
      setSelectedPersonId(editingTransaction.personId || '');
      setNote(editingTransaction.note || '');
      setTags(editingTransaction.tags || []);
      setJalaliDate(editingTransaction.jalaliDate || getTodayJalali());
      if (editingTransaction.fee) {
        const displayFee = currencyUnit === 'TOMAN' ? Math.floor(editingTransaction.fee / 10) : editingTransaction.fee;
        setFeeInput(displayFee.toLocaleString('en-US'));
      }
      if (editingTransaction.splitItems && editingTransaction.splitItems.length > 0) {
        setIsSplitActive(true);
        setSplits(editingTransaction.splitItems);
      } else {
        setIsSplitActive(false);
      }
    } else {
      setKind('expense');
      setRawAmount('');
      setSelectedAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || '');
      setSelectedCategoryId('cat-groceries');
      setSelectedPersonId('');
      setNote('');
      setTags([]);
      setJalaliDate(getTodayJalali());
      setFeeInput('720');
      setIsSplitActive(false);
      setSplits([{ id: '1', categoryId: 'cat-groceries', amount: 0, note: '' }]);
      setAttachmentName('');
    }
  }, [editingTransaction, isQuickAddOpen, currencyUnit, accounts]);

  if (!isQuickAddOpen) return null;

  // Convert raw amount string to Rial integer
  const amountRial = parseUserInputToRial(rawAmount, currencyUnit);
  const amountToman = Math.floor(amountRial / 10);
  const amountInWords = amountToman > 0 ? numberToPersianWords(amountToman) : '';

  const filteredCategories = categories.filter(c => c.kind === kind && c.parentId !== null);

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const cleanTag = tagInput.replace(/^#/, '').trim();
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput('');
  };

  const handleQuickAddChip = (addToman: number) => {
    const currentToman = Math.floor(amountRial / 10);
    const newToman = currentToman + addToman;
    setRawAmount(newToman.toLocaleString('en-US'));
  };

  const handleClose = () => {
    setEditingTransaction(null);
    setIsQuickAddOpen(false);
  };

  const handleDelete = () => {
    if (!editingTransaction) return;
    if (confirm('آیا از حذف این تراکنش اطمینان دارید؟ اثر مالی آن بر موجودی حساب‌ها نیز اصلاح خواهد شد.')) {
      deleteTransaction(editingTransaction.id);
      handleClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountRial <= 0) return;

    const feeRial = kind === 'transfer' ? parseUserInputToRial(feeInput, currencyUnit) : 0;

    if (editingTransaction) {
      updateTransaction({
        ...editingTransaction,
        kind,
        accountId: selectedAccountId,
        toAccountId: kind === 'transfer' ? toAccountId : undefined,
        amount: amountRial,
        fee: feeRial,
        jalaliDate: jalaliDate || getTodayJalali(),
        categoryId: kind !== 'transfer' ? selectedCategoryId : undefined,
        personId: selectedPersonId || undefined,
        note: note.trim() || undefined,
        tags,
        splitItems: isSplitActive && splits.length > 0 ? splits : undefined,
        attachmentUrl: attachmentName ? 'mock-receipt.jpg' : editingTransaction.attachmentUrl
      });
    } else {
      addTransaction({
        kind,
        accountId: selectedAccountId,
        toAccountId: kind === 'transfer' ? toAccountId : undefined,
        amount: amountRial,
        fee: feeRial,
        date: new Date().toISOString(),
        jalaliDate: jalaliDate || getTodayJalali(),
        categoryId: kind !== 'transfer' ? selectedCategoryId : undefined,
        personId: selectedPersonId || undefined,
        note: note.trim() || undefined,
        tags,
        status: 'posted',
        splitItems: isSplitActive && splits.length > 0 ? splits : undefined,
        attachmentUrl: attachmentName ? 'mock-receipt.jpg' : undefined
      });
    }

    handleClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-lg mx-auto bg-white rounded-t-[32px] shadow-2xl border-t border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Android Material 3 Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              {editingTransaction ? 'ویرایش تراکنش' : 'ثبت تراکنش'}
            </h2>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-mono">{jalaliDate}</span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Kind Selector (Expense / Income / Transfer) */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setKind('expense')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                kind === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>هزینه</span>
            </button>
            <button
              type="button"
              onClick={() => setKind('income')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                kind === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>درآمد</span>
            </button>
            <button
              type="button"
              onClick={() => setKind('transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                kind === 'transfer'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>انتقال</span>
            </button>
          </div>

          {/* Amount Input with Words Indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700">مبلغ ({currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'})</label>
              {amountToman > 0 && (
                <span className="text-[11px] text-emerald-700 font-medium truncate max-w-[280px]">
                  {amountInWords}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="۰"
                value={rawAmount}
                onChange={(e) => {
                  const cleaned = toEnglishDigits(e.target.value).replace(/[^0-9]/g, '');
                  if (!cleaned) {
                    setRawAmount('');
                  } else {
                    setRawAmount(parseInt(cleaned, 10).toLocaleString('en-US'));
                  }
                }}
                className="w-full text-2xl font-bold tracking-tight text-slate-900 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-left font-mono tabular-nums"
                dir="ltr"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                {currencyUnit === 'TOMAN' ? 'تومان' : 'ریال'}
              </span>
            </div>

            {/* Quick Amount Add Chips */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
              {[100000, 500000, 1000000, 5000000, 10000000].map((tomanVal) => (
                <button
                  key={tomanVal}
                  type="button"
                  onClick={() => handleQuickAddChip(tomanVal)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors whitespace-nowrap border border-slate-200 font-mono"
                >
                  +{toPersianDigits(tomanVal >= 1000000 ? `${tomanVal / 1000000} م` : `${tomanVal / 1000} ک`)}
                </button>
              ))}
            </div>
          </div>

          {/* Account Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {kind === 'transfer' ? 'از حساب مبداء' : 'حساب'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                    selectedAccountId === acc.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-semibold truncate">{acc.name}</span>
                  <span className={`text-[11px] font-mono tabular-nums mt-1 ${selectedAccountId === acc.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    موجودی: {formatMoney(acc.balance, currencyUnit, numeralStyle)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Transfer Destination & Fee */}
          {kind === 'transfer' && (
            <div className="space-y-2 p-3 bg-sky-50 rounded-xl border border-sky-100">
              <div>
                <label className="text-xs font-semibold text-sky-950 block mb-1.5">به حساب مقصد</label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts.filter(a => a.id !== selectedAccountId).map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setToAccountId(acc.id)}
                      className={`p-2 rounded-lg border text-right transition-all ${
                        toAccountId === acc.id
                          ? 'border-sky-600 bg-sky-600 text-white font-medium'
                          : 'border-sky-200 bg-white text-slate-700 hover:bg-sky-100/50'
                      }`}
                    >
                      <span className="text-xs truncate block">{acc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-sky-900">کارمزد انتقال:</span>
                <input
                  type="text"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="w-24 px-2 py-1 text-center bg-white border border-sky-200 rounded-lg text-xs font-mono"
                  placeholder="720"
                />
              </div>
            </div>
          )}

          {/* Category Tree */}
          {kind !== 'transfer' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">دسته‌بندی</label>
                <button
                  type="button"
                  onClick={() => setIsSplitActive(!isSplitActive)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {isSplitActive ? 'ساده' : '+ تفکیک اقلام'}
                </button>
              </div>

              {!isSplitActive ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`p-2 rounded-lg text-center transition-all ${
                        selectedCategoryId === cat.id
                          ? 'bg-slate-900 text-white font-bold shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[11px] block truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                /* Split items container */
                <div className="space-y-2 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <div className="text-xs text-indigo-900 font-medium">
                    تقسیم مبلغ بین چند دسته‌بندی:
                  </div>
                  {splits.map((split, idx) => (
                    <div key={split.id} className="flex items-center gap-2">
                      <select
                        value={split.categoryId}
                        onChange={(e) => {
                          const updated = [...splits];
                          updated[idx].categoryId = e.target.value;
                          setSplits(updated);
                        }}
                        className="text-xs p-1.5 bg-white border border-slate-300 rounded-lg flex-1"
                      >
                        {filteredCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="مبلغ سهم"
                        value={split.amount || ''}
                        onChange={(e) => {
                          const updated = [...splits];
                          updated[idx].amount = parseInt(toEnglishDigits(e.target.value).replace(/,/g, ''), 10) || 0;
                          setSplits(updated);
                        }}
                        className="w-28 text-xs p-1.5 bg-white border border-slate-300 rounded-lg text-left font-mono"
                        dir="ltr"
                      />
                      {splits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSplits(splits.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSplits([...splits, { id: `${Date.now()}`, categoryId: 'cat-groceries', amount: 0 }])}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن سطر تفکیک</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Person / Payee & Jalali Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">طرف حساب / شخص</label>
              <div className="relative">
                <select
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="">بدون شخص (عمومی)</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">تاریخ شمسی</label>
              <input
                type="text"
                value={jalaliDate}
                onChange={(e) => setJalaliDate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-center"
              />
            </div>
          </div>

          {/* Note and Tags */}
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">توضیحات و بابت</label>
              <input
                type="text"
                placeholder="مثلاً: خرید روغن و برنج از افق کوروش..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">برچسب‌ها:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter(t => t !== tag))}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="برچسب جدید..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="w-24 text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="text-[11px] px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded-md text-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Receipt Photo Attachment */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{attachmentName ? `فیش: ${attachmentName}` : 'پیوست عکس فیش واریز / رسید کارت‌خوان'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachmentName(e.target.files[0].name);
                    }
                  }}
                />
              </label>
              {attachmentName && (
                <button
                  type="button"
                  onClick={() => setAttachmentName('')}
                  className="text-rose-500 text-[11px]"
                >
                  حذف عکس
                </button>
              )}
            </div>
          </div>

          {/* Sticky Modal Action CTA */}
          <div className="sticky bottom-0 bg-white pt-3 pb-3 -mx-5 px-5 border-t border-slate-100 mt-2 z-10 flex items-center gap-2">
            {editingTransaction && (
              <button
                type="button"
                onClick={handleDelete}
                className="py-3 px-4 rounded-xl font-bold text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف</span>
              </button>
            )}
            <button
              type="submit"
              disabled={amountRial <= 0}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98 whitespace-nowrap ${
                amountRial > 0
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{editingTransaction ? 'ذخیره تغییرات تراکنش' : 'ثبت تراکنش در دفترکل'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
