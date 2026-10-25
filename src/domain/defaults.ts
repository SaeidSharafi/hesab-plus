import type { AppData, Category, Settings } from './types';
import { todayJalali } from './jalali';

let idCounter = 0;

export function createId(prefix: string): string {
  idCounter += 1;
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}_${random}`;
}

export const DEFAULT_SETTINGS: Settings = {
  currencyUnit: 'TOMAN',
  numerals: 'fa',
  theme: 'system',
  hideBalances: false,
  onboardingDone: false,
  inflationPercent: 35
};

const expense = (
  id: string,
  name: string,
  icon: string,
  color: string,
  parentId: string | null = null
): Category => ({ id, name, icon, color, parentId, kind: 'expense' });

const income = (id: string, name: string, icon: string, color: string, parentId: string | null = null): Category => ({
  id,
  name,
  icon,
  color,
  parentId,
  kind: 'income'
});

export const DEFAULT_CATEGORIES: Category[] = [
  expense('cat-food', 'خوراک و رستوران', 'Utensils', '#ea580c'),
  expense('cat-groceries', 'سوپرمارکت', 'ShoppingBasket', '#f97316', 'cat-food'),
  expense('cat-restaurant', 'رستوران و کافه', 'Coffee', '#d97706', 'cat-food'),
  expense('cat-fruit', 'میوه و سبزیجات', 'Apple', '#65a30d', 'cat-food'),
  expense('cat-household', 'شوینده و خانه', 'SprayCan', '#b45309', 'cat-food'),

  expense('cat-housing', 'مسکن و قبوض', 'Home', '#4f46e5'),
  expense('cat-rent', 'اجاره و رهن', 'Building2', '#6366f1', 'cat-housing'),
  expense('cat-bills', 'آب، برق و گاز', 'Zap', '#4338ca', 'cat-housing'),
  expense('cat-internet', 'اینترنت و تلفن', 'Wifi', '#7c3aed', 'cat-housing'),

  expense('cat-transport', 'حمل و نقل', 'Car', '#0284c7'),
  expense('cat-fuel', 'بنزین', 'Fuel', '#0ea5e9', 'cat-transport'),
  expense('cat-taxi', 'تاکسی و اسنپ', 'Navigation', '#2563eb', 'cat-transport'),
  expense('cat-car-service', 'تعمیر و سرویس خودرو', 'Wrench', '#0369a1', 'cat-transport'),
  expense('cat-insurance', 'بیمه خودرو', 'ShieldCheck', '#1d4ed8', 'cat-transport'),

  expense('cat-health', 'سلامت', 'HeartPulse', '#e11d48'),
  expense('cat-pharmacy', 'دارو', 'Pill', '#f43f5e', 'cat-health'),
  expense('cat-doctor', 'پزشک و درمان', 'Stethoscope', '#be123c', 'cat-health'),
  expense('cat-dentist', 'دندانپزشکی', 'Smile', '#9f1239', 'cat-health'),

  expense('cat-personal', 'پوشاک و شخصی', 'Shirt', '#a855f7'),
  expense('cat-clothing', 'لباس و کفش', 'Shirt', '#c026d3', 'cat-personal'),
  expense('cat-beauty', 'آرایش و بهداشت', 'Sparkles', '#d946ef', 'cat-personal'),
  expense('cat-digital', 'دیجیتال و لوازم', 'Laptop', '#9333ea', 'cat-personal'),

  expense('cat-fun', 'تفریح و سفر', 'Plane', '#0d9488'),
  expense('cat-travel', 'سفر و اقامت', 'Plane', '#14b8a6', 'cat-fun'),
  expense('cat-entertainment', 'تفریح و سرگرمی', 'Clapperboard', '#059669', 'cat-fun'),
  expense('cat-subscription', 'اشتراک‌ها', 'Repeat', '#0891b2', 'cat-fun'),

  expense('cat-education', 'آموزش', 'GraduationCap', '#ca8a04'),
  expense('cat-course', 'دوره و کلاس', 'GraduationCap', '#eab308', 'cat-education'),
  expense('cat-books', 'کتاب و منابع', 'BookOpen', '#a16207', 'cat-education'),

  expense('cat-gifts', 'هدیه و کمک', 'Gift', '#db2777'),
  expense('cat-family', 'هدیه خانواده', 'HeartHandshake', '#ec4899', 'cat-gifts'),
  expense('cat-charity', 'کمک و خیریه', 'HeartHandshake', '#f472b6', 'cat-gifts'),

  expense('cat-loan-interest', 'سود و کارمزد وام', 'Percent', '#dc2626'),
  expense('cat-tax', 'مالیات و عوارض', 'FileText', '#78716c'),
  expense('cat-other', 'سایر هزینه‌ها', 'CircleEllipsis', '#64748b'),

  income('cat-income-salary', 'حقوق و دستمزد', 'Briefcase', '#16a34a'),
  income('cat-income-freelance', 'پروژه و مشاوره', 'Laptop', '#059669'),
  income('cat-income-invest', 'سود سرمایه‌گذاری', 'TrendingUp', '#0d9488'),
  income('cat-income-deposit', 'سود سپرده', 'Landmark', '#0f766e', 'cat-income-invest'),
  income('cat-income-fund', 'سود صندوق', 'PieChart', '#115e59', 'cat-income-invest'),
  income('cat-income-dividend', 'سود سهام', 'Building2', '#047857', 'cat-income-invest'),
  income('cat-income-sale', 'فروش دارایی', 'Coins', '#65a30d'),
  income('cat-income-gift', 'هدیه و کمک‌هزینه', 'Gift', '#ca8a04'),
  income('cat-income-other', 'سایر درآمدها', 'PlusCircle', '#4d7c0f')
];

export const CASH_ACCOUNT_ID = 'acc-cash';

export function createBaseData(now = new Date()): AppData {
  const iso = now.toISOString();
  return {
    schemaVersion: 2,
    settings: { ...DEFAULT_SETTINGS },
    accounts: [
      {
        id: CASH_ACCOUNT_ID,
        name: 'کیف پول',
        type: 'cash',
        openingBalanceRial: 0,
        color: '#0f766e',
        icon: 'Wallet',
        includeInNetWorth: true,
        archived: false,
        createdAt: iso
      }
    ],
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    transactions: [],
    people: [],
    loans: [],
    installments: [],
    debts: [],
    cheques: [],
    assets: [],
    lots: [],
    goals: [],
    budgets: [],
    scenarios: [],
    demo: false,
    createdAt: iso,
    updatedAt: iso
  };
}

export function emptyCategoriesFor(kind: 'expense' | 'income'): Category[] {
  return DEFAULT_CATEGORIES.filter((category) => category.kind === kind);
}

/** A stable, readable key for the current Jalali year (used in exports). */
export function currentYearLabel(): string {
  return String(todayJalali().jy);
}
