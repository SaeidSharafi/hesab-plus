<native:top-bar title="یادآورها و تقویم" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:column class="w-full gap-2 rounded-2xl border border-theme-primary/30 bg-theme-primary/5 p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">آلارم مطمئن با تقویم گوشی</native:text>
            <native:text class="text-xs text-theme-on-surface-variant">
                حساب+ فایل تقویم استاندارد می‌سازد و هر سررسید را با سه هشدار (۳ روز قبل، ۱ روز قبل و روز سررسید) به تقویم اضافه می‌کند.
                این هشدارها را سیستم‌عامل مدیریت می‌کند و بعد از ری‌استارت هم از بین نمی‌روند.
            </native:text>
            <native:button label="ساخت و افزودن به تقویم" variant="primary" size="md" @tap="exportCalendar" />
            @if ($exportedFile)
                <native:text class="text-xs text-theme-success">{{ $exportedCount }} رویداد در فایل {{ $exportedFile }} ساخته شد.</native:text>
            @endif
        </native:column>

        <native:row class="w-full items-center justify-between">
            <native:text class="text-sm font-bold text-theme-on-surface">سررسیدهای ۱۸۰ روز آینده</native:text>
            <native:text class="text-xs text-theme-on-surface-variant">{{ $num($dueCount) }} مورد</native:text>
        </native:row>

        @if ($rows === [])
            @include('native.partials.empty-state', [
                'icon' => 'event_available',
                'title' => 'سررسیدی وجود ندارد',
                'body' => 'با ثبت وام، چک یا بدهی، سررسیدها اینجا نمایش داده می‌شوند.',
            ])
        @else
            @foreach ($rows as $row)
                <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                    <native:row class="w-full items-start justify-between gap-2">
                        <native:column class="flex-1 gap-1">
                            <native:text class="text-xs font-semibold {{ $row['overdue'] ? 'text-theme-destructive' : 'text-theme-on-surface-variant' }}">{{ $row['type'] }}</native:text>
                            <native:text class="text-sm font-bold text-theme-on-surface">{{ $row['title'] }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $row['subtitle'] }}</native:text>
                        </native:column>
                        <native:text class="text-sm font-bold text-theme-on-surface">{{ $row['amount'] }}</native:text>
                    </native:row>
                    <native:row class="w-full items-center justify-between">
                        <native:text class="text-xs text-theme-on-surface-variant">{{ $row['due'] }}</native:text>
                        <native:text class="text-xs font-semibold {{ $row['overdue'] ? 'text-theme-destructive' : 'text-theme-accent' }}">{{ $row['label'] }}</native:text>
                    </native:row>
                    @if ($row['account'])
                        <native:text class="text-xs text-theme-on-surface-variant">حساب: {{ $row['account'] }}</native:text>
                    @endif
                </native:column>
            @endforeach
        @endif
    </native:column>
</native:scroll-view>
