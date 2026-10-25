import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Receipt,
  Landmark,
  Users2,
  Coins
} from 'lucide-react';

interface NavDestination {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const AndroidBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, installments } = useApp();

  const dueInstallmentsCount = installments.filter(i => i.status === 'due' || i.status === 'overdue').length;

  const destinations: NavDestination[] = [
    { id: 'dashboard', label: 'پیشخوان', icon: LayoutDashboard },
    { id: 'transactions', label: 'تراکنش‌ها', icon: Receipt },
    { id: 'loans', label: 'وام‌ها', icon: Landmark, badge: dueInstallmentsCount },
    { id: 'debts', label: 'بدهی‌ها', icon: Users2 },
    { id: 'investments', label: 'سرمایه', icon: Coins }
  ];

  return (
    <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe select-none z-30">
      <div className="h-16 px-2 flex items-center justify-around max-w-lg mx-auto">
        {destinations.map((dest) => {
          const Icon = dest.icon;
          const isActive = activeTab === dest.id;

          return (
            <button
              key={dest.id}
              onClick={() => setActiveTab(dest.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 group focus:outline-none transition-transform active:scale-95"
            >
              {/* M3 Active Indicator Pill */}
              <div
                className={`relative h-8 px-4 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />

                {/* Badge */}
                {dest.badge && dest.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center font-mono">
                    {dest.badge}
                  </span>
                ) : null}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors ${
                  isActive
                    ? 'font-bold text-slate-900 dark:text-white'
                    : 'font-normal text-slate-500 dark:text-slate-400'
                }`}
              >
                {dest.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
