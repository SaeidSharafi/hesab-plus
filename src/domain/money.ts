import { toEnglishDigits, toPersianDigits } from './jalali';

export type CurrencyUnit = 'TOMAN' | 'RIAL';
export type NumeralStyle = 'fa' | 'en';

export interface MoneyFormatOptions {
  unit?: CurrencyUnit;
  numerals?: NumeralStyle;
  /** auto: only negatives get a sign, always: positives get + too, never: absolute value */
  sign?: 'auto' | 'always' | 'never';
  symbol?: boolean;
  compact?: boolean;
}

const NBSP = '\u00A0';
const MINUS = '\u2212';

/** Integer Rial -> display units. Storage is always Rial; Toman is display-only. */
export function rialToDisplay(amountRial: number, unit: CurrencyUnit = 'TOMAN'): number {
  const value = unit === 'TOMAN' ? amountRial / 10 : amountRial;
  return Math.round(value);
}

export function displayToRial(amount: number, unit: CurrencyUnit = 'TOMAN'): number {
  return Math.round(unit === 'TOMAN' ? amount * 10 : amount);
}

export function groupDigits(value: string, separator: string): string {
  const [intPart, decimalPart] = value.split('.');
  const grouped = (intPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return decimalPart ? `${grouped}.${decimalPart}` : grouped;
}

export function formatNumber(
  value: number,
  numerals: NumeralStyle = 'fa',
  options: { minFraction?: number; maxFraction?: number } = {}
): string {
  const { minFraction = 0, maxFraction = 0 } = options;
  const rounded = Number(value.toFixed(maxFraction));
  const raw = rounded.toFixed(maxFraction);
  const trimmed = maxFraction > 0 ? raw.replace(/0+$/, '').replace(/\.$/, '') : raw;
  const [int, dec] = trimmed.split('.');
  const minDec = Math.min(minFraction, maxFraction);
  const decPadded = dec ? dec.padEnd(minDec, '0') : minDec > 0 ? '0'.repeat(minDec) : '';
  const latin = groupDigits(`${int ?? '0'}${decPadded ? `.${decPadded}` : ''}`, ',');
  if (numerals === 'fa') {
    return toPersianDigits(latin).replaceAll(',', '٬').replaceAll('.', '٫');
  }
  return latin;
}

/** Formats an integer Rial amount for display. */
export function formatMoney(amountRial: number, options: MoneyFormatOptions = {}): string {
  const {
    unit = 'TOMAN',
    numerals = 'fa',
    sign = 'auto',
    symbol = true,
    compact = false
  } = options;

  const safe = Number.isFinite(amountRial) ? Math.trunc(amountRial) : 0;
  const absolute = Math.abs(safe);
  const display = rialToDisplay(absolute, unit);
  let body: string;

  if (compact) {
    body = formatCompact(display, numerals);
  } else {
    body = formatNumber(display, numerals);
  }

  let prefix = '';
  if (safe < 0) prefix = MINUS;
  else if (sign === 'always' && safe > 0) prefix = '+';

  if (!symbol) return `${prefix}${body}`;
  return `${prefix}${body}${NBSP}${unit === 'TOMAN' ? 'تومان' : 'ریال'}`;
}

/** Short form for axes and tight cards. Input is already in display units. */
export function formatCompact(value: number, numerals: NumeralStyle = 'fa'): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : '';
  const render = (n: number, suffix: string) =>
    `${sign}${formatNumber(n, numerals, { maxFraction: n < 100 ? 1 : 0 })}${NBSP}${suffix}`;

  if (abs >= 1_000_000_000) return render(abs / 1_000_000_000, 'میلیارد');
  if (abs >= 1_000_000) return render(abs / 1_000_000, 'م');
  if (abs >= 1_000) return render(abs / 1_000, 'ه');
  return `${sign}${formatNumber(abs, numerals)}`;
}

/** Plain amount for `<input>` fields, without currency suffix. */
export function amountToInput(amountRial: number, unit: CurrencyUnit, numerals: NumeralStyle = 'en'): string {
  const display = rialToDisplay(Math.abs(amountRial), unit);
  return formatNumber(display, numerals);
}

const SCALES: Array<{ pattern: RegExp; factor: number }> = [
  { pattern: /(تریلیون|تریلیارد)$/, factor: 1_000_000_000_000 },
  { pattern: /(میلیارد)$/, factor: 1_000_000_000 },
  { pattern: /(میلیون)$/, factor: 1_000_000 },
  { pattern: /(هزار)$/, factor: 1_000 }
];

/**
 * Parses a human amount ("۲۵۰ هزار", "2.5 میلیون", "1,450,000 تومان")
 * into integer Rial. Returns 0 for empty/invalid input.
 */
export function parseAmountToRial(input: string, unit: CurrencyUnit = 'TOMAN'): number {
  if (!input) return 0;
  let text = toEnglishDigits(String(input))
    .replace(/[,\u066C\u00A0\s]/g, '')
    .replace(/[\u066B٫]/g, '.')
    .replace(/تومان|تومن|ریال|تومنی/g, '')
    .replace(/[٬]/g, '')
    .trim()
    .toLowerCase();

  let factor = 1;
  for (const scale of SCALES) {
    if (scale.pattern.test(text)) {
      factor = scale.factor;
      text = text.replace(scale.pattern, '').trim();
      break;
    }
  }

  text = text.replace(/٫/g, '.').replace(/[^0-9.\-]/g, '');
  if (!text || text === '.' || text === '-') return 0;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * factor * (unit === 'TOMAN' ? 10 : 1));
}

export function parseSignedAmountToRial(input: string, unit: CurrencyUnit = 'TOMAN'): number {
  const negative = /^\s*[-−]/.test(toEnglishDigits(input));
  const value = parseAmountToRial(input, unit);
  return negative ? -value : value;
}

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALE_NAMES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function threeDigitsToWords(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds > 0) parts.push(HUNDREDS[hundreds] as string);
  if (rest >= 10 && rest < 20) {
    parts.push(TEENS[rest - 10] as string);
  } else {
    const tens = Math.floor(rest / 10);
    const ones = rest % 10;
    if (tens > 0) parts.push(TENS[tens] as string);
    if (ones > 0) parts.push(ONES[ones] as string);
  }
  return parts.filter(Boolean).join(' و ');
}

/** Converts an integer Rial amount to Persian words, expressed in Toman. */
export function numberToPersianWords(amountRial: number): string {
  const toman = Math.round(Math.abs(amountRial) / 10);
  if (toman === 0) return 'صفر تومان';

  const groups: string[] = [];
  let remaining = toman;
  let index = 0;
  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const scale = SCALE_NAMES[index];
      groups.unshift(scale ? `${threeDigitsToWords(chunk)} ${scale}` : threeDigitsToWords(chunk));
    }
    remaining = Math.floor(remaining / 1000);
    index += 1;
  }

  const sign = amountRial < 0 ? 'منفی ' : '';
  return `${sign}${groups.join(' و ')} تومان`;
}

export function formatPercent(value: number, numerals: NumeralStyle = 'fa', fractionDigits = 1): string {
  return `${formatNumber(value, numerals, { maxFraction: fractionDigits })}٪`;
}

/** Formats a quantity (gold grams, fund units, shares) without a currency symbol. */
export function formatQuantity(value: number, unit: string, numerals: NumeralStyle = 'fa'): string {
  const formatted = formatNumber(value, numerals, { maxFraction: 4 });
  return unit ? `${formatted}${NBSP}${unit}` : formatted;
}
