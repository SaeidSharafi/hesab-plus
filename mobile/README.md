# Hesab+ — native Android app

Personal accounting, rebuilt as a **native Android app** with **Laravel 12 + NativePHP Mobile 4.6**.
Screens are PHP `NativeComponent` classes rendering **Jetpack Compose on Android** (and SwiftUI on iOS) through
NativePHP's native EDGE elements. There is no WebView, no PWA, and no local Android SDK required to develop.

> The original React/Vite prototype remains in the repository root for reference. It is **not** the app.

## What works

- **Ledger** — accounts, income/expense/transfer entries, tags, notes, Jalali date picker, search and filters.
- **Derived balances** — every account balance is calculated from its opening balance + transactions. Editing or
  deleting a transaction can never leave a stale balance.
- **Loans** — amortization schedules (reducing balance, flat rate, qard al-hasan), monthly/frequency installments,
  pay/undo, 7-day deferral, early-payoff savings, effective annual rate via XIRR.
- **Cheques** — issued/received, due dates, cash/bounce/return/cancel, linked ledger transaction, undo.
- **People ledger** — lent/borrowed entries in Toman, Rial, USD, gold grams or coins; partial settlements,
  forgiveness, polite reminder text.
- **Investments** — FIFO cost basis, realized/unrealized P/L, XIRR, allocation, manual price updates, buy/sell lots.
- **Reports** — period and category tree rollups, six-month trend, budgets vs actual.
- **Forecast** — daily cash-flow projection from scheduled installments/cheques/debts + median historical baselines,
  scenario toggles, shortfall alerts, goal pacing.
- **Reminders** — free, native-calendar export (`.ics`) with three OS-level alarms per obligation (3 days before,
  1 day before, day-of at 09:00 Tehran). This is the reliable free path; see “Known limitations” below.
- **Settings/backup** — Toman/Rial, Persian/English digits, hide balances, internal JSON backup + share, restore,
  demo data, clear all.
- **First run** — onboarding with “start empty” or a coherent, today-relative demo ledger.

## Quick start (no Android SDK)

```bash
cd mobile
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --force
php artisan test
```

Preview on a real Android phone with the free **Jump** app:

```bash
php artisan native:jump
```

Install Jump from <https://bifrost.nativephp.com/jump>, scan the QR, and the app runs on your phone. No Android
Studio, Gradle, JDK or emulator is needed for this loop.

> This project is developed inside WSL2. NativePHP blocks Android **native builds** on WSL, and `native:jump` from
> WSL needs mirrored networking. The reliable options are (a) run `php artisan native:jump` from a Windows terminal
> with PHP 8.4 (e.g. Laravel Herd) against the WSL project, or (b) use the cloud build below. Details:
> [CLOUD_BUILD.md](CLOUD_BUILD.md).

## Build the APK in the cloud (free)

The repository includes [`.github/workflows/android.yml`](../.github/workflows/android.yml). It builds a signed
release APK on GitHub's Ubuntu runner (which has the Android SDK) and uploads it as an artifact.

1. Push the repository to GitHub (main branch).
2. Open **Actions → Android APK → Run workflow**.
3. Download the **hesab-plus-apk** artifact and install the APK.

The CI uses a disposable signing key for test installs. For Play Store releases, use your own keystore secrets.
See [CLOUD_BUILD.md](CLOUD_BUILD.md) for the full walkthrough.

## Architecture

```
mobile/
├── app/NativeComponents/     Native screens (PHP → Compose/SwiftUI)
├── app/Models/               Eloquent models (SQLite)
├── app/Services/
│   ├── Ledger.php            balances, reports, obligations, loan/debt summaries
│   ├── LedgerWriter.php      the single write path for every money movement
│   ├── Amortization.php      loan schedules + early payoff
│   ├── Portfolio.php         FIFO lots, P/L, allocation
│   ├── Forecast.php          cash-flow projection
│   ├── Xirr.php              irregular cash-flow return
│   ├── BackupService.php     JSON backup/restore of all tables
│   └── CalendarExport.php    .ics with native alarms
├── app/Support/              Jalali calendar, Rial formatting, Persian digits, base screen
├── database/migrations/      schema + default categories/settings
├── database/seeders/         demo ledger (today-relative)
├── resources/views/native/   native Blade views (EDGE elements + Tailwind tokens)
├── resources/fonts/          bundled Vazirmatn weights
├── tests/                    47 tests / 322 assertions
└── public/icon.png, splash   generated brand assets
```

### Money and dates

- All amounts are **integer Rial** in SQLite. Toman is display-only.
- All business dates are **Jalali strings** (`YYYY/MM/DD`, zero-padded) so sorting and indexing are stable.
- The Jalali engine is pure PHP (Jalaali/Borkowski), not Android ICU, so the same logic runs in tests and on device.
- Times/“today” use `Asia/Tehran` via `APP_TIMEZONE` (configurable in `.env`).

### Data integrity rules

- Account `balance` is not stored. It is always `opening_balance + Σ deltas`.
- Generated movements (loan payments, cheque cashings, debt settlements, investment trades) are linked with
  `ref_kind`/`ref_id`; they are managed from their own screens, never through the generic editor.
- Deleting a loan/cheque/debt cascades its generated transactions, so cash balances self-correct.
- Backup/restore is all-or-nothing in a transaction with foreign keys disabled.

## Verified cloud build

The app was built and signed on GitHub Actions (no local SDK):

- **Release:** [v2.0.0-native](https://github.com/SaeidSharafi/hesab-plus/releases/tag/v2.0.0-native)
- **Run:** [Android APK #40197612172](https://github.com/SaeidSharafi/hesab-plus/actions/runs/40197612172)
- `apksigner`: **v2 signature verified**; package `ir.hesab.plus`, versionName `2.0.0`, minSdk 26, targetSdk 35,
  label `حساب+`, ABI `arm64-v8a`.
- APK size ≈ 36 MB. Install on an arm64 Android 8+ phone (unknown sources).

## Testing

```bash
cd mobile
php artisan test --compact          # 47 tests, 322 assertions
php artisan native:validate         # warns (not errors) about dynamic view resolution
```

Tests use `Native::test()` / `Native::visit()` to render the real native component tree without a device, plus
unit tests for Jalali/Money/Amortization and feature tests for every write flow.

## Known limitations / next steps

- **OS notifications**: local scheduled notifications in NativePHP are a paid plugin. The free, reliable path is
  the calendar `.ics` export in “یادآورها و تقویم”; it uses the phone calendar's native alarms and survives reboot,
  Doze and OEM battery killers. If you buy `nativephp/mobile-local-notifications`, wire it into `Reminders`/
  `LedgerWriter::payInstallment`.
- **RTL**: NativePHP/Compose follows the device layout direction. The app declares Persian (`supported_locales: fa`)
  and `APP_LOCALE=fa`; set the phone's language (or Android 13 per-app language) to Persian for full RTL. Screens
  use right-aligned Persian text and explicitly ordered money rows as a fallback.
- **Database encryption**: SQLite is sandboxed in the app but not SQLCipher-encrypted yet. Add SQLCipher or
  NativePHP secure storage before storing highly sensitive data.
- **External restore**: restore uses the app's internal backup files; sharing works, but importing an external JSON
  file needs a document-picker plugin.
- **Charts**: reports/forecast currently use native progress bars and month rows, not a canvas line/treemap chart.
- **Native screenshot verification**: no emulator is available here, so the UI was verified through 47 in-process
  render/interaction tests. Do a Jump device pass for visual polish.
- **CI signing key**: the cloud workflow generates a fresh disposable key per run, so installing a newer CI APK
  over an older one fails with a signature mismatch. Uninstall the previous app first, or configure a persistent
  keystore (documented in [CLOUD_BUILD.md](CLOUD_BUILD.md)) for true updates.
- **ABI**: the current NativePHP Android build ships `arm64-v8a` only. It will not install on old 32-bit phones or
  on x86 emulators.

## Spec

The original product/technical spec is at the repository root:
[Personal Accounting Android App — Product & Technical Spec.md](../Personal%20Accounting%20Android%20App%20—%20Product%20%26%20Technical%20Spec.md).
This implementation covers the v1 core ledger, loans, debts, cheques, investments, reports, forecast and reminders;
sync, SMS parsing, price feeds, PDF/Excel export and a Play Store release remain future work.

## Credits

Built with [Laravel](https://laravel.com), [NativePHP for Mobile](https://nativephp.com), Pest, Vazirmatn.
