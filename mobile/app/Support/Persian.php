<?php

namespace App\Support;

final class Persian
{
    private const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    public static function digits(string|int|float $value): string
    {
        $string = (string) $value;

        return str_replace(
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            self::PERSIAN_DIGITS,
            $string
        );
    }

    public static function english(string $value): string
    {
        return str_replace(
            [...self::PERSIAN_DIGITS, '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            $value
        );
    }

    public static function number(int|float $value, int $decimals = 0, string $numerals = 'fa'): string
    {
        $negative = $value < 0;
        $formatted = number_format(abs($value), $decimals, '.', ',');
        if ($numerals === 'fa') {
            $formatted = self::digits($formatted);
            $formatted = str_replace([',', '.'], ['٬', '٫'], $formatted);
        }
        if ($negative) {
            return '−'.$formatted;
        }

        return $formatted;
    }
}
