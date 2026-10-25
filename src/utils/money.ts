import { CurrencyUnit, NumeralStyle } from '../types';

/**
 * Converts English digits to Persian digits
 */
export function toPersianDigits(input: string | number): string {
  const str = String(input);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
}

/**
 * Converts Persian or Arabic digits to English digits
 */
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Formats a Rial integer into a localized string with grouping and chosen currency (Toman / Rial)
 */
export function formatMoney(
  amountRial: number,
  currency: CurrencyUnit = 'TOMAN',
  numeralStyle: NumeralStyle = 'fa',
  showSymbol: boolean = true
): string {
  const isNegative = amountRial < 0;
  const absRial = Math.abs(Math.round(amountRial));
  
  // Toman is Rial / 10
  const displayValue = currency === 'TOMAN' ? Math.floor(absRial / 10) : absRial;
  const formattedWithCommas = displayValue.toLocaleString('en-US');
  
  let result = numeralStyle === 'fa' ? toPersianDigits(formattedWithCommas) : formattedWithCommas;
  if (isNegative) {
    result = '-' + result;
  }
  
  if (showSymbol) {
    const symbol = currency === 'TOMAN' ? 'تومان' : 'ریال';
    return `${result} ${symbol}`;
  }
  
  return result;
}

/**
 * Parses user input amount (which user entered in Toman or Rial) back to integer Rial
 */
export function parseUserInputToRial(input: string, inputCurrency: CurrencyUnit = 'TOMAN'): number {
  const clean = toEnglishDigits(input).replace(/,/g, '').trim();
  const val = parseInt(clean, 10);
  if (isNaN(val)) return 0;
  return inputCurrency === 'TOMAN' ? val * 10 : val;
}

/**
 * Converts numeric amount in Toman to Persian Words
 * e.g. 25400000 -> "بیست و پنج میلیون و چهارصد هزار تومان"
 */
export function numberToPersianWords(numToman: number): string {
  if (numToman === 0) return 'صفر تومان';
  
  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const thousands = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function convertGroup(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) parts.push(hundreds[h]);
    
    if (t === 1) {
      parts.push(teens[o]);
    } else {
      if (t > 1) parts.push(tens[t]);
      if (o > 0) parts.push(ones[o]);
    }
    return parts.join(' و ');
  }

  const isNegative = numToman < 0;
  let abs = Math.abs(numToman);
  const groups: string[] = [];
  let groupIndex = 0;

  while (abs > 0) {
    const rem = abs % 1000;
    if (rem > 0) {
      const groupText = convertGroup(rem);
      const scale = thousands[groupIndex];
      groups.unshift(scale ? `${groupText} ${scale}` : groupText);
    }
    abs = Math.floor(abs / 1000);
    groupIndex++;
  }

  const result = (isNegative ? 'منفی ' : '') + groups.join(' و ') + ' تومان';
  return result;
}
