<?php

namespace App\Support;

final class Money
{
    private const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];

    private const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];

    private const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];

    private const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];

    private const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

    /**
     * Formats integer Rial for display. Toman is display-only; storage is Rial.
     *
     * @param  'auto'|'always'|'never'  $sign
     */
    public static function format(
        int $rial,
        string $currency = 'TOMAN',
        string $numerals = 'fa',
        bool $symbol = true,
        string $sign = 'auto',
    ): string {
        $absolute = abs($rial);
        $display = $currency === 'TOMAN' ? (int) round($absolute / 10) : $absolute;
        $body = Persian::number($display, 0, $numerals);

        $prefix = '';
        if ($rial < 0) {
            $prefix = '−';
        } elseif ($sign === 'always' && $rial > 0) {
            $prefix = '+';
        }

        if ($sign === 'never') {
            $prefix = '';
        }

        return $symbol
            ? $prefix.$body."\u{00A0}".($currency === 'TOMAN' ? 'تومان' : 'ریال')
            : $prefix.$body;
    }

    public static function compact(int $rial, string $currency = 'TOMAN', string $numerals = 'fa'): string
    {
        $display = $currency === 'TOMAN' ? (int) round($rial / 10) : $rial;
        $absolute = abs($display);
        $sign = $display < 0 ? '−' : '';

        foreach ([[1_000_000_000, 'میلیارد'], [1_000_000, 'م'], [1_000, 'ه']] as [$factor, $suffix]) {
            if ($absolute >= $factor) {
                $value = $absolute / $factor;
                $decimals = $value < 100 ? 1 : 0;

                return $sign.Persian::number($value, $decimals, $numerals)."\u{00A0}".$suffix;
            }
        }

        return $sign.Persian::number($absolute, 0, $numerals);
    }

    /**
     * Parses a human amount ("۲۵۰ هزار", "2.5 میلیون", "1,450,000 تومان")
     * into integer Rial. Returns 0 for invalid input.
     */
    public static function parseToRial(string $input, string $currency = 'TOMAN'): int
    {
        $text = mb_strtolower(trim(Persian::english($input)));
        $text = str_replace(['تومان', 'تومن', 'ریال', 'تومنی'], '', $text);
        $text = str_replace([',', '٬', '،', "\u{00A0}", ' '], '', $text);
        $text = str_replace('٫', '.', $text);
        $text = preg_replace('/[^0-9.]+/u', '', $text) ?? '';
        if ($text === '' || $text === '.' || ! is_numeric($text)) {
            return 0;
        }

        $factor = 1;
        foreach (['تریلیارد' => 1_000_000_000_000, 'تریلیون' => 1_000_000_000_000, 'میلیارد' => 1_000_000_000, 'میلیون' => 1_000_000, 'هزار' => 1_000] as $word => $value) {
            if (str_contains($input, $word)) {
                $factor = $value;
                break;
            }
        }

        $value = (float) $text * $factor;

        return (int) round($currency === 'TOMAN' ? $value * 10 : $value);
    }

    public static function percent(float $value, string $numerals = 'fa', int $decimals = 1): string
    {
        return Persian::number($value, $decimals, $numerals).'٪';
    }

    public static function quantity(float $value, string $unit = '', string $numerals = 'fa'): string
    {
        $formatted = Persian::number($value, fmod($value, 1.0) !== 0.0 ? 4 : 0, $numerals);

        return $unit !== '' ? $formatted."\u{00A0}".$unit : $formatted;
    }

    public static function words(int $rial): string
    {
        $toman = (int) round(abs($rial) / 10);
        if ($toman === 0) {
            return 'صفر تومان';
        }

        $groups = [];
        $remaining = $toman;
        $index = 0;
        while ($remaining > 0) {
            $chunk = $remaining % 1000;
            if ($chunk > 0) {
                $scale = self::SCALES[$index] ?? '';
                $words = self::threeDigitsToWords($chunk);
                $groups[] = $scale !== '' ? "{$words} {$scale}" : $words;
            }
            $remaining = intdiv($remaining, 1000);
            $index++;
        }

        return ($rial < 0 ? 'منفی ' : '').implode(' و ', array_reverse($groups)).' تومان';
    }

    private static function threeDigitsToWords(int $value): string
    {
        $parts = [];
        $hundreds = intdiv($value, 100);
        $rest = $value % 100;

        if ($hundreds > 0) {
            $parts[] = self::HUNDREDS[$hundreds];
        }

        if ($rest >= 10 && $rest < 20) {
            $parts[] = self::TEENS[$rest - 10];
        } else {
            $tens = intdiv($rest, 10);
            $ones = $rest % 10;
            if ($tens > 0) {
                $parts[] = self::TENS[$tens];
            }
            if ($ones > 0) {
                $parts[] = self::ONES[$ones];
            }
        }

        return implode(' و ', $parts);
    }
}
