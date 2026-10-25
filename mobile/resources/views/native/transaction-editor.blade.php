<native:top-bar title="{{ $title }}" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:row class="w-full gap-2 rounded-xl bg-theme-surface-variant p-1">
            <native:button label="هزینه" size="sm" class="flex-1" variant="{{ $kind === 'expense' ? 'primary' : 'ghost' }}" @tap="setKind('expense')" />
            <native:button label="درآمد" size="sm" class="flex-1" variant="{{ $kind === 'income' ? 'primary' : 'ghost' }}" @tap="setKind('income')" />
            <native:button label="انتقال" size="sm" class="flex-1" variant="{{ $kind === 'transfer' ? 'primary' : 'ghost' }}" @tap="setKind('transfer')" />
        </native:row>

        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:outlined-text-input
                class="w-full"
                label="مبلغ ({{ $settings->currency === 'TOMAN' ? 'تومان' : 'ریال' }})"
                placeholder="۰"
                keyboard="number"
                native:model.debounce.300ms="amountInput"
                supporting="{{ $amountWords }}"
                autofocus
            />
            <native:row class="w-full flex-wrap gap-2">
                <native:button label="+۱۰۰ هزار" size="sm" variant="ghost" @tap="addAmount(100000)" />
                <native:button label="+۱ میلیون" size="sm" variant="ghost" @tap="addAmount(1000000)" />
                <native:button label="+۵ میلیون" size="sm" variant="ghost" @tap="addAmount(5000000)" />
                <native:button label="+۱۰ میلیون" size="sm" variant="ghost" @tap="addAmount(10000000)" />
            </native:row>
        </native:column>

        <native:column class="w-full gap-2">
            <native:text class="px-1 text-xs font-bold text-theme-on-surface-variant">{{ $kind === 'transfer' ? 'از حساب مبدأ' : 'حساب' }}</native:text>
            <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openAccountPicker">
                <native:row class="w-full items-center gap-3">
                    @if ($selectedAccount)
                        <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $selectedAccount->color }}]">
                            <native:text class="text-sm font-bold text-white">{{ mb_substr($selectedAccount->name, 0, 1) }}</native:text>
                        </native:column>
                    @endif
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $selectedAccount?->name ?? 'انتخاب حساب' }}</native:text>
                        @if ($selectedAccount)
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $money($selectedAccountBalance) }}</native:text>
                        @endif
                    </native:column>
                    <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
                </native:row>
            </native:pressable>
        </native:column>

        @if ($kind === 'transfer')
            <native:column class="w-full gap-2">
                <native:text class="px-1 text-xs font-bold text-theme-on-surface-variant">به حساب مقصد</native:text>
                <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openToAccountPicker">
                    <native:row class="w-full items-center gap-3">
                        @if ($selectedToAccount)
                            <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $selectedToAccount->color }}]">
                                <native:text class="text-sm font-bold text-white">{{ mb_substr($selectedToAccount->name, 0, 1) }}</native:text>
                            </native:column>
                        @endif
                        <native:text class="flex-1 text-sm font-semibold text-theme-on-surface">{{ $selectedToAccount?->name ?? 'انتخاب مقصد' }}</native:text>
                        <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
                    </native:row>
                </native:pressable>
                <native:outlined-text-input label="کارمزد انتقال" keyboard="number" native:model.debounce.300ms="feeInput" />
            </native:column>
        @else
            <native:column class="w-full gap-2">
                <native:text class="px-1 text-xs font-bold text-theme-on-surface-variant">دسته‌بندی</native:text>
                <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openCategoryPicker">
                    <native:row class="w-full items-center justify-between">
                        <native:text class="text-sm font-semibold {{ $selectedCategoryName ? 'text-theme-on-surface' : 'text-theme-on-surface-variant' }}">
                            {{ $selectedCategoryName ?? 'انتخاب دسته‌بندی' }}
                        </native:text>
                        <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
                    </native:row>
                </native:pressable>
            </native:column>
        @endif

        <native:row class="w-full gap-2">
            <native:pressable class="flex-1 rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openDatePicker">
                <native:row class="w-full items-center gap-2">
                    <native:icon name="calendar_month" :size="18" class="text-theme-primary" />
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-xs text-theme-on-surface-variant">تاریخ</native:text>
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $dateLabel }}</native:text>
                    </native:column>
                </native:row>
            </native:pressable>
            <native:pressable class="flex-1 rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openPersonPicker">
                <native:row class="w-full items-center gap-2">
                    <native:icon name="person" :size="18" class="text-theme-primary" />
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-xs text-theme-on-surface-variant">طرف حساب</native:text>
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $selectedPersonName ?? 'بدون شخص' }}</native:text>
                    </native:column>
                </native:row>
            </native:pressable>
        </native:row>

        <native:outlined-text-input label="توضیحات و بابت" placeholder="مثلاً خرید هفتگی سوپرمارکت" native:model.debounce.300ms="note" multiline />

        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-xs font-bold text-theme-on-surface-variant">برچسب‌ها</native:text>
            <native:row class="w-full gap-2">
                <native:outlined-text-input class="flex-1" placeholder="مثلاً سفر، خودرو" native:model.debounce.300ms="tagInput" />
                <native:button label="افزودن" variant="tonal" size="sm" @tap="addTag" />
            </native:row>
            @if ($tags !== [])
                <native:row class="w-full flex-wrap gap-2">
                    @foreach ($tags as $tag)
                        <native:button label="#{{ $tag }} ×" size="sm" variant="ghost" @tap="removeTag('{{ $tag }}')" />
                    @endforeach
                </native:row>
            @endif
        </native:column>

        <native:button
            label="{{ $transactionId !== null ? 'ذخیره تغییرات' : 'ثبت تراکنش' }}"
            variant="primary"
            size="lg"
            @tap="save"
        />

        @if ($transactionId !== null)
            <native:button label="حذف تراکنش" variant="destructive" size="sm" @tap="requestDelete" />
        @endif
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
                    @if ($selectedAccount && $selectedAccount->id === $account['id'])
                        <native:icon name="check" :size="18" class="text-theme-primary" />
                    @endif
                </native:row>
            </native:pressable>
        @endforeach
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showToAccountPicker }}" detents="large" @dismiss="closeToAccountPicker">
    <native:column class="w-full gap-2 bg-theme-surface p-4">
        <native:text class="text-base font-bold text-theme-on-surface">انتخاب حساب مقصد</native:text>
        @foreach ($accounts as $account)
            @if ($selectedAccount && $selectedAccount->id === $account['id'])
                @continue
            @endif
            <native:pressable class="w-full rounded-xl p-2" @tap="selectToAccount({{ $account['id'] }})">
                <native:row class="w-full items-center gap-3">
                    <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $account['color'] }}]">
                        <native:text class="text-sm font-bold text-white">{{ $account['initial'] }}</native:text>
                    </native:column>
                    <native:text class="flex-1 text-sm font-semibold text-theme-on-surface">{{ $account['name'] }}</native:text>
                    @if ($selectedToAccount && $selectedToAccount->id === $account['id'])
                        <native:icon name="check" :size="18" class="text-theme-primary" />
                    @endif
                </native:row>
            </native:pressable>
        @endforeach
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showCategoryPicker }}" detents="large" @dismiss="closeCategoryPicker">
    <native:scroll-view class="w-full">
        <native:column class="w-full gap-1 bg-theme-surface p-4">
            <native:text class="mb-2 text-base font-bold text-theme-on-surface">انتخاب دسته‌بندی</native:text>
            @foreach ($categories as $category)
                <native:pressable class="w-full rounded-xl p-2" @tap="selectCategory({{ $category['id'] }})">
                    <native:row class="w-full items-center gap-3">
                        <native:column class="h-8 w-8 items-center justify-center rounded-full bg-[{{ $category['color'] }}]">
                            <native:icon name="category" :size="14" class="text-white" />
                        </native:column>
                        <native:column class="flex-1 gap-1">
                            <native:text class="text-sm font-semibold text-theme-on-surface">{{ $category['name'] }}</native:text>
                            @if ($category['parent'])
                                <native:text class="text-xs text-theme-on-surface-variant">{{ $category['parent'] }}</native:text>
                            @endif
                        </native:column>
                        @if ($selectedCategoryName === $category['name'])
                            <native:icon name="check" :size="18" class="text-theme-primary" />
                        @endif
                    </native:row>
                </native:pressable>
            @endforeach
        </native:column>
    </native:scroll-view>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showPersonPicker }}" detents="medium,large" @dismiss="closePersonPicker">
    <native:column class="w-full gap-2 bg-theme-surface p-4">
        <native:text class="text-base font-bold text-theme-on-surface">طرف حساب</native:text>
        <native:pressable class="w-full rounded-xl p-2" @tap="selectPerson(null)">
            <native:text class="text-sm font-semibold text-theme-on-surface">بدون شخص</native:text>
        </native:pressable>
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
    <native:jalali-calendar :selected="$date" @select="setDate" />
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showDelete }}" detents="medium" @dismiss="closeDelete">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">حذف تراکنش؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">این تراکنش حذف می‌شود و موجودی حساب به‌صورت خودکار اصلاح خواهد شد.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeDelete" />
            <native:button label="تأیید حذف" variant="destructive" class="flex-1" @tap="delete" />
        </native:row>
    </native:column>
</native:bottom-sheet>
