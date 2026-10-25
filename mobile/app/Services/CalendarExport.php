<?php

namespace App\Services;

use App\Support\JalaliDate;
use Illuminate\Support\Facades\File;
use Native\Mobile\Facades\Share;

final class CalendarExport
{
    /**
     * Builds an ICS calendar containing every open obligation with three
     * native calendar alarms (3 days before, 1 day before, on the day at 09:00
     * Tehran). The phone's calendar then owns delivery and reboot rescheduling.
     *
     * @param  list<array<string, mixed>>  $obligations
     */
    public function build(array $obligations): string
    {
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Hesab Plus//Personal Accounting//FA',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:یادآورهای حساب+',
        ];

        foreach ($obligations as $item) {
            $due = JalaliDate::fromString((string) ($item['due'] ?? ''));
            if ($due === null) {
                continue;
            }
            $date = str_replace('-', '', $due->toIso());
            $uid = 'hesab-'.($item['type'] ?? 'item').'-'.($item['ref_id'] ?? uniqid()).'@hesab.plus';
            $amount = (int) ($item['amount'] ?? 0);
            $summary = (string) ($item['title'] ?? 'سررسید حساب+');
            $description = 'مبلغ: '.number_format($amount).' ریال'
                ."\n".'وضعیت: '.($item['subtitle'] ?? '')
                ."\n".'تاریخ سررسید: '.$due->toString();

            $lines = [...$lines,
                'BEGIN:VEVENT',
                'UID:'.$uid,
                'DTSTAMP:'.gmdate('Ymd\THis\Z'),
                'DTSTART:'.$date.'T053000Z',
                'DTEND:'.$date.'T063000Z',
                'SUMMARY:'.$this->escape('[حساب+] '.$summary),
                'DESCRIPTION:'.$this->escape($description),
                'TRANSP:TRANSPARENT',
                'BEGIN:VALARM',
                'TRIGGER:-P3D',
                'ACTION:DISPLAY',
                'DESCRIPTION:'.$this->escape('یادآوری ۳ روز قبل: '.$summary),
                'END:VALARM',
                'BEGIN:VALARM',
                'TRIGGER:-P1D',
                'ACTION:DISPLAY',
                'DESCRIPTION:'.$this->escape('یادآوری فردا: '.$summary),
                'END:VALARM',
                'BEGIN:VALARM',
                'TRIGGER:PT0S',
                'ACTION:DISPLAY',
                'DESCRIPTION:'.$this->escape('سررسید امروز: '.$summary),
                'END:VALARM',
                'END:VEVENT',
            ];
        }

        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", $lines)."\r\n";
    }

    /**
     * @param  list<array<string, mixed>>  $obligations
     * @return array{path: string, count: int}
     */
    public function save(array $obligations): array
    {
        $directory = storage_path('app'.DIRECTORY_SEPARATOR.'calendar');
        File::ensureDirectoryExists($directory);
        $path = $directory.DIRECTORY_SEPARATOR.'hesab-reminders.ics';
        File::put($path, $this->build($obligations));

        return ['path' => $path, 'count' => count($obligations)];
    }

    public function share(string $path): void
    {
        Share::file('حساب+', 'یادآورهای حساب+', $path);
    }

    private function escape(string $text): string
    {
        return str_replace(
            ['\\', ';', ',', "\r\n", "\n", "\r"],
            ['\\\\', '\\;', '\\,', '\\n', '\\n', '\\n'],
            $text
        );
    }
}
