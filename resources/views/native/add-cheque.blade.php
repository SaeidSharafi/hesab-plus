<native:top-bar title="چک جدید" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:row class="w-full gap-2 rounded-xl bg-theme-surface-variant p-1">
            <native:button label="چک پرداختی" size="sm" class="flex-1" variant="{{ $direction === 'issued' ? 'primary' : 'ghost' }}" @tap="setDirection('issued')" />
            <native:button label="چک دریافتی" size="sm" class="flex-1" variant="{{ $direction === 'received' ? 'primary' : 'ghost' }}" @tap="setDirection('received')" />
        </native:row>

        <native:outlined-text-input label="شماره چک / شناسه صیادی" placeholder="مثلاً ۷۴۸۲۹۱۰۳۸۴۷۲۹۱۰۴" keyboard="number" native:model.debounce.300ms="number" autofocus />

        <native:outlined-text-input label="بانک صادرکننده" native:model.debounce.300ms="bank" />

        <native:outlined-text-input label="مبلغ چک ({{ $currencyLabel }})" placeholder="مثلاً ۴۰,۰۰۰,۰۰۰" keyboard="number" native:model.debounce.300ms="amountInput" />

        <native:row class="w-full gap-2">
            <native:pressable class="flex-1 rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openIssuePicker">
                <native:column class="gap-1">
                    <native:text class="text-xs text-theme-on-surface-variant">تاریخ صدور</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $issueLabel }}</native:text>
                </native:column>
            </native:pressable>
            <native:pressable class="flex-1 rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openDuePicker">
                <native:column class="gap-1">
                    <native:text class="text-xs text-theme-on-surface-variant">تاریخ سررسید</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $dueLabel }}</native:text>
                </native:column>
            </native:pressable>
        </native:row>

        <native:outlined-text-input label="طرف حساب / گیرنده" placeholder="نام شخص یا شرکت" native:model.debounce.300ms="counterparty" />

        <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openAccountPicker">
            <native:row class="w-full items-center gap-3">
                @if ($selectedAccount)
                    <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $selectedAccount->color }}]">
                        <native:text class="text-sm font-bold text-white">{{ mb_substr($selectedAccount->name, 0, 1) }}</native:text>
                    </native:column>
                @endif
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-surface-variant">حساب وصول / پرداخت</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $selectedAccount?->name ?? 'انتخاب حساب' }}</native:text>
                </native:column>
                <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
            </native:row>
        </native:pressable>

        <native:outlined-text-input label="بابت" placeholder="مثلاً اجاره دفتر" native:model.debounce.300ms="note" multiline />

        <native:button label="ثبت چک" variant="primary" size="lg" @tap="save" />
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showIssuePicker }}" detents="large" @dismiss="closeIssuePicker">
    <native:jalali-calendar :selected="$issueDate" @select="setIssueDate" />
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showDuePicker }}" detents="large" @dismiss="closeDuePicker">
    <native:jalali-calendar :selected="$dueDate" @select="setDueDate" />
</native:bottom-sheet>

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
