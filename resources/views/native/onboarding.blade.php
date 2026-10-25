<native:column class="safe-area w-full h-full bg-theme-background">
    <native:scroll-view class="w-full flex-1">
        <native:column class="w-full gap-6 px-5 py-8">
            <native:column class="w-full items-center gap-3">
                <native:column class="h-20 w-20 items-center justify-center rounded-3xl bg-theme-primary">
                    <native:text class="text-4xl font-extrabold text-theme-on-primary">ح+</native:text>
                </native:column>
                <native:text class="text-2xl font-extrabold text-theme-on-background">حساب‌پلاس</native:text>
                <native:text class="text-center text-sm text-theme-on-surface-variant">
                    دفتر کل شخصی، اقساط، بدهی‌ها و سرمایه‌گذاری؛ همه در یک جا و کاملاً آفلاین.
                </native:text>
            </native:column>

            @include('native.partials.notice')

            <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                <native:row class="w-full items-center gap-3">
                    <native:icon name="account_balance_wallet" :size="22" class="text-theme-primary" />
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-sm font-bold text-theme-on-surface">دفترکل دقیق</native:text>
                        <native:text class="text-xs text-theme-on-surface-variant">موجودی هر حساب از روی تراکنش‌ها محاسبه می‌شود؛ نه دستی.</native:text>
                    </native:column>
                </native:row>
                <native:row class="w-full items-center gap-3">
                    <native:icon name="event_note" :size="22" class="text-theme-accent" />
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-sm font-bold text-theme-on-surface">وام، چک و بدهی</native:text>
                        <native:text class="text-xs text-theme-on-surface-variant">جدول اقساط، تسویه جزئی و سررسیدهای پیش‌رو.</native:text>
                    </native:column>
                </native:row>
                <native:row class="w-full items-center gap-3">
                    <native:icon name="trending_up" :size="22" class="text-theme-success" />
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-sm font-bold text-theme-on-surface">دارایی و پیش‌بینی</native:text>
                        <native:text class="text-xs text-theme-on-surface-variant">سود و زیان طلا، سکه، صندوق و ارز، همراه با پیش‌بینی نقدینگی.</native:text>
                    </native:column>
                </native:row>
            </native:column>

            <native:column class="w-full gap-2">
                <native:text class="text-sm font-bold text-theme-on-surface">واحد نمایش مبالغ</native:text>
                <native:row class="w-full gap-2">
                    <native:button label="تومان" size="sm" class="flex-1" variant="{{ $currency === 'TOMAN' ? 'primary' : 'ghost' }}" @tap="chooseCurrency('TOMAN')" />
                    <native:button label="ریال" size="sm" class="flex-1" variant="{{ $currency === 'RIAL' ? 'primary' : 'ghost' }}" @tap="chooseCurrency('RIAL')" />
                </native:row>
                <native:text class="text-xs text-theme-on-surface-variant">ذخیره‌سازی همیشه به ریال است؛ این فقط نحوه نمایش است.</native:text>
            </native:column>

            <native:column class="w-full gap-3">
                @if ($accountsCount > 0)
                    <native:button label="ورود به برنامه" variant="primary" size="lg" @tap="startEmpty" />
                @else
                    <native:button label="شروع از صفر" variant="primary" size="lg" @tap="startEmpty" />
                    <native:button label="مشاهده با داده نمونه" variant="tonal" size="lg" @tap="loadDemo" />
                @endif
                <native:text class="text-center text-xs text-theme-on-surface-variant">
                    همه داده‌ها روی همین گوشی می‌مانند. بدون نیاز به حساب کاربری یا اینترنت.
                </native:text>
            </native:column>
        </native:column>
    </native:scroll-view>
</native:column>
