<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

/**
 * Pure-PHP Jalali calendar. Jalaali algorithm (Borkowski / jalaali-js),
 * using Julian Day Numbers so day arithmetic, weekdays and month grids are
 * exact and independent of Android/iOS locale APIs.
 */
final class JalaliDate
{
    private const MONTHS = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
    ];

    private const WEEKDAYS = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

    private const WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

    private const BREAKS = [
        -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
        1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
    ];

    public function __construct(
        public readonly int $year,
        public readonly int $month,
        public readonly int $day,
    ) {
        if (! self::isValid($year, $month, $day)) {
            throw new \InvalidArgumentException("Invalid Jalali date: {$year}/{$month}/{$day}");
        }
    }

    public static function fromString(?string $value): ?self
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $english = Persian::english($value);
        if (! preg_match('/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/', trim($english), $matches)) {
            return null;
        }

        $year = (int) $matches[1];
        $month = (int) $matches[2];
        $day = (int) $matches[3];

        return self::isValid($year, $month, $day) ? new self($year, $month, $day) : null;
    }

    public static function fromStringOrToday(?string $value): self
    {
        return self::fromString($value) ?? self::today();
    }

    public static function fromInt(?int $value): ?self
    {
        if ($value === null || $value < 10000101) {
            return null;
        }

        return self::fromString(
            intdiv($value, 10000).'/'.str_pad((string) (intdiv($value, 100) % 100), 2, '0', STR_PAD_LEFT).'/'.str_pad((string) ($value % 100), 2, '0', STR_PAD_LEFT)
        );
    }

    public static function fromGregorian(int $gy, int $gm, int $gd): self
    {
        $date = self::fromJdn(self::gregorianToJdn($gy, $gm, $gd));

        return new self($date[0], $date[1], $date[2]);
    }

    public static function today(?DateTimeInterface $now = null): self
    {
        if ($now === null) {
            $timezone = new DateTimeZone((string) (function_exists('config') ? config('app.timezone', 'Asia/Tehran') : 'Asia/Tehran'));
            $now = new DateTimeImmutable('now', $timezone);
        }

        return self::fromGregorian(
            (int) $now->format('Y'),
            (int) $now->format('n'),
            (int) $now->format('j')
        );
    }

    public static function isValid(int $year, int $month, int $day): bool
    {
        if ($year < 1200 || $year > 1700 || $month < 1 || $month > 12) {
            return false;
        }

        return $day >= 1 && $day <= self::monthDaysFor($year, $month);
    }

    public static function isLeapYear(int $year): bool
    {
        return self::jalCal($year)['leap'] === 0;
    }

    public static function monthDaysFor(int $year, int $month): int
    {
        if ($month < 1 || $month > 12) {
            throw new \InvalidArgumentException("Invalid Jalali month: {$month}");
        }
        if ($month <= 6) {
            return 31;
        }
        if ($month <= 11) {
            return 30;
        }

        return self::isLeapYear($year) ? 30 : 29;
    }

    public static function monthName(int $month): string
    {
        return self::MONTHS[$month - 1] ?? '';
    }

    public static function weekdayName(int $weekday): string
    {
        return self::WEEKDAYS[$weekday] ?? '';
    }

    public static function weekdayShort(int $weekday): string
    {
        return self::WEEKDAY_SHORT[$weekday] ?? '';
    }

    public function toString(): string
    {
        return sprintf('%04d/%02d/%02d', $this->year, $this->month, $this->day);
    }

    public function toInt(): int
    {
        return $this->year * 10000 + $this->month * 100 + $this->day;
    }

    public function toIso(): string
    {
        [$gy, $gm, $gd] = self::jdnToGregorian($this->jdn());

        return sprintf('%04d-%02d-%02d', $gy, $gm, $gd);
    }

    public function jdn(): int
    {
        return self::jalaliToJdn($this->year, $this->month, $this->day);
    }

    public function monthKey(): string
    {
        return sprintf('%04d/%02d', $this->year, $this->month);
    }

    public function addDays(int $days): self
    {
        [$year, $month, $day] = self::fromJdn($this->jdn() + $days);

        return new self($year, $month, $day);
    }

    public function addMonths(int $months): self
    {
        $total = $this->year * 12 + ($this->month - 1) + $months;
        $year = intdiv($total, 12);
        $month = $total % 12 + 1;
        $day = min($this->day, self::monthDaysFor($year, $month));

        return new self($year, $month, $day);
    }

    public function diffDays(self $other): int
    {
        return $other->jdn() - $this->jdn();
    }

    public function compareTo(self $other): int
    {
        return $this->jdn() <=> $other->jdn();
    }

    public function isBefore(self $other): bool
    {
        return $this->compareTo($other) < 0;
    }

    public function isAfter(self $other): bool
    {
        return $this->compareTo($other) > 0;
    }

    public function isSameDay(self $other): bool
    {
        return $this->compareTo($other) === 0;
    }

    public function isSameMonth(self $other): bool
    {
        return $this->year === $other->year && $this->month === $other->month;
    }

    public function weekday(): int
    {
        return self::weekdayForJdn($this->jdn());
    }

    public function monthDays(): int
    {
        return self::monthDaysFor($this->year, $this->month);
    }

    public function startOfMonth(): self
    {
        return new self($this->year, $this->month, 1);
    }

    public function endOfMonth(): self
    {
        return new self($this->year, $this->month, $this->monthDays());
    }

    public function format(string $style = 'long', string $numerals = 'fa'): string
    {
        $num = static fn (int|string $value): string => $numerals === 'fa' ? Persian::digits((string) $value) : (string) $value;
        $day = $num($this->day);
        $month = self::monthName($this->month);
        $year = $num($this->year);

        return match ($style) {
            'numeric' => sprintf('%s/%s/%s', $year, $num(str_pad((string) $this->month, 2, '0', STR_PAD_LEFT)), $num(str_pad((string) $this->day, 2, '0', STR_PAD_LEFT))),
            'short' => "{$day} {$month}",
            'month' => "{$month} {$year}",
            'weekday' => self::weekdayName($this->weekday())."، {$day} {$month}",
            default => "{$day} {$month} {$year}",
        };
    }

    public function dueLabel(?self $today = null, string $numerals = 'fa'): string
    {
        $today ??= self::today();
        $days = $today->diffDays($this);
        $num = static fn (int $value): string => $numerals === 'fa' ? Persian::digits($value) : (string) $value;

        return match (true) {
            $days === 0 => 'امروز',
            $days === 1 => 'فردا',
            $days === -1 => 'دیروز',
            $days > 1 => $num($days).' روز آینده',
            default => $num(abs($days)).' روز گذشته',
        };
    }

    /**
     * Saturday-first month grid, padded with adjacent days.
     *
     * @return list<list<array{date: self, in_month: bool}>>
     */
    public static function monthGrid(int $year, int $month): array
    {
        $first = new self($year, $month, 1);
        $lead = $first->weekday();
        $cells = [];

        for ($i = 0; $i < $lead; $i++) {
            $cells[] = ['date' => $first->addDays($i - $lead), 'in_month' => false];
        }
        for ($day = 1; $day <= $first->monthDays(); $day++) {
            $cells[] = ['date' => new self($year, $month, $day), 'in_month' => true];
        }
        while (count($cells) % 7 !== 0) {
            $last = $cells[array_key_last($cells)]['date'];
            $cells[] = ['date' => $last->addDays(1), 'in_month' => false];
        }

        return array_chunk($cells, 7);
    }

    /**
     * @return list<string>
     */
    public static function lastMonthKeys(self $month, int $count): array
    {
        $keys = [];
        for ($i = $count - 1; $i >= 0; $i--) {
            $keys[] = $month->addMonths(-$i)->monthKey();
        }

        return $keys;
    }

    /**
     * @return array{leap: int, gy: int, march: int}
     */
    private static function jalCal(int $jy): array
    {
        $bl = count(self::BREAKS);
        $gy = $jy + 621;
        $leapJ = -14;
        $jp = self::BREAKS[0];
        $jump = 0;

        if ($jy < $jp || $jy >= self::BREAKS[$bl - 1]) {
            throw new \RangeException("Invalid Jalali year: {$jy}");
        }

        for ($i = 1; $i < $bl; $i++) {
            $jm = self::BREAKS[$i];
            $jump = $jm - $jp;
            if ($jy < $jm) {
                break;
            }
            $leapJ += intdiv($jump, 33) * 8 + intdiv(self::mod($jump, 33), 4);
            $jp = $jm;
        }

        $n = $jy - $jp;
        $leapJ += intdiv($n, 33) * 8 + intdiv(self::mod($n, 33) + 3, 4);
        if (self::mod($jump, 33) === 4 && $jump - $n === 4) {
            $leapJ++;
        }

        $leapG = intdiv($gy, 4) - intdiv((intdiv($gy, 100) + 1) * 3, 4) - 150;
        $march = 20 + $leapJ - $leapG;

        if ($jump - $n < 6) {
            $n = $n - $jump + intdiv($jump + 4, 33) * 33;
        }
        $leap = self::mod(self::mod($n + 1, 33) - 1, 4);
        if ($leap === -1) {
            $leap = 4;
        }

        return ['leap' => $leap, 'gy' => $gy, 'march' => $march];
    }

    private static function gregorianToJdn(int $gy, int $gm, int $gd): int
    {
        $d = intdiv(($gy + intdiv($gm - 8, 6) + 100100) * 1461, 4)
            + intdiv(153 * self::mod($gm + 9, 12) + 2, 5)
            + $gd - 34840408;
        $d = $d - intdiv(intdiv($gy + 100100 + intdiv($gm - 8, 6), 100) * 3, 4) + 752;

        return $d;
    }

    /**
     * @return array{0: int, 1: int, 2: int}
     */
    private static function jdnToGregorian(int $jdn): array
    {
        $j = 4 * $jdn + 139361631;
        $j += intdiv(intdiv(4 * $jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
        $i = intdiv(self::mod($j, 1461), 4) * 5 + 308;
        $gd = intdiv(self::mod($i, 153), 5) + 1;
        $gm = self::mod(intdiv($i, 153), 12) + 1;
        $gy = intdiv($j, 1461) - 100100 + intdiv(8 - $gm, 6);

        return [$gy, $gm, $gd];
    }

    private static function jalaliToJdn(int $jy, int $jm, int $jd): int
    {
        $r = self::jalCal($jy);

        return self::gregorianToJdn($r['gy'], 3, $r['march'])
            + ($jm - 1) * 31 - intdiv($jm, 7) * ($jm - 7) + $jd - 1;
    }

    /**
     * @return array{0: int, 1: int, 2: int}
     */
    private static function fromJdn(int $jdn): array
    {
        [$gy] = self::jdnToGregorian($jdn);
        $jy = $gy - 621;
        $r = self::jalCal($jy);
        $jdn1f = self::gregorianToJdn($gy, 3, $r['march']);
        $k = $jdn - $jdn1f;

        if ($k >= 0) {
            if ($k <= 185) {
                return [$jy, 1 + intdiv($k, 31), self::mod($k, 31) + 1];
            }
            $k -= 186;
        } else {
            $jy--;
            $k += 179;
            if ($r['leap'] === 1) {
                $k++;
            }
        }

        return [$jy, 7 + intdiv($k, 30), self::mod($k, 30) + 1];
    }

    private static function weekdayForJdn(int $jdn): int
    {
        return self::mod($jdn + 2, 7);
    }

    private static function mod(int $a, int $b): int
    {
        return $a - intdiv($a, $b) * $b;
    }
}
