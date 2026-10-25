<?php

namespace App\Support;

use App\Models\Setting;
use App\Services\Ledger;
use Illuminate\View\View;
use Native\Mobile\Edge\NativeComponent;

abstract class HesabScreen extends NativeComponent
{
    public string $notice = '';

    public string $noticeKind = 'error';

    protected function settings(): Setting
    {
        return Setting::current();
    }

    protected function today(): JalaliDate
    {
        return JalaliDate::today();
    }

    protected function ledger(): Ledger
    {
        return new Ledger;
    }

    protected function fail(string $message): void
    {
        $this->notice = $message;
        $this->noticeKind = 'error';
    }

    protected function succeed(string $message): void
    {
        $this->notice = $message;
        $this->noticeKind = 'success';
    }

    protected function clearNotice(): void
    {
        $this->notice = '';
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function screen(string $view, array $data = []): View
    {
        $settings = $this->settings();
        $today = JalaliDate::today();

        $money = function (int $rial, bool $signed = false, bool $symbol = true) use ($settings): string {
            if ($settings->hide_balances) {
                return '••••';
            }

            return Money::format(
                $rial,
                $settings->currency,
                $settings->numerals,
                $symbol,
                $signed ? 'always' : 'auto'
            );
        };

        $dateLabel = function (?string $date, string $style = 'long') use ($settings): string {
            $parsed = JalaliDate::fromString($date);

            return $parsed?->format($style, $settings->numerals) ?? '—';
        };

        $dueLabel = function (?string $date) use ($settings, $today): string {
            $parsed = JalaliDate::fromString($date);

            return $parsed?->dueLabel($today, $settings->numerals) ?? '—';
        };

        return view($view, array_merge([
            'settings' => $settings,
            'today' => $today,
            'todayLabel' => $today->format('long', $settings->numerals),
            'money' => $money,
            'compactMoney' => fn (int $rial): string => $settings->hide_balances
                ? '••••'
                : Money::compact($rial, $settings->currency, $settings->numerals),
            'dateLabel' => $dateLabel,
            'dueLabel' => $dueLabel,
            'percent' => fn (float $value, int $decimals = 0): string => Money::percent($value, $settings->numerals, $decimals),
            'num' => fn (int|float $value, int $decimals = 0): string => Persian::number($value, $decimals, $settings->numerals),
            'notice' => $this->notice,
            'noticeKind' => $this->noticeKind,
        ], $data));
    }

    protected function amount(int $rial, bool $signed = false, bool $symbol = true): string
    {
        $settings = $this->settings();
        if ($settings->hide_balances) {
            return '••••';
        }

        return Money::format(
            $rial,
            $settings->currency,
            $settings->numerals,
            $symbol,
            $signed ? 'always' : 'auto'
        );
    }

    protected function number(int|float $value, int $decimals = 0): string
    {
        return Persian::number($value, $decimals, $this->settings()->numerals);
    }

    protected function percent(float $value, int $decimals = 0): string
    {
        return Money::percent($value, $this->settings()->numerals, $decimals);
    }

    protected function dateText(?string $date, string $style = 'long'): string
    {
        return JalaliDate::fromString($date)?->format($style, $this->settings()->numerals) ?? '—';
    }

    protected function go(string $path): void
    {
        $this->navigate($path);
    }

    protected function formatDate(?JalaliDate $date, string $style = 'long'): string
    {
        return $date?->format($style, $this->settings()->numerals) ?? '—';
    }
}
