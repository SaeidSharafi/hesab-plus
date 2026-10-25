/**
 * Jalali (Solar Hijri) calendar.
 *
 * Implemented with the well-tested Jalaali algorithm (jalaali-js / Borkowski),
 * using Julian Day Numbers so adding days, weekdays and month grids are exact.
 * All helpers are pure and unit-tested.
 */

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
] as const;

/** Weekday names, Saturday-first (Persian week). */
export const JALALI_WEEKDAY_NAMES = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه'
] as const;

export const JALALI_WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456,
  3178
];

// Truncating division (matches jalaali-js), important for negative month offsets.
const div = (a: number, b: number): number => Math.trunc(a / b);
const mod = (a: number, b: number): number => a - Math.trunc(a / b) * b;

interface JalCal {
  leap: number;
  gy: number;
  march: number;
}

function jalCal(jy: number): JalCal {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0] as number;
  let jump = 0;
  let jm = 0;

  if (jy < jp || jy >= (BREAKS[bl - 1] as number)) {
    throw new RangeError(`Invalid Jalali year: ${jy}`);
  }

  for (let i = 1; i < bl; i += 1) {
    jm = BREAKS[i] as number;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

/** Gregorian date -> Julian Day Number. */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** Julian Day Number -> Gregorian date. */
function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const { gy } = d2g(jdn);
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm: number;
  let jd: number;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthDays(jy: number, jm: number): number {
  if (jm < 1 || jm > 12) throw new RangeError(`Invalid Jalali month: ${jm}`);
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

export function jalaliToGregorian(date: JalaliDate): GregorianDate {
  return d2g(j2d(date.jy, date.jm, date.jd));
}

export function gregorianToJalali(date: GregorianDate): JalaliDate {
  return d2j(g2d(date.gy, date.gm, date.gd));
}

export function jalaliToJdn(date: JalaliDate): number {
  return j2d(date.jy, date.jm, date.jd);
}

export function jdnToJalali(jdn: number): JalaliDate {
  return d2j(jdn);
}

export function jalaliFromParts(jy: number, jm: number, jd: number): JalaliDate {
  return { jy, jm, jd };
}

export function isValidJalaliDate(date: JalaliDate): boolean {
  if (!Number.isInteger(date.jy) || !Number.isInteger(date.jm) || !Number.isInteger(date.jd)) {
    return false;
  }
  if (date.jy < 1200 || date.jy > 1700) return false;
  if (date.jm < 1 || date.jm > 12) return false;
  if (date.jd < 1 || date.jd > jalaliMonthDays(date.jy, date.jm)) return false;
  return true;
}

/** Parse `1405/08/03`, `1405-8-3` or Persian-digit variants. Returns null when invalid. */
export function parseJalali(input: string | null | undefined): JalaliDate | null {
  if (!input) return null;
  const english = String(input)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .trim();
  const match = english.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!match) return null;
  const date = {
    jy: Number(match[1]),
    jm: Number(match[2]),
    jd: Number(match[3])
  };
  return isValidJalaliDate(date) ? date : null;
}

export function parseJalaliOrThrow(input: string): JalaliDate {
  const parsed = parseJalali(input);
  if (!parsed) throw new RangeError(`Invalid Jalali date: ${input}`);
  return parsed;
}

export function todayJalali(now: Date = new Date()): JalaliDate {
  return gregorianToJalali({
    gy: now.getFullYear(),
    gm: now.getMonth() + 1,
    gd: now.getDate()
  });
}

export function addJalaliDays(date: JalaliDate, days: number): JalaliDate {
  return d2j(j2d(date.jy, date.jm, date.jd) + days);
}

export function addJalaliMonths(date: JalaliDate, months: number): JalaliDate {
  const total = date.jy * 12 + (date.jm - 1) + months;
  const jy = Math.floor(total / 12);
  const jm = mod(total, 12) + 1;
  const jd = Math.min(date.jd, jalaliMonthDays(jy, jm));
  return { jy, jm, jd };
}

export function diffJalaliDays(from: JalaliDate, to: JalaliDate): number {
  return j2d(to.jy, to.jm, to.jd) - j2d(from.jy, from.jm, from.jd);
}

export function compareJalali(a: JalaliDate, b: JalaliDate): number {
  if (a.jy !== b.jy) return a.jy - b.jy;
  if (a.jm !== b.jm) return a.jm - b.jm;
  return a.jd - b.jd;
}

export function isSameJalaliDay(a: JalaliDate, b: JalaliDate): boolean {
  return a.jy === b.jy && a.jm === b.jm && a.jd === b.jd;
}

export function isSameJalaliMonth(a: JalaliDate, b: JalaliDate): boolean {
  return a.jy === b.jy && a.jm === b.jm;
}

export function startOfJalaliMonth(date: JalaliDate): JalaliDate {
  return { jy: date.jy, jm: date.jm, jd: 1 };
}

export function endOfJalaliMonth(date: JalaliDate): JalaliDate {
  return { jy: date.jy, jm: date.jm, jd: jalaliMonthDays(date.jy, date.jm) };
}

/** Saturday-first weekday: 0 = Saturday … 6 = Friday. */
export function jalaliWeekday(date: JalaliDate): number {
  return mod(j2d(date.jy, date.jm, date.jd) + 2, 7);
}

export function jalaliMonthName(jm: number): string {
  return JALALI_MONTH_NAMES[jm - 1] ?? '';
}

export function toPersianDigits(input: string | number): string {
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/\d/g, (d) => persian[Number(d)] as string);
}

export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function formatJalali(
  date: JalaliDate,
  style: 'numeric' | 'short' | 'long' | 'weekday' = 'numeric',
  numerals: 'fa' | 'en' = 'fa'
): string {
  const nums = (value: string | number) => (numerals === 'fa' ? toPersianDigits(value) : String(value));
  const jd = nums(date.jd);
  const jm = nums(date.jm);
  const jy = nums(date.jy);
  switch (style) {
    case 'short':
      return `${jd} ${jalaliMonthName(date.jm)}`;
    case 'long':
      return `${jd} ${jalaliMonthName(date.jm)} ${jy}`;
    case 'weekday':
      return `${JALALI_WEEKDAY_NAMES[jalaliWeekday(date)]}، ${jd} ${jalaliMonthName(date.jm)}`;
    case 'numeric':
    default:
      return `${jy}/${jm}/${jd}`;
  }
}

export function formatJalaliString(
  input: string,
  style: 'numeric' | 'short' | 'long' | 'weekday' = 'numeric',
  numerals: 'fa' | 'en' = 'fa'
): string {
  const date = parseJalali(input);
  if (!date) return input;
  return formatJalali(date, style, numerals);
}

/** ISO Gregorian date (YYYY-MM-DD) for a Jalali date, useful for Date parsing/sorting. */
export function jalaliToIso(date: JalaliDate): string {
  const g = jalaliToGregorian(date);
  return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
}

/** Today's ISO Gregorian date (local). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function jalaliMonthKey(date: JalaliDate): string {
  return `${date.jy}/${String(date.jm).padStart(2, '0')}`;
}

export function parseJalaliMonthKey(key: string): { jy: number; jm: number } | null {
  const match = key.match(/^(\d{4})\/(\d{1,2})$/);
  if (!match) return null;
  const jy = Number(match[1]);
  const jm = Number(match[2]);
  if (jy < 1200 || jy > 1700 || jm < 1 || jm > 12) return null;
  return { jy, jm };
}

export function formatJalaliMonth(key: string, numerals: 'fa' | 'en' = 'fa'): string {
  const parsed = parseJalaliMonthKey(key);
  if (!parsed) return key;
  const name = jalaliMonthName(parsed.jm);
  const year = numerals === 'fa' ? toPersianDigits(parsed.jy) : String(parsed.jy);
  return `${name} ${year}`;
}

/** Relative label used on due dates. */
export function dueLabel(due: JalaliDate, today: JalaliDate = todayJalali(), numerals: 'fa' | 'en' = 'fa'): string {
  const days = diffJalaliDays(today, due);
  const nums = (v: number) => (numerals === 'fa' ? toPersianDigits(v) : String(v));
  if (days === 0) return 'امروز';
  if (days === 1) return 'فردا';
  if (days === -1) return 'دیروز';
  if (days > 1) return `${nums(days)} روز آینده`;
  return `${nums(Math.abs(days))} روز گذشته`;
}

export interface MonthGridCell {
  date: JalaliDate;
  inMonth: boolean;
}

/** Weeks (Saturday-first) covering the given Jalali month, padded with adjacent days. */
export function jalaliMonthGrid(jy: number, jm: number): MonthGridCell[][] {
  const first: JalaliDate = { jy, jm, jd: 1 };
  const lead = jalaliWeekday(first);
  const totalDays = jalaliMonthDays(jy, jm);
  const cells: MonthGridCell[] = [];

  for (let i = 0; i < lead; i += 1) {
    cells.push({ date: addJalaliDays(first, i - lead), inMonth: false });
  }
  for (let d = 1; d <= totalDays; d += 1) {
    cells.push({ date: { jy, jm, jd: d }, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1] as MonthGridCell;
    cells.push({ date: addJalaliDays(last.date, 1), inMonth: false });
  }

  const weeks: MonthGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** First and last day of the current Jalali year. */
export function jalaliYearRange(year: number): { from: JalaliDate; to: JalaliDate } {
  return { from: { jy: year, jm: 1, jd: 1 }, to: { jy: year, jm: 12, jd: jalaliMonthDays(year, 12) } };
}

/** Last N month keys ending at the given month (inclusive), oldest first. */
export function lastMonthKeys(month: JalaliDate, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(jalaliMonthKey(addJalaliMonths(month, -i)));
  }
  return keys;
}
