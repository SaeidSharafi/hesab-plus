<?php

namespace App\NativeComponents;

use App\Support\HesabScreen;
use App\Support\JalaliDate;
use Illuminate\View\View;

class JalaliCalendar extends HesabScreen
{
    public string $selected = '';

    public int $year = 0;

    public int $month = 0;

    public function mount(): void
    {
        $date = JalaliDate::fromString($this->selected) ?? $this->today();
        $this->selected = $date->toString();
        $this->year = $date->year;
        $this->month = $date->month;
    }

    public function updatedSelected(string $value): void
    {
        $date = JalaliDate::fromString($value);
        if ($date !== null) {
            $this->year = $date->year;
            $this->month = $date->month;
        }
    }

    public function previousMonth(): void
    {
        $date = new JalaliDate($this->year, $this->month, 1)->addMonths(-1);
        $this->year = $date->year;
        $this->month = $date->month;
    }

    public function nextMonth(): void
    {
        $date = new JalaliDate($this->year, $this->month, 1)->addMonths(1);
        $this->year = $date->year;
        $this->month = $date->month;
    }

    public function pick(string $date): void
    {
        $parsed = JalaliDate::fromString($date);
        if ($parsed === null) {
            return;
        }
        $this->selected = $parsed->toString();
        $this->year = $parsed->year;
        $this->month = $parsed->month;
        $this->emit('select', $parsed->toString());
    }

    public function pickToday(): void
    {
        $this->pick($this->today()->toString());
    }

    public function render(): View
    {
        $year = $this->year > 0 ? $this->year : $this->today()->year;
        $month = $this->month > 0 ? $this->month : $this->today()->month;
        $weeks = JalaliDate::monthGrid($year, $month);
        $selectedDate = JalaliDate::fromString($this->selected);
        $today = $this->today();

        return $this->screen('native.partials.jalali-calendar', [
            'year' => $year,
            'month' => $month,
            'monthLabel' => JalaliDate::monthName($month).' '.$this->formatDate(new JalaliDate($year, $month, 1), 'numeric'),
            'weeks' => $weeks,
            'weekdayShort' => array_map(fn (int $index): string => JalaliDate::weekdayShort($index), range(0, 6)),
            'selectedDate' => $selectedDate,
            'today' => $today,
        ]);
    }
}
