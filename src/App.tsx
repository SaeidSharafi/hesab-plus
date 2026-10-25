import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AndroidTopAppBar } from './components/android/AndroidTopAppBar';
import { AndroidBottomNav } from './components/android/AndroidBottomNav';
import { AndroidFAB } from './components/android/AndroidFAB';
import { QuickAddModal } from './components/QuickAddModal';
import { DashboardView } from './components/views/DashboardView';
import { TransactionsView } from './components/views/TransactionsView';
import { LoansView } from './components/views/LoansView';
import { DebtsView } from './components/views/DebtsView';
import { ReportsView } from './components/views/ReportsView';
import { ProjectionsView } from './components/views/ProjectionsView';
import { InvestmentsView } from './components/views/InvestmentsView';
import { ChequesView } from './components/views/ChequesView';
import { SettingsView } from './components/views/SettingsView';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'loans':
        return <LoansView />;
      case 'debts':
        return <DebtsView />;
      case 'reports':
        return <ReportsView />;
      case 'projections':
        return <ProjectionsView />;
      case 'investments':
        return <InvestmentsView />;
      case 'cheques':
        return <ChequesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="h-screen h-[100dvh] bg-slate-200/80 flex justify-center overflow-hidden">
      
      {/* Native Android Mobile Screen Container (Standard Android phone form-factor) */}
      <div className="w-full max-w-[440px] h-full h-[100dvh] max-h-[100dvh] bg-slate-50 flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Material 3 Top App Bar (Sticky Top) */}
        <div className="shrink-0 z-30 w-full">
          <AndroidTopAppBar />
        </div>

        {/* Scrollable View Content (Native Android Viewport with smooth momentum scroll) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24 overscroll-contain">
          {renderActiveView()}
        </main>

        {/* Material 3 Floating Action Button (FAB) - Fixed position in thumb zone */}
        <AndroidFAB />

        {/* Material 3 Navigation Bar (Fixed bottom anchor) */}
        <div className="shrink-0 z-30 w-full">
          <AndroidBottomNav />
        </div>

        {/* Android Modal Bottom Sheet (For Quick Add & Edit) */}
        <QuickAddModal />
      </div>

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
