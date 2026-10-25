<native:top-bar title="بیشتر" />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-28">
        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-xs text-theme-on-surface-variant">دارایی خالص</native:text>
            <native:text class="text-2xl font-extrabold text-theme-on-surface">{{ $netWorth }}</native:text>
            <native:row class="w-full gap-3">
                <native:text class="text-xs text-theme-on-surface-variant">{{ $num($accountsCount) }} حساب</native:text>
                <native:text class="text-xs text-theme-on-surface-variant">{{ $num($goalsCount) }} هدف</native:text>
                <native:text class="text-xs text-theme-on-surface-variant">{{ $num($obligationsCount) }} سررسید</native:text>
            </native:row>
        </native:column>

        <native:column class="w-full gap-1 rounded-2xl border border-theme-outline bg-theme-surface p-2">
            @php
                $items = [
                    ['label' => 'گزارش‌ها و بودجه', 'subtitle' => 'تفکیک دسته‌بندی و روند ماهانه', 'icon' => 'bar_chart', 'method' => 'reports'],
                    ['label' => 'پیش‌بینی نقدینگی', 'subtitle' => 'سناریوها، اهداف و هشدار کسری', 'icon' => 'timeline', 'method' => 'forecast'],
                    ['label' => 'حساب‌ها', 'subtitle' => 'بانک، کارت، نقد و سپرده', 'icon' => 'account_balance_wallet', 'method' => 'accounts'],
                    ['label' => 'دسته‌بندی و بودجه', 'subtitle' => 'مدیریت دسته‌ها و سقف ماهانه', 'icon' => 'category', 'method' => 'categories'],
                    ['label' => 'یادآورها و تقویم', 'subtitle' => 'خروجی تقویم با آلارم بومی', 'icon' => 'event_note', 'method' => 'reminders'],
                    ['label' => 'تنظیمات و پشتیبان', 'subtitle' => 'واحد پول، ارقام، نسخه پشتیبان', 'icon' => 'settings', 'method' => 'openSettings'],
                ];
            @endphp
            @foreach ($items as $item)
                <native:pressable class="w-full rounded-xl p-2" @tap="{{ $item['method'] }}">
                    <native:row class="w-full items-center gap-3">
                        <native:column class="h-10 w-10 items-center justify-center rounded-xl bg-theme-primary/10">
                            <native:icon :name="$item['icon']" :size="20" class="text-theme-primary" />
                        </native:column>
                        <native:column class="flex-1 gap-1">
                            <native:text class="text-sm font-semibold text-theme-on-surface">{{ $item['label'] }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $item['subtitle'] }}</native:text>
                        </native:column>
                        <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
                    </native:row>
                </native:pressable>
            @endforeach
        </native:column>

        <native:column class="w-full gap-1 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">درباره حساب+</native:text>
            <native:text class="text-xs text-theme-on-surface-variant">دفتر کل شخصی آفلاین؛ داده‌ها روی همین دستگاه ذخیره می‌شوند. نسخه ۲.۰</native:text>
        </native:column>
    </native:column>
</native:scroll-view>

@include('native.partials.bottom-nav', ['dueCount' => $dueCount])
