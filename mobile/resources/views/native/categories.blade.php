<native:top-bar title="دسته‌بندی و بودجه" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:row class="w-full gap-2 rounded-xl bg-theme-surface-variant p-1">
            <native:button label="هزینه‌ها" size="sm" class="flex-1" variant="{{ $kind === 'expense' ? 'primary' : 'ghost' }}" @tap="setKind('expense')" />
            <native:button label="درآمدها" size="sm" class="flex-1" variant="{{ $kind === 'income' ? 'primary' : 'ghost' }}" @tap="setKind('income')" />
        </native:row>

        <native:row class="w-full items-center justify-between">
            <native:text class="text-sm font-bold text-theme-on-surface">دسته‌بندی‌های ماه جاری</native:text>
            <native:button label="+ دسته" size="sm" variant="tonal" @tap="openForm" />
        </native:row>

        @foreach ($rows as $row)
            <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-3 {{ $row['indent'] }}">
                <native:row class="w-full items-center justify-between gap-2">
                    <native:row class="flex-1 items-center gap-2">
                        <native:column class="h-2.5 w-2.5 rounded-full bg-[{{ $row['color'] }}]" />
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $row['name'] }}</native:text>
                    </native:row>
                    <native:text class="text-xs font-bold text-theme-on-surface">{{ $row['spent'] }}</native:text>
                </native:row>
                @if ($row['has_budget'])
                    <native:progress-bar :value="$row['percent'] / 100" />
                    <native:row class="w-full items-center justify-between">
                        <native:text class="text-xs text-theme-on-surface-variant">بودجه: {{ $row['budget'] }}</native:text>
                        <native:pressable class="rounded-lg px-1 py-1" @tap="openBudget({{ $row['id'] }})">
                            <native:text class="text-xs font-semibold text-theme-primary">ویرایش بودجه</native:text>
                        </native:pressable>
                    </native:row>
                @else
                    <native:pressable class="rounded-lg py-1" @tap="openBudget({{ $row['id'] }})">
                        <native:text class="text-xs font-semibold text-theme-primary">تعیین بودجه ماهانه</native:text>
                    </native:pressable>
                @endif
            </native:column>
        @endforeach

        @if ($rows === [])
            @include('native.partials.empty-state', [
                'icon' => 'category',
                'title' => 'دسته‌بندی‌ای وجود ندارد',
                'body' => 'اولین دسته‌بندی را اضافه کنید.',
                'actionLabel' => 'افزودن دسته',
                'action' => 'openForm',
            ])
        @endif
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showForm }}" detents="large" @dismiss="closeForm">
    <native:column class="w-full gap-3 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">دسته‌بندی جدید</native:text>
        <native:outlined-text-input label="نام دسته" placeholder="مثلاً بیمه منزل" native:model.debounce.300ms="name" />
        <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openParentPicker">
            <native:row class="w-full items-center justify-between">
                <native:column class="gap-1">
                    <native:text class="text-xs text-theme-on-surface-variant">دسته والد (اختیاری)</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $selectedParentName ?? 'بدون والد' }}</native:text>
                </native:column>
                <native:icon name="chevron_left" :size="18" class="text-theme-on-surface-variant" />
            </native:row>
        </native:pressable>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeForm" />
            <native:button label="افزودن" variant="primary" class="flex-1" @tap="saveCategory" />
        </native:row>
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showParentPicker }}" detents="large" @dismiss="closeParentPicker">
    <native:column class="w-full gap-2 bg-theme-surface p-4">
        <native:text class="text-base font-bold text-theme-on-surface">دسته والد</native:text>
        <native:pressable class="w-full rounded-xl p-2" @tap="selectParent(null)">
            <native:text class="text-sm font-semibold text-theme-on-surface">بدون والد</native:text>
        </native:pressable>
        @foreach ($parents as $parent)
            <native:pressable class="w-full rounded-xl p-2" @tap="selectParent({{ $parent['id'] }})">
                <native:text class="text-sm font-semibold text-theme-on-surface">{{ $parent['name'] }}</native:text>
            </native:pressable>
        @endforeach
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showBudget }}" detents="medium" @dismiss="closeBudget">
    <native:column class="w-full gap-3 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">بودجه {{ $budgetCategoryName }}</native:text>
        <native:outlined-text-input label="سقف ماهانه ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="budgetInput" autofocus />
        <native:row class="w-full gap-2">
            <native:button label="حذف بودجه" variant="ghost" size="sm" @tap="deleteBudget" />
            <native:button label="ذخیره" variant="primary" class="flex-1" @tap="saveBudget" />
        </native:row>
    </native:column>
</native:bottom-sheet>
