import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  MoreVertical, 
  Bell, 
  PieChart, 
  LineChart, 
  FileCheck2, 
  Settings
} from 'lucide-react';
import { toPersianDigits } from '../../utils/money';

export const AndroidTopAppBar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currencyUnit, 
    setCurrencyUnit, 
    numeralStyle, 
    setNumeralStyle,
    installments, 
    cheques 
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const urgentCount = installments.filter(i => i.status === 'due' || i.status === 'overdue').length + 
                      cheques.filter(c => c.status === 'pending').length;

  const titles: Record<string, string> = {
    dashboard: 'پیشخوان',
    transactions: 'تراکنش‌ها',
    loans: 'وام‌ها',
    debts: 'بدهی‌ها',
    investments: 'سرمایه',
    reports: 'گزارش‌ها',
    projections: 'پیش‌بینی',
    cheques: 'چک‌ها',
    settings: 'تنظیمات'
  };

  return (
    <div className="relative sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="h-14 px-4 flex items-center justify-between gap-2">
        
        {/* Left: Brand / Section Title in M3 Style */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-sm shrink-0">
            ح+
          </div>
          <h1 className="text-sm font-bold tracking-tight text-white truncate">
            {titles[activeTab] || 'حساب+'}
          </h1>
        </div>

        {/* Right: Notification Alerts, Quick Settings & Overflow Menu */}
        <div className="flex items-center gap-1">
          {/* Overdue Alerts Icon */}
          {urgentCount > 0 && (
            <button
              onClick={() => setActiveTab('loans')}
              className="relative w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 flex items-center justify-center border border-amber-500/30 transition-colors"
              title={`${urgentCount} سررسید و قسط پیش‌رو`}
              aria-label="هشدارهای سررسید"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center font-mono">
                {numeralStyle === 'fa' ? toPersianDigits(urgentCount) : urgentCount}
              </span>
            </button>
          )}

          {/* Quick Settings Shortcut */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              activeTab === 'settings' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="تنظیمات"
            aria-label="تنظیمات"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Android Overflow Menu Trigger (Three Dots) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-9 h-9 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors"
            title="منوی سایر بخش‌ها"
            aria-label="سایر بخش‌ها"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Android M3 Dropdown Menu */}
      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute left-3 top-13 z-50 w-56 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 py-2 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700 mb-1">
              بخش‌ها
            </div>

            <button
              onClick={() => { setActiveTab('reports'); setIsMenuOpen(false); }}
              className={`w-full px-3 py-2 text-right flex items-center gap-2.5 hover:bg-slate-700 transition-colors ${activeTab === 'reports' ? 'text-emerald-400 font-bold' : ''}`}
            >
              <PieChart className="w-4 h-4 text-indigo-400" />
              <span>گزارش‌ها</span>
            </button>

            <button
              onClick={() => { setActiveTab('projections'); setIsMenuOpen(false); }}
              className={`w-full px-3 py-2 text-right flex items-center gap-2.5 hover:bg-slate-700 transition-colors ${activeTab === 'projections' ? 'text-emerald-400 font-bold' : ''}`}
            >
              <LineChart className="w-4 h-4 text-emerald-400" />
              <span>پیش‌بینی</span>
            </button>

            <button
              onClick={() => { setActiveTab('cheques'); setIsMenuOpen(false); }}
              className={`w-full px-3 py-2 text-right flex items-center gap-2.5 hover:bg-slate-700 transition-colors ${activeTab === 'cheques' ? 'text-emerald-400 font-bold' : ''}`}
            >
              <FileCheck2 className="w-4 h-4 text-sky-400" />
              <span>چک‌های صیاد</span>
            </button>

            <div className="my-1 border-t border-slate-700" />

            <button
              onClick={() => { setActiveTab('settings'); setIsMenuOpen(false); }}
              className={`w-full px-3 py-2 text-right flex items-center gap-2.5 hover:bg-slate-700 transition-colors ${activeTab === 'settings' ? 'text-emerald-400 font-bold' : ''}`}
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>تنظیمات</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
