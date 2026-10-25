<native:top-bar title="وام جدید" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:outlined-text-input label="نام بانک یا پرداخت‌کننده وام" placeholder="مثلاً بانک ملی یا قرض‌الحسنه رسالت" native:model.debounce.300ms="lender" autofocus />

        <native:outlined-text-input
            label="اصل وام ({{ $currencyLabel }})"
            placeholder="مثلاً ۱۰۰,۰۰۰,۰۰۰"
            keyboard="number"
            native:model.debounce.300ms="principalInput"
        />

        <native:column class="w-full gap-2">
            <native:text class="text-xs font-bold text-theme-on-surface-variant">مدل بازپرداخت</native:text>
            <native:row class="w-full gap-2">
                <native:button label="اقساط مساوی" size="sm" class="flex-1" variant="{{ $model === 'reducing_balance' ? 'primary' : 'ghost' }}" @tap="setModel('reducing_balance')" />
                <native:button label="کارمزد ثابت" size="sm" class="flex-1" variant="{{ $model === 'flat_rate' ? 'primary' : 'ghost' }}" @tap="setModel('flat_rate')" />
                <native:button label="قرض‌الحسنه" size="sm" class="flex-1" variant="{{ $model === 'qard_hasan' ? 'primary' : 'ghost' }}" @tap="setModel('qard_hasan')" />
            </native:row>
            <native:text class="text-xs text-theme-on-surface-variant">
                اگر جدول اقساط بانک با فرمول نمی‌خواند، مدل «کارمزد ثابت» یا مبلغ کل را با بانک تطبیق دهید.
            </native:text>
        </native:column>

        <native:row class="w-full gap-2">
            <native:outlined-text-input class="flex-1" label="نرخ سالانه (٪)" keyboard="decimal" native:model.debounce.300ms="rateInput" />
            <native:outlined-text-input class="flex-1" label="تعداد اقساط" keyboard="number" native:model.debounce.300ms="countInput" />
        </native:row>

        <native:row class="w-full gap-2">
            <native:outlined-text-input class="flex-1" label="فاصله اقساط (ماه)" keyboard="number" native:model.debounce.300ms="frequencyInput" />
            <native:outlined-text-input class="flex-1" label="کارمزد اولیه ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="feeInput" />
        </native:row>

        <native:row class="w-full gap-2">
            <native:outlined-text-input class="flex-1" label="جریمه دیرکرد (٪ سالانه)" keyboard="decimal" native:model.debounce.300ms="penaltyInput" />
            <native:pressable class="flex-1 rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openDatePicker">
                <native:column class="gap-1">
                    <native:text class="text-xs text-theme-on-surface-variant">اولین قسط</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $firstDueLabel }}</native:text>
                </native:column>
            </native:pressable>
        </native:row>

        <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openAccountPicker">
            <native:row class="w-full items-center gap-3">
                @if ($selectedAccount)
                    <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $selectedAccount->color }}]">
                        <native:text class="text-sm font-bold text-white">{{ mb_substr($selectedAccount->name, 0, 1) }}</native:text>
                    </native:column>
                @endif
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-surface-variant">حساب واریز وام و پرداخت اقساط</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $selectedAccount?->name ?? 'انتخاب حساب' }}</native:text>
                </native:column>
                <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
            </native:row>
        </native:pressable>

        <native:outlined-text-input label="یادداشت" placeholder="مثلاً تسهیلات مسکن" native:model.debounce.300ms="note" multiline />

        @if ($preview)
            <native:column class="w-full gap-3 rounded-2xl border border-theme-primary/30 bg-theme-primary/5 p-4">
                <native:text class="text-sm font-bold text-theme-on-surface">پیش‌نمایش جدول اقساط</native:text>
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-xs text-theme-on-surface-variant">قسط ماهانه</native:text>
                    <native:text class="text-sm font-bold text-theme-primary">{{ $preview['installment'] }}</native:text>
                </native:row>
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-xs text-theme-on-surface-variant">سود / کارمزد کل</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $preview['total_interest'] }}</native:text>
                </native:row>
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-xs text-theme-on-surface-variant">مبلغ کل بازپرداخت</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $preview['total_payment'] }}</native:text>
                </native:row>
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-xs text-theme-on-surface-variant">آخرین قسط</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $preview['last_due'] }}</native:text>
                </native:row>
            </native:column>
        @endif

        <native:button label="ثبت وام و ساخت جدول اقساط" variant="primary" size="lg" @tap="save" />
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showAccountPicker }}" detents="large" @dismiss="closeAccountPicker">
    <native:column class="w-full gap-2 bg-theme-surface p-4">
        <native:text class="text-base font-bold text-theme-on-surface">انتخاب حساب</native:text>
        @foreach ($accounts as $account)
            <native:pressable class="w-full rounded-xl p-2" @tap="selectAccount({{ $account['id'] }})">
                <native:row class="w-full items-center gap-3">
                    <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $account['color'] }}]">
                        <native:text class="text-sm font-bold text-white">{{ $account['initial'] }}</native:text>
                    </native:column>
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $account['name'] }}</native:text>
                        <native:text class="text-xs text-theme-on-surface-variant">{{ $account['balance'] }}</native:text>
                    </native:column>
                </native:row>
            </native:pressable>
        @endforeach
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showDatePicker }}" detents="large" @dismiss="closeDatePicker">
    <native:jalali-calendar :selected="$firstDue" @select="setDate" />
</native:bottom-sheet>
