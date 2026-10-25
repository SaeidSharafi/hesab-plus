<native:top-bar title="تنظیمات و پشتیبان" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">واحد پول و ارقام</native:text>
            <native:row class="w-full gap-2">
                <native:button label="تومان" size="sm" class="flex-1" variant="{{ $settingsData->currency === 'TOMAN' ? 'primary' : 'ghost' }}" @tap="setCurrency('TOMAN')" />
                <native:button label="ریال" size="sm" class="flex-1" variant="{{ $settingsData->currency === 'RIAL' ? 'primary' : 'ghost' }}" @tap="setCurrency('RIAL')" />
            </native:row>
            <native:text class="text-xs text-theme-on-surface-variant">مبالغ همیشه به ریال ذخیره می‌شوند؛ این تنظیم فقط نمایش را تغییر می‌دهد.</native:text>
            <native:row class="w-full gap-2">
                <native:button label="ارقام فارسی" size="sm" class="flex-1" variant="{{ $settingsData->numerals === 'fa' ? 'primary' : 'ghost' }}" @tap="setNumerals('fa')" />
                <native:button label="ارقام انگلیسی" size="sm" class="flex-1" variant="{{ $settingsData->numerals === 'en' ? 'primary' : 'ghost' }}" @tap="setNumerals('en')" />
            </native:row>
            <native:row class="w-full items-center justify-between rounded-xl bg-theme-surface-variant p-3">
                <native:column class="flex-1 gap-1">
                    <native:text class="text-sm font-semibold text-theme-on-surface">مخفی کردن موجودی‌ها</native:text>
                    <native:text class="text-xs text-theme-on-surface-variant">برای وقتی که گوشی در دست دیگران است.</native:text>
                </native:column>
                <native:toggle native:model="hideBalances" />
            </native:row>
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">پیش‌بینی و تورم</native:text>
            <native:row class="w-full gap-2">
                <native:outlined-text-input class="flex-1" label="نرخ تورم سالانه (٪)" keyboard="number" native:model.debounce.300ms="inflationInput" />
                <native:button label="ذخیره" variant="tonal" @tap="saveInflation" />
            </native:row>
            <native:text class="text-xs text-theme-on-surface-variant">در پیش‌بینی، نمایش «با تورم» از این نرخ استفاده می‌کند.</native:text>
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">یادآورها</native:text>
            <native:text class="text-xs text-theme-on-surface-variant">برای هشدارهای مطمئن روی اندروید، سررسیدها را به تقویم گوشی اضافه کنید؛ آلارم‌ها را خود سیستم‌عامل مدیریت می‌کند.</native:text>
            <native:button label="مشاهده و خروجی تقویم" variant="tonal" size="sm" @tap="reminders" />
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">نسخه پشتیبان</native:text>
            <native:text class="text-xs text-theme-on-surface-variant">
                @if ($latestBackupName)
                    آخرین نسخه روی دستگاه: {{ $latestBackupName }}
                @else
                    هنوز نسخه‌ای روی دستگاه ساخته نشده است.
                @endif
            </native:text>
            @if ($backupName)
                <native:text class="text-xs text-theme-on-surface-variant">ساخته شد: {{ $backupName }}{{ $backupRows !== null ? ' · '.$num($backupRows).' ردیف' : '' }}</native:text>
            @endif
            <native:row class="w-full gap-2">
                <native:button label="ساخت نسخه" size="sm" variant="primary" class="flex-1" @tap="createBackup" />
                <native:button label="اشتراک‌گذاری" size="sm" variant="tonal" class="flex-1" @tap="shareBackup" />
            </native:row>
            <native:button label="بازیابی آخرین نسخه" size="sm" variant="ghost" @tap="requestRestore" />
            <native:text class="text-xs text-theme-on-surface-variant">نسخه پشتیبان شامل همه حساب‌ها، تراکنش‌ها، اقساط و دارایی‌هاست.</native:text>
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">داده‌ها</native:text>
            <native:button label="بارگذاری داده نمونه" size="sm" variant="tonal" @tap="requestDemo" />
            <native:button label="پاک کردن همه داده‌ها" size="sm" variant="destructive" @tap="requestClear" />
        </native:column>

        <native:column class="w-full gap-1 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">درباره</native:text>
            <native:text class="text-xs text-theme-on-surface-variant">حساب+ نسخه ۲.۰ · ساخته‌شده با Laravel و NativePHP Mobile · داده‌ها فقط روی دستگاه</native:text>
        </native:column>
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showRestore }}" detents="medium" @dismiss="closeRestore">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">بازیابی نسخه پشتیبان؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">داده‌های فعلی با آخرین نسخه پشتیبان جایگزین می‌شوند. این کار قابل بازگشت نیست.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeRestore" />
            <native:button label="بازیابی" variant="primary" class="flex-1" @tap="restoreLatest" />
        </native:row>
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showDemo }}" detents="medium" @dismiss="closeDemo">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">بارگذاری داده نمونه؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">داده‌های فعلی پاک و مجموعه نمونه جایگزین می‌شود.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeDemo" />
            <native:button label="بارگذاری" variant="primary" class="flex-1" @tap="loadDemo" />
        </native:row>
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showClear }}" detents="medium" @dismiss="closeClear">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-destructive">پاک کردن همه داده‌ها؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">همه حساب‌ها، تراکنش‌ها و اقساط حذف می‌شوند. ابتدا نسخه پشتیبان بگیرید.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeClear" />
            <native:button label="پاک کردن" variant="destructive" class="flex-1" @tap="clearAll" />
        </native:row>
    </native:column>
</native:bottom-sheet>
