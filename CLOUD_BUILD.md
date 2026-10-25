# Cloud build and device preview

This project deliberately does **not** require a local JDK, Android Studio or Android SDK.

There are two free online paths.

---

## A. Preview on a real phone in ~2 minutes — Jump

NativePHP's free **Jump** app hosts the Laravel app on your phone without compiling it.

1. Install **Jump** on the Android phone: <https://bifrost.nativephp.com/jump>
2. From the project root, start the dev server:

   ```bash
   php artisan native:jump
   ```

3. Scan the QR code with the Jump app.

### If you are in WSL2 (this project currently is)

`native:jump` binds a LAN server. WSL2's default NAT network hides it from the phone. Two options:

- **Run from Windows** (recommended): open PowerShell, use a PHP 8.4 CLI such as Laravel Herd's, and point it at
  the WSL project:

  ```powershell
  cd \\wsl.localhost\Ubuntu\home\<you>\www\hesab
  php artisan native:jump
  ```

  Allow the Windows Firewall prompt for PHP on private networks.
- **Mirrored networking**: add `networkingMode=mirrored` under `[wsl2]` in `%UserProfile%\.wslconfig`, run
  `wsl --shutdown`, then run `php artisan native:jump` from WSL. Newer Windows 11 builds only.

The app reads `.env`; no build is produced, so nothing is installed globally.

---

## B. Free cloud APK — GitHub Actions

The workflow is committed at [`.github/workflows/android.yml`](.github/workflows/android.yml). It runs on
GitHub's Ubuntu runner, installs PHP 8.4, Java 17 and the Android SDK **on the runner**, builds a signed release
APK, and uploads it as an artifact.

### One-time setup

1. Create a free GitHub account and an empty repository (e.g. `hesab-plus`).
2. From the repository root:

   ```bash
   git remote add origin https://github.com/<YOUR_USER>/hesab-plus.git
   git push -u origin main
   ```

3. Open **Actions → Android APK → Run workflow** (or push a change under `app/`).
4. When the job finishes, download the **hesab-plus-apk** artifact from the run page.
5. Install `app-release.apk` on the phone (open the file, or `adb install -r app-release.apk`).

### What the workflow does

- `php artisan test` — 47 tests / 322 assertions.
- `php artisan native:validate` — native EDGE component validation (20 warnings about dynamic views are expected).
- `php artisan native:install android` — downloads the embedded PHP runtime and the Android shell.
- `keytool` creates a **disposable CI signing key** (`hesabplus-ci`). This is fine for test installs.
- `php artisan native:package android --build-type=release` signs the APK.
- The APK is uploaded for 14 days.
- `apksigner verify` and `aapt dump badging` run in CI before upload.

The current verified build is
[v2.0.0-native](https://github.com/SaeidSharafi/hesab-plus/releases/tag/v2.0.0-native)
(`ir.hesab.plus`, versionName 2.0.0, minSdk 26, targetSdk 35, arm64-v8a, v2 signature), built from the root
layout in [run #40220010036](https://github.com/SaeidSharafi/hesab-plus/actions/runs/40220010036) (5m04s).

**Disposable key:** every CI run generates a fresh keystore, so a newer CI APK cannot update an older one in place.
Uninstall the previous build first, or configure a persistent keystore for real updates.

### For a Play Store release

Replace the disposable key with repository secrets and pass them to `native:package`:

- `ANDROID_KEYSTORE_BASE64` (decode to `release.keystore`)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Use `--build-type=bundle` for an `.aab`, and upload it to the Play Console. Do not distribute the CI key.

### Alternative cloud builders

Any Ubuntu runner with Java 17 + Android SDK can run the same commands. On Codemagic / Appcircle / Bitrise:

```bash
composer install --no-interaction --prefer-dist --optimize-autoloader
cp .env.example .env && php artisan key:generate
php artisan native:install android --no-interaction
php artisan native:package android --build-type=release \
  --keystore=release.keystore --keystore-password=… \
  --key-alias=… --key-password=… --output=build --no-tty
```

GitHub Actions is recommended because it is free for normal usage and needs no extra account.

---

## Notes and troubleshooting

- **Do not run `native:install android` in WSL.** NativePHP blocks it; use the cloud runner or a native Linux
  machine. The source remains fully editable in WSL.
- **First Android build is slow** (Gradle + SDK downloads). The workflow caches Composer/Gradle between runs.
- **`native:validate` warnings** are caused by screens using `$this->screen('native.…')` instead of a literal
  `view()` call; they are not errors. `Validation passed with 20 warning(s)` is expected.
- **APK not found?** The workflow also uploads
  `nativephp/android/app/build/outputs/apk/release/**/*.apk` as a fallback.
- **Alarms**: this free build exports `.ics` reminders with three native calendar alarms. OS notification
  scheduling through NativePHP is a paid plugin; see the main README limitations.
- **RTL**: set the phone/app language to Persian for full RTL layout. The app is Persian-first (`APP_LOCALE=fa`).
