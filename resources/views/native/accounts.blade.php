<native:top-bar title="حساب‌ها" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-xs text-theme-on-surface-variant">مجموع موجودی حساب‌های شامل دارایی خالص</native:text>
            <native:text class="text-2xl font-extrabold text-theme-on-surface">{{ $total }}</native:text>
        </native:column>

        <native:row class="w-full items-center justify-between">
            <native:text class="text-sm font-bold text-theme-on-surface">حساب‌های فعال</native:text>
            <native:button label="+ حساب" size="sm" variant="tonal" @tap="openForm" />
        </native:row>

        @if ($rows === [])
            @include('native.partials.empty-state', [
                'icon' => 'account_balance',
                'title' => 'حسابی وجود ندارد',
                'body' => 'اولین حساب بانکی یا کیف پول را اضافه کنید.',
                'actionLabel' => 'افزودن حساب',
                'action' => 'openForm',
            ])
        @else
            @foreach ($rows as $row)
                <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                    <native:row class="w-full items-center gap-3">
                        <native:column class="h-11 w-11 items-center justify-center rounded-full bg-[{{ $row['color'] }}]">
                            <native:text class="text-sm font-bold text-white">{{ $row['initial'] }}</native:text>
                        </native:column>
                        <native:column class="flex-1 gap-1">
                            <native:text class="text-sm font-bold text-theme-on-surface">{{ $row['name'] }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $row['type'] }}{{ $row['bank'] ? ' · '.$row['bank'] : '' }}</native:text>
                        </native:column>
                        <native:text class="text-sm font-bold text-theme-on-surface">{{ $row['balance'] }}</native:text>
                    </native:row>
                    <native:row class="w-full items-center justify-between">
                        <native:text class="text-xs text-theme-on-surface-variant">{{ $row['include'] ? 'در دارایی خالص' : 'خارج از دارایی خالص' }}</native:text>
                        <native:pressable class="rounded-lg px-1 py-1" @tap="requestArchive({{ $row['id'] }})">
                            <native:text class="text-xs font-semibold text-theme-destructive">آرشیو</native:text>
                        </native:pressable>
                    </native:row>
                </native:column>
            @endforeach
        @endif
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showForm }}" detents="large" @dismiss="closeForm">
    <native:scroll-view class="w-full">
        <native:column class="w-full gap-3 bg-theme-surface p-5">
            <native:text class="text-base font-bold text-theme-on-surface">حساب جدید</native:text>
            <native:outlined-text-input label="نام حساب" placeholder="مثلاً بانک سامان" native:model.debounce.300ms="name" />
            <native:column class="w-full gap-2">
                <native:text class="text-xs font-bold text-theme-on-surface-variant">نوع حساب</native:text>
                <native:row class="w-full flex-wrap gap-2">
                    <native:button label="بانک" size="sm" variant="{{ $type === 'bank' ? 'primary' : 'ghost' }}" @tap="setType('bank')" />
                    <native:button label="کارت" size="sm" variant="{{ $type === 'card' ? 'primary' : 'ghost' }}" @tap="setType('card')" />
                    <native:button label="نقد" size="sm" variant="{{ $type === 'cash' ? 'primary' : 'ghost' }}" @tap="setType('cash')" />
                    <native:button label="کیف پول" size="sm" variant="{{ $type === 'wallet' ? 'primary' : 'ghost' }}" @tap="setType('wallet')" />
                    <native:button label="سپرده" size="sm" variant="{{ $type === 'savings' ? 'primary' : 'ghost' }}" @tap="setType('savings')" />
                    <native:button label="سرمایه" size="sm" variant="{{ $type === 'investment' ? 'primary' : 'ghost' }}" @tap="setType('investment')" />
                </native:row>
            </native:column>
            <native:outlined-text-input label="موجودی اولیه ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="openingInput" />
            <native:outlined-text-input label="نام بانک (اختیاری)" native:model.debounce.300ms="bankName" />
            <native:outlined-text-input label="شماره حساب / کارت (اختیاری)" native:model.debounce.300ms="number" />
            <native:row class="w-full items-center justify-between rounded-xl bg-theme-surface-variant p-3">
                <native:text class="flex-1 text-sm font-semibold text-theme-on-surface">در محاسبه دارایی خالص</native:text>
                <native:toggle native:model="includeInNetWorth" />
            </native:row>
            <native:row class="w-full gap-2">
                <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeForm" />
                <native:button label="افزودن" variant="primary" class="flex-1" @tap="save" />
            </native:row>
        </native:column>
    </native:scroll-view>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showArchive }}" detents="medium" @dismiss="closeArchive">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">آرشیو حساب؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">حساب از فهرست حذف می‌شود اما تراکنش‌هایش در گزارش‌ها می‌مانند.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeArchive" />
            <native:button label="آرشیو" variant="destructive" class="flex-1" @tap="archive" />
        </native:row>
    </native:column>
</native:bottom-sheet>
