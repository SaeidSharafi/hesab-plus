# حساب+ / Hesab+

A native Android personal-accounting app. Persian-first, RTL, Jalali calendar, offline SQLite.

**The app is in [`mobile/`](mobile/).** It is built with Laravel 12 + NativePHP Mobile 4.6: PHP `NativeComponent`
screens render real Jetpack Compose (Android) / SwiftUI (iOS) through native EDGE components. It is not a WebView
and not a PWA.

> The old React/Vite prototype is still in the repository root for reference. It is not the product and is not
> maintained. The spec is
> [Personal Accounting Android App — Product & Technical Spec.md](<Personal Accounting Android App — Product & Technical Spec.md>).

## Start here

- **[Native app README](mobile/README.md)** — features, architecture, tests, limitations.
- **[Cloud build & device preview](mobile/CLOUD_BUILD.md)** — no JDK/Android SDK needed.
- **Test on a phone now:** install [Jump](https://bifrost.nativephp.com/jump), then from `mobile/` run
  `php artisan native:jump` (from Windows if you are in WSL).
- **Build an APK free:** push to GitHub and run the **Android APK** workflow
  ([`.github/workflows/android.yml`](.github/workflows/android.yml)); download the artifact.

## Verified build

- **APK:** [v2.0.0-native release](https://github.com/SaeidSharafi/hesab-plus/releases/tag/v2.0.0-native)
  (private repo; also `dist/hesab-plus-2.0.0.apk` in this workspace).
- **Cloud run:** [Android APK #40197612172](https://github.com/SaeidSharafi/hesab-plus/actions/runs/40197612172)
  — 5m09s, `apksigner` v2 signature verified.
- **Manifest:** `ir.hesab.plus`, versionName `2.0.0`, compileSdk 35, targetSdk 35, minSdk 26, label `حساب+`.
- **Native libraries:** `arm64-v8a` (modern Android phones).
- `php artisan test` → **47 passed / 322 assertions**
- `php artisan native:validate` → **passed** (20 expected warnings about dynamic view resolution)

No JDK, Android SDK, Gradle or emulator was installed in this environment; everything was built on GitHub's runner.

## Implemented

Ledger with derived balances · Jalali date picker · loans/amortization + early payoff · cheques · per-person debt
ledger with partial settlements · FIFO investment portfolio with XIRR · category reports + budgets · cash-flow
forecast with scenarios and goals · onboarding + demo data · JSON backup/restore · native-calendar alarm export.

## Not yet

OS push/local notification plugin (paid), SQLCipher encryption, external file restore, canvas charts, SMS import,
price feeds, sync, Play Store signing.
