<native:top-bar title="ثبت بدهی یا طلب" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:row class="w-full gap-2 rounded-xl bg-theme-surface-variant p-1">
            <native:button label="من طلبکارم" size="sm" class="flex-1" variant="{{ $direction === 'lent' ? 'primary' : 'ghost' }}" @tap="setDirection('lent')" />
            <native:button label="من بدهکارم" size="sm" class="flex-1" variant="{{ $direction === 'borrowed' ? 'primary' : 'ghost' }}" @tap="setDirection('borrowed')" />
        </native:row>

        <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openPersonPicker">
            <native:row class="w-full items-center gap-3">
                @if ($selectedPerson)
                    <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $selectedPerson->avatar_color }}]">
                        <native:text class="text-sm font-bold text-white">{{ mb_substr($selectedPerson->name, 0, 1) }}</native:text>
                    </native:column>
                @endif
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-surface-variant">شخص</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $selectedPerson?->name ?? 'انتخاب شخص' }}</native:text>
                </native:column>
                <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
            </native:row>
        </native:pressable>

        <native:outlined-text-input label="یا افزودن شخص جدید" placeholder="نام و نام خانوادگی" native:model.debounce.300ms="newPersonName" />

        <native:column class="w-full gap-2">
            <native:text class="text-xs font-bold text-theme-on-surface-variant">واحد</native:text>
            <native:row class="w-full flex-wrap gap-2">
                <native:button label="تومان" size="sm" variant="{{ $unit === 'toman' ? 'primary' : 'ghost' }}" @tap="setUnit('toman')" />
                <native:button label="ریال" size="sm" variant="{{ $unit === 'rial' ? 'primary' : 'ghost' }}" @tap="setUnit('rial')" />
                <native:button label="دلار" size="sm" variant="{{ $unit === 'usd' ? 'primary' : 'ghost' }}" @tap="setUnit('usd')" />
                <native:button label="سکه" size="sm" variant="{{ $unit === 'gold_coin' ? 'primary' : 'ghost' }}" @tap="setUnit('gold_coin')" />
                <native:button label="گرم طلا" size="sm" variant="{{ $unit === 'gold_gram' ? 'primary' : 'ghost' }}" @tap="setUnit('gold_gram')" />
            </native:row>
        </native:column>

        <native:outlined-text-input
            label="مقدار ({{ $unitLabel }})"
            placeholder="مثلاً ۱۲,۰۰۰,۰۰۰ یا ۲"
            keyboard="decimal"
            native:model.debounce.300ms="quantityInput"
        />
        <native:row class="w-full items-center justify-between">
            <native:text class="text-xs text-theme-on-surface-variant">نرخ واحد: {{ $unitRateLabel }}{{ $unitPriceSource ? ' · '.$unitPriceSource : '' }}</native:text>
            @if ($preview)
                <native:text class="text-sm font-bold text-theme-primary">{{ $preview }}</native:text>
            @endif
        </native:row>

        <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openDatePicker">
            <native:row class="w-full items-center justify-between">
                <native:column class="gap-1">
                    <native:text class="text-xs text-theme-on-surface-variant">تاریخ وعده تسویه</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $dueLabel }}</native:text>
                </native:column>
                <native:icon name="calendar_month" :size="18" class="text-theme-primary" />
            </native:row>
        </native:pressable>

        <native:row class="w-full items-center justify-between rounded-2xl border border-theme-outline bg-theme-surface p-3">
            <native:column class="flex-1 gap-1">
                <native:text class="text-sm font-semibold text-theme-on-surface">از حساب کسر / واریز شود</native:text>
                <native:text class="text-xs text-theme-on-surface-variant">اگر پول واقعاً جابه‌جا شده، این گزینه را فعال کنید.</native:text>
            </native:column>
            <native:toggle native:model="affectsAccount" />
        </native:row>

        @if ($affectsAccount)
            <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openAccountPicker">
                <native:row class="w-full items-center gap-3">
                    @if ($selectedAccount)
                        <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $selectedAccount->color }}]">
                            <native:text class="text-sm font-bold text-white">{{ mb_substr($selectedAccount->name, 0, 1) }}</native:text>
                        </native:column>
                    @endif
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-xs text-theme-on-surface-variant">حساب</native:text>
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $selectedAccount?->name ?? 'انتخاب حساب' }}</native:text>
                    </native:column>
                    <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
                </native:row>
            </native:pressable>
        @endif

        <native:outlined-text-input label="بابت" placeholder="مثلاً هزینه هتل سفر" native:model.debounce.300ms="note" multiline />

        <native:button label="ثبت در دفتر اشخاص" variant="primary" size="lg" @tap="save" />
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showPersonPicker }}" detents="large" @dismiss="closePersonPicker">
    <native:column class="w-full gap-2 bg-theme-surface p-4">
        <native:text class="text-base font-bold text-theme-on-surface">انتخاب شخص</native:text>
        @foreach ($people as $person)
            <native:pressable class="w-full rounded-xl p-2" @tap="selectPerson({{ $person['id'] }})">
                <native:row class="w-full items-center gap-3">
                    <native:column class="h-9 w-9 items-center justify-center rounded-full bg-[{{ $person['color'] }}]">
                        <native:text class="text-xs font-bold text-white">{{ $person['initial'] }}</native:text>
                    </native:column>
                    <native:text class="flex-1 text-sm font-semibold text-theme-on-surface">{{ $person['name'] }}</native:text>
                </native:row>
            </native:pressable>
        @endforeach
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showDatePicker }}" detents="large" @dismiss="closeDatePicker">
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
