<native:top-bar title="تراکنش‌ها">
    <native:top-bar-action id="filters" label="فیلترها" @tap="openFilters" :ios-icon="'line.3.horizontal.decrease.circle'" :android-icon="'filter_list'" />
</native:top-bar>

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-3 p-4 pb-28">
        @include('native.partials.notice')

        <native:outlined-text-input
            class="w-full"
            placeholder="جستجو در توضیحات، برچسب‌ها و اشخاص"
            leading-icon="search"
            native:model.debounce.300ms="search"
            keyboard="text"
        />

        <native:row class="w-full gap-2">
            <native:button label="همه" size="sm" class="flex-1" variant="{{ $kind === 'all' ? 'primary' : 'ghost' }}" @tap="filterKind('all')" />
            <native:button label="هزینه" size="sm" class="flex-1" variant="{{ $kind === 'expense' ? 'primary' : 'ghost' }}" @tap="filterKind('expense')" />
            <native:button label="درآمد" size="sm" class="flex-1" variant="{{ $kind === 'income' ? 'primary' : 'ghost' }}" @tap="filterKind('income')" />
            <native:button label="انتقال" size="sm" class="flex-1" variant="{{ $kind === 'transfer' ? 'primary' : 'ghost' }}" @tap="filterKind('transfer')" />
        </native:row>

        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-3">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">{{ $num($filteredCount) }} تراکنش</native:text>
                <native:row class="items-center gap-3">
                    <native:text class="text-xs font-semibold text-theme-success">+{{ $money($income) }}</native:text>
                    <native:text class="text-xs font-semibold text-theme-destructive">−{{ $money($expense) }}</native:text>
                </native:row>
            </native:row>
            @if ($hasFilters)
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-xs text-theme-on-surface-variant">فیلتر فعال است</native:text>
                    <native:pressable class="rounded-lg px-1 py-1" @tap="clearFilters">
                        <native:text class="text-xs font-semibold text-theme-primary">پاک کردن فیلترها</native:text>
                    </native:pressable>
                </native:row>
            @endif
        </native:column>

        @if ($groups === [])
            @include('native.partials.empty-state', [
                'icon' => 'receipt_long',
                'title' => 'تراکنشی پیدا نشد',
                'body' => 'عبارت جستجو یا فیلترها را تغییر دهید، یا اولین تراکنش را ثبت کنید.',
                'actionLabel' => 'ثبت تراکنش',
                'action' => 'create',
            ])
        @else
            @foreach ($groups as $group)
                <native:text class="px-1 pt-1 text-xs font-bold text-theme-on-surface-variant">{{ $group['label'] }}</native:text>
                <native:column class="w-full gap-1 rounded-2xl border border-theme-outline bg-theme-surface p-2">
                    @foreach ($group['items'] as $row)
                        <native:pressable class="w-full" @tap="openEditor({{ $row['id'] }})">
                            <native:row class="w-full items-center gap-3 rounded-xl p-2">
                                <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $row['color'] }}]">
                                    <native:text class="text-sm font-bold text-white">{{ $row['initial'] }}</native:text>
                                </native:column>
                                <native:column class="flex-1 gap-1">
                                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $row['title'] }}</native:text>
                                    <native:text class="text-xs text-theme-on-surface-variant">{{ $row['subtitle'] }}</native:text>
                                </native:column>
                                <native:text class="text-sm font-bold {{ $row['amount_class'] }}">{{ $row['amount'] }}</native:text>
                            </native:row>
                        </native:pressable>
                    @endforeach
                </native:column>
            @endforeach
        @endif
    </native:column>
</native:scroll-view>

<native:fab icon="add" @tap="create" />

@include('native.partials.bottom-nav', ['dueCount' => $dueCount])

<native:bottom-sheet visible="{{ $showFilters }}" detents="medium,large" @dismiss="closeFilters">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:row class="w-full items-center justify-between">
            <native:text class="text-base font-bold text-theme-on-surface">فیلترها</native:text>
            <native:button label="بستن" variant="ghost" size="sm" @tap="closeFilters" />
        </native:row>

        <native:column class="w-full gap-2">
            <native:text class="text-xs font-bold text-theme-on-surface-variant">دوره</native:text>
            <native:row class="w-full gap-2">
                <native:button label="همه" size="sm" class="flex-1" variant="{{ $period === 'all' ? 'primary' : 'ghost' }}" @tap="filterPeriod('all')" />
                <native:button label="این ماه" size="sm" class="flex-1" variant="{{ $period === 'this_month' ? 'primary' : 'ghost' }}" @tap="filterPeriod('this_month')" />
            </native:row>
        </native:column>

        <native:column class="w-full gap-2">
            <native:text class="text-xs font-bold text-theme-on-surface-variant">حساب</native:text>
            <native:pressable class="w-full rounded-xl p-2" @tap="filterAccount(null)">
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-sm {{ $accountFilter === null ? 'font-bold text-theme-primary' : 'text-theme-on-surface' }}">همه حساب‌ها</native:text>
                    @if ($accountFilter === null)
                        <native:icon name="check" :size="18" class="text-theme-primary" />
                    @endif
                </native:row>
            </native:pressable>
            @foreach ($accounts as $account)
                <native:pressable class="w-full rounded-xl p-2" @tap="filterAccount({{ $account['id'] }})">
                    <native:row class="w-full items-center gap-3">
                        <native:column class="h-8 w-8 items-center justify-center rounded-full bg-[{{ $account['color'] }}]">
                            <native:text class="text-xs font-bold text-white">{{ $account['initial'] }}</native:text>
                        </native:column>
                        <native:text class="flex-1 text-sm {{ $accountFilter === $account['id'] ? 'font-bold text-theme-primary' : 'text-theme-on-surface' }}">{{ $account['name'] }}</native:text>
                        @if ($accountFilter === $account['id'])
                            <native:icon name="check" :size="18" class="text-theme-primary" />
                        @endif
                    </native:row>
                </native:pressable>
            @endforeach
        </native:column>

        @if ($tags !== [])
            <native:column class="w-full gap-2">
                <native:text class="text-xs font-bold text-theme-on-surface-variant">برچسب</native:text>
                <native:row class="w-full flex-wrap gap-2">
                    @foreach ($tags as $tag)
                        <native:button label="#{{ $tag }}" size="sm" variant="{{ $tagFilter === $tag ? 'primary' : 'ghost' }}" @tap="filterTag('{{ $tag }}')" />
                    @endforeach
                </native:row>
            </native:column>
        @endif

        <native:row class="w-full gap-2 pt-2">
            <native:button label="پاک کردن" variant="ghost" class="flex-1" @tap="clearFilters" />
            <native:button label="اعمال" variant="primary" class="flex-1" @tap="closeFilters" />
        </native:row>
    </native:column>
</native:bottom-sheet>
