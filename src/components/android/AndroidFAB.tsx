import React from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AndroidFAB: React.FC = () => {
  const { setIsQuickAddOpen, setEditingTransaction } = useApp();

  const handleOpen = () => {
    setEditingTransaction(null);
    setIsQuickAddOpen(true);
  };

  return (
    <div className="absolute bottom-[80px] left-4 z-40 pointer-events-auto">
      <button
        onClick={handleOpen}
        className="w-13 h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-950/25 flex items-center justify-center transition-transform duration-150 active:scale-90 focus:outline-none"
        title="ثبت سریع تراکنش"
        aria-label="ثبت تراکنش"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
