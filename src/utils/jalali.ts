/**
 * Jalali (Shamsi / Persian) Calendar Utility
 * Accurate algorithmic Gregorian <-> Jalali conversion
 */

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

export const JALALI_WEEKDAY_NAMES = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه'
] as const;

export interface JalaliDateParts {
  jy: number;
  jm: number;
  jd: number;
}

export function isJalaliLeapYear(jy: number): boolean {
  // Jalali leap years cycle algorithm
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length;
  let jp = breaks[0];
  let jm: number;
  let jump: number;
  let leap = -14;

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error('Invalid Jalali year ' + jy);
  }

  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) {
      const n = jy - jp;
      leap = leap + Math.floor(n / 33) * 8 + Math.floor(((n % 33) + 3) / 4);
      if (jump % 33 === 4 && jump - n === 4) {
        leap += 1;
      }
      const leapJ = 20 + leap - Math.floor(jy / 33) * 8 - Math.floor(((jy % 33) + 3) / 4);
      return (n % 33) % 4 === 0 && (jump - n !== 4 || (n % 33) !== 0);
    }
    leap = leap + Math.floor(jump / 33) * 8 + Math.floor(((jump % 33) + 3) / 4);
    jp = jm;
  }
  return false;
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  if (jm === 12) {
    // Check leap year for Esfand (29 or 30 days)
    // Common practical check: 1403 is leap (30 days), 1407 is leap (30 days)
    const remainder = ((jy - ((jy > 0) ? 474 : 473)) % 2820 + 474 + 38) * 682 % 2816;
    return remainder < 682 ? 30 : 29;
  }
  return 30;
}

/**
 * Converts Gregorian date (year, month 1-12, day 1-31) to Jalali
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDateParts {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Converts Jalali date (year, month 1-12, day 1-31) to Gregorian
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  const jy2 = jy - 979;
  const jm2 = jm - 1;
  const jd2 = jd - 1;

  let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor((jy2 % 33 + 3) / 4);
  for (let i = 0; i < jm2; ++i) {
    j_day_no += (i < 6) ? 31 : 30;
  }
  j_day_no += jd2;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;

    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  const g_days_in_month = [31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (let i = 0; i < 12; i++) {
    if (g_day_no < g_days_in_month[i]) {
      gm = i + 1;
      break;
    }
    g_day_no -= g_days_in_month[i];
  }
  const gd = g_day_no + 1;

  return { gy, gm, gd };
}

export function getTodayJalali(): string {
  const now = new Date();
  const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return formatJalali(j.jy, j.jm, j.jd);
}

export function formatJalali(jy: number, jm: number, jd: number): string {
  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;
  return `${jy}/${mm}/${dd}`;
}

export function parseJalali(jalaliStr: string): JalaliDateParts {
  const parts = jalaliStr.split('/').map(p => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { jy: parts[0], jm: parts[1], jd: parts[2] };
  }
  const today = getTodayJalali();
  const def = today.split('/').map(Number);
  return { jy: def[0], jm: def[1], jd: def[2] };
}

export function getJalaliMonthName(jm: number): string {
  if (jm >= 1 && jm <= 12) {
    return JALALI_MONTH_NAMES[jm - 1];
  }
  return '';
}

export function formatJalaliHuman(jalaliStr: string): string {
  const { jy, jm, jd } = parseJalali(jalaliStr);
  const monthName = getJalaliMonthName(jm);
  return `${jd} ${monthName} ${jy}`;
}

/**
 * Add N months to a Jalali date string
 */
export function addJalaliMonths(jalaliStr: string, monthsToAdd: number): string {
  const { jy, jm, jd } = parseJalali(jalaliStr);
  let totalMonths = jy * 12 + (jm - 1) + monthsToAdd;
  const newJy = Math.floor(totalMonths / 12);
  const newJm = (totalMonths % 12) + 1;
  const maxDays = getJalaliMonthDays(newJy, newJm);
  const newJd = Math.min(jd, maxDays);
  return formatJalali(newJy, newJm, newJd);
}

/**
 * Calculate difference in days between two Jalali dates
 */
export function daysBetweenJalali(fromJalali: string, toJalali: string): number {
  const p1 = parseJalali(fromJalali);
  const p2 = parseJalali(toJalali);
  const g1 = jalaliToGregorian(p1.jy, p1.jm, p1.jd);
  const g2 = jalaliToGregorian(p2.jy, p2.jm, p2.jd);
  const d1 = new Date(g1.gy, g1.gm - 1, g1.gd);
  const d2 = new Date(g2.gy, g2.gm - 1, g2.gd);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}
