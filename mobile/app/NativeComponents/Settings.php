<?php

namespace App\NativeComponents;

use App\Services\BackupService;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\Persian;
use Illuminate\View\View;

class Settings extends HesabScreen
{
    public string $inflationInput = '';

    public bool $hideBalances = false;

    public ?string $backupName = null;

    public ?int $backupRows = null;

    public bool $showRestore = false;

    public bool $showClear = false;

    public bool $showDemo = false;

    public function mount(): void
    {
        $settings = $this->settings();
        $this->inflationInput = Persian::number($settings->inflation_percent, 0, $settings->numerals);
        $this->hideBalances = $settings->hide_balances;
        $latest = (new BackupService)->latestBackupPath();
        if ($latest !== null) {
            $this->backupName = basename($latest);
        }
    }

    public function updatedHideBalances(): void
    {
        (new LedgerWriter)->updateSettings(['hide_balances' => $this->hideBalances]);
    }

    public function setCurrency(string $currency): void
    {
        if (in_array($currency, ['TOMAN', 'RIAL'], true)) {
            (new LedgerWriter)->updateSettings(['currency' => $currency]);
        }
    }

    public function setNumerals(string $numerals): void
    {
        if (in_array($numerals, ['fa', 'en'], true)) {
            (new LedgerWriter)->updateSettings(['numerals' => $numerals]);
        }
    }

    public function saveInflation(): void
    {
        $value = (int) str_replace([',', '٬', '،', ' '], '', Persian::english($this->inflationInput));
        $value = max(0, min(300, $value));
        (new LedgerWriter)->updateSettings(['inflation_percent' => $value]);
        $this->inflationInput = Persian::number($value, 0, $this->settings()->numerals);
        $this->succeed('نرخ تورم ذخیره شد.');
    }

    public function reminders(): void
    {
        $this->go('/reminders');
    }

    public function createBackup(bool $share = false): void
    {
        $service = new BackupService;
        $backup = $service->createBackup();
        $this->backupName = $backup['name'];
        $this->backupRows = $backup['rows'];
        $this->succeed('نسخه پشتیبان ساخته شد: '.$backup['name']);

        if ($share) {
            $service->share($backup['path']);
        }
    }

    public function shareBackup(): void
    {
        $service = new BackupService;
        $latest = $service->latestBackupPath();
        if ($latest === null) {
            $this->createBackup(true);

            return;
        }
        $this->backupName = basename($latest);
        $service->share($latest);
    }

    public function requestRestore(): void
    {
        if ((new BackupService)->latestBackupPath() === null) {
            $this->fail('نسخه پشتیبانی روی دستگاه وجود ندارد.');

            return;
        }
        $this->showRestore = true;
    }

    public function closeRestore(): void
    {
        $this->showRestore = false;
    }

    public function restoreLatest(): void
    {
        $service = new BackupService;
        $latest = $service->latestBackupPath();
        if ($latest === null) {
            $this->fail('نسخه پشتیبانی پیدا نشد.');

            return;
        }

        if (! $service->importFile($latest)) {
            $this->fail('فایل پشتیبان معتبر نیست.');
            $this->showRestore = false;

            return;
        }

        $settings = $this->settings();
        $this->hideBalances = $settings->hide_balances;
        $this->inflationInput = Persian::number($settings->inflation_percent, 0, $settings->numerals);
        $this->showRestore = false;
        $this->succeed('نسخه پشتیبان بازیابی شد.');
    }

    public function requestDemo(): void
    {
        $this->showDemo = true;
    }

    public function closeDemo(): void
    {
        $this->showDemo = false;
    }

    public function loadDemo(): void
    {
        (new LedgerWriter)->loadDemo();
        $this->showDemo = false;
        $this->succeed('داده نمونه بارگذاری شد.');
        $this->go('/');
    }

    public function requestClear(): void
    {
        $this->showClear = true;
    }

    public function closeClear(): void
    {
        $this->showClear = false;
    }

    public function clearAll(): void
    {
        (new LedgerWriter)->clearAllAndRestart();
        $this->showClear = false;
        $this->go('/onboarding');
    }

    public function render(): View
    {
        $settings = $this->settings();
        $latest = (new BackupService)->latestBackupPath();

        return $this->screen('native.settings', [
            'settingsData' => $settings,
            'latestBackupName' => $latest !== null ? basename($latest) : null,
            'backupName' => $this->backupName,
            'backupRows' => $this->backupRows,
        ]);
    }
}
