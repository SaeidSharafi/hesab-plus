<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Services\CalendarExport;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use Illuminate\View\View;

class Reminders extends HesabScreen
{
    public ?string $exportedFile = null;

    public int $exportedCount = 0;

    public function exportCalendar(): void
    {
        $obligations = $this->ledger()->obligations(180, true);
        $export = new CalendarExport;
        $result = $export->save($obligations);
        $this->exportedFile = basename($result['path']);
        $this->exportedCount = $result['count'];
        $export->share($result['path']);
        $this->succeed('فایل تقویم با '.$this->number($result['count']).' رویداد ساخته شد. آن را به تقویم گوشی اضافه کنید.');
    }

    public function render(): View
    {
        $obligations = $this->ledger()->obligations(180, true);
        $accountNames = Account::query()->pluck('name', 'id');

        $rows = array_map(fn (array $item): array => [
            'title' => $item['title'],
            'subtitle' => $item['subtitle'],
            'amount' => $this->amount((int) $item['amount']),
            'due' => $this->dateText($item['due'], 'long'),
            'label' => JalaliDate::fromString($item['due'])?->dueLabel($this->today(), $this->settings()->numerals) ?? '—',
            'status' => $item['status'],
            'type' => match ($item['type']) {
                'installment' => 'قسط وام',
                'cheque' => 'چک',
                'debt' => 'بدهی/طلب',
                default => 'سررسید',
            },
            'account' => $accountNames[$item['account_id']] ?? null,
            'overdue' => $item['status'] === 'overdue',
        ], $obligations);

        return $this->screen('native.reminders', [
            'rows' => $rows,
            'exportedFile' => $this->exportedFile,
            'exportedCount' => $this->exportedCount,
            'dueCount' => count($obligations),
        ]);
    }
}
