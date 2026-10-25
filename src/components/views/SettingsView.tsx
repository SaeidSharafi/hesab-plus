import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Settings, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  RotateCcw, 
  ShieldCheck, 
  Check, 
  Coins,
  Binary
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    currencyUnit, 
    setCurrencyUnit, 
    numeralStyle, 
    setNumeralStyle, 
    exportBackupJSON,
    importBackupJSON,
    importParmisData,
    resetAllData
  } = useApp();

  const [parmisCsvText, setParmisCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleDownloadBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hesab_plus_backup_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJSON(content);
      if (success) {
        alert('نسخه پشتیبان با موفقیت بازیابی شد.');
      } else {
        alert('خطا در قالب فایل پشتیبان.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportParmis = () => {
    if (!parmisCsvText.trim()) return;

    const lines = parmisCsvText.trim().split('\n');
    const rows = lines.map(line => {
      const parts = line.split(/[,;\t]/).map(s => s.trim().replace(/^["']|["']$/g, ''));
      return {
        date: parts[0] || '',
        amount: parts[1] || '0',
        noa: parts[2] || 'هزینه',
        desc: parts[3] || 'انتقال از پارمیس'
      };
    });

    const res = importParmisData(rows);
    setImportStatus(`${res.importedCount} تراکنش با موفقیت وارد دفترکل شد.`);
    setParmisCsvText('');
  };

  return (
    <div className="space-y-4 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-2.5 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
          <Settings className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">تنظیمات</h2>
        </div>
      </div>

      {/* Primary Preferences Card: Currency & Numerals */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800">واحد پول و ارقام</h3>

        {/* Currency Unit Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>واحد پول</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setCurrencyUnit('TOMAN')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                currencyUnit === 'TOMAN'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تومان
            </button>
            <button
              type="button"
              onClick={() => setCurrencyUnit('RIAL')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                currencyUnit === 'RIAL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ریال
            </button>
          </div>
        </div>

        {/* Numeral Style Toggle */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5 text-indigo-500" />
              <span>نمایش اعداد</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setNumeralStyle('fa')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap font-mono ${
                numeralStyle === 'fa'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فارسی (۱۲۳)
            </button>
            <button
              type="button"
              onClick={() => setNumeralStyle('en')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all whitespace-nowrap font-mono ${
                numeralStyle === 'en'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              انگلیسی (123)
            </button>
          </div>
        </div>
      </div>

      {/* Parmis Mobile Importer Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900">ورود اطلاعات از پارمیس</h3>
        </div>

        <div className="space-y-2">
          <textarea
            rows={2}
            placeholder={`1405/07/20, 4200000, درآمد, حقوق مهر`}
            value={parmisCsvText}
            onChange={(e) => setParmisCsvText(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left"
            dir="ltr"
          />

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleImportParmis}
              disabled={!parmisCsvText.trim()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              ثبت در دفترکل
            </button>
            {importStatus && (
              <span className="text-[11px] text-emerald-700 font-bold truncate">{importStatus}</span>
            )}
          </div>
        </div>
      </div>

      {/* Backup & Restore Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-900">پشتیبان‌گیری</h3>
        </div>
        <p className="text-[11px] text-slate-500">
          ذخیره‌سازی آفلاین بر روی حافظه دستگاه
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-transform active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>دانلود فایل</span>
          </button>

          <label className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 cursor-pointer transition-colors whitespace-nowrap">
            <Upload className="w-4 h-4 text-slate-600" />
            <span>بازیابی</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleRestoreBackup}
            />
          </label>
        </div>
      </div>

      {/* Reset Demo Data */}
      <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200/80 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-rose-900 truncate">بازنشانی اطلاعات</h3>
          <p className="text-[11px] text-rose-700 truncate">بازگشت به اطلاعات پیش‌فرض اولیه</p>
        </div>
        <button
          onClick={() => {
            if (confirm('آیا مطمئن هستید؟ تمام تغییرات پاک شده و اطلاعات نمونه اولیه جایگزین می‌شود.')) {
              resetAllData();
              alert('داده‌های نمونه اولیه با موفقیت بارگذاری شدند.');
            }
          }}
          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0"
        >
          بازنشانی
        </button>
      </div>

    </div>
  );
};
