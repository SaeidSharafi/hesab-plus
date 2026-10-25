<native:top-bar title="پیش‌بینی نقدینگی" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:row class="w-full gap-2">
            <native:button label="۳۰ روز" size="sm" class="flex-1" variant="{{ $horizon === 30 ? 'primary' : 'ghost' }}" @tap="setHorizon(30)" />
            <native:button label="۹۰ روز" size="sm" class="flex-1" variant="{{ $horizon === 90 ? 'primary' : 'ghost' }}" @tap="setHorizon(90)" />
            <native:button label="۱۸۰ روز" size="sm" class="flex-1" variant="{{ $horizon === 180 ? 'primary' : 'ghost' }}" @tap="setHorizon(180)" />
        </native:row>

        <native:button
            label="{{ $showReal ? 'نمایش به تومان اسمی' : 'نمایش با احتساب تورم' }}"
            variant="ghost"
            size="sm"
            @tap="toggleReal"
        />

        <native:column class="w-full gap-3 rounded-3xl bg-theme-primary p-5">
            <native:text class="text-sm text-theme-on-primary/80">نقدینگی در پایان {{ $horizonLabel }}</native:text>
            <native:text class="text-2xl font-extrabold text-theme-on-primary">{{ $end }}</native:text>
            <native:row class="w-full gap-4 border-t border-theme-on-primary/20 pt-3">
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-primary/70">امروز</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-primary">{{ $start }}</native:text>
                </native:column>
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-primary/70">کمترین نقطه</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-primary">{{ $lowest }}</native:text>
                    <native:text class="text-xs text-theme-on-primary/70">{{ $lowestDate }}</native:text>
                </native:column>
            </native:row>
        </native:column>

        @if ($shortfalls !== [])
            <native:column class="w-full gap-2 rounded-2xl border border-theme-destructive/30 bg-theme-destructive/5 p-4">
                <native:text class="text-sm font-bold text-theme-destructive">هشدار کمبود نقدینگی</native:text>
                @foreach ($shortfalls as $shortfall)
                    <native:column class="w-full gap-1 rounded-xl bg-theme-surface p-3">
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs font-semibold text-theme-on-surface">{{ $shortfall['date'] }} · {{ $shortfall['account'] }}</native:text>
                            <native:text class="text-sm font-bold text-theme-destructive">{{ $shortfall['amount'] }}</native:text>
                        </native:row>
                        <native:text class="text-xs text-theme-on-surface-variant">{{ $shortfall['reason'] }}</native:text>
                        @if ($shortfall['suggestion'])
                            <native:text class="text-xs font-semibold text-theme-success">{{ $shortfall['suggestion'] }}</native:text>
                        @endif
                    </native:column>
                @endforeach
            </native:column>
        @else
            <native:column class="w-full gap-1 rounded-2xl border border-theme-success/30 bg-theme-success/5 p-4">
                <native:text class="text-sm font-bold text-theme-success">نقدینگی در این بازه پایدار است</native:text>
                <native:text class="text-xs text-theme-on-surface-variant">با فرض ادامه روند فعلی، کمبودی پیش‌بینی نمی‌شود.</native:text>
            </native:column>
        @endif

        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">مسیر نقدینگی</native:text>
            @foreach ($points as $point)
                <native:row class="w-full items-center justify-between rounded-xl bg-theme-surface-variant p-2">
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-xs font-semibold text-theme-on-surface">{{ $point['date'] }}</native:text>
                        <native:text class="text-xs text-theme-on-surface-variant">{{ $point['label'] }}{{ $point['events'] > 0 ? ' · '.$num($point['events']).' رویداد' : '' }}</native:text>
                    </native:column>
                    <native:text class="text-sm font-bold {{ $point['negative'] ? 'text-theme-destructive' : 'text-theme-on-surface' }}">{{ $point['value'] }}</native:text>
                </native:row>
            @endforeach
        </native:column>

        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">فرض‌های پیش‌بینی</native:text>
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">هزینه ماهانه پایه (میانه)</native:text>
                <native:text class="text-sm font-semibold text-theme-on-surface">{{ $baseline }}</native:text>
            </native:row>
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">بازه عدم‌قطعیت</native:text>
                <native:text class="text-xs text-theme-on-surface">{{ $baselineLow }} تا {{ $baselineHigh }}</native:text>
            </native:row>
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">درآمد ماهانه پایه</native:text>
                <native:text class="text-sm font-semibold text-theme-on-surface">{{ $salary }}</native:text>
            </native:row>
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">روز واریز درآمد</native:text>
                <native:text class="text-sm font-semibold text-theme-on-surface">روز {{ $payday }}</native:text>
            </native:row>
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">پس‌انداز تخمینی این ماه</native:text>
                <native:text class="text-sm font-bold {{ $endOfMonthNegative ? 'text-theme-destructive' : 'text-theme-success' }}">{{ $endOfMonth }}</native:text>
            </native:row>
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">پایان اقساط</native:text>
                <native:text class="text-sm font-semibold text-theme-on-surface">{{ $debtFree }}</native:text>
            </native:row>
            <native:text class="text-xs text-theme-on-surface-variant">تورم سالانه فرض‌شده: {{ $num($inflation) }}٪</native:text>
        </native:column>

        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">سناریوهای فرضی</native:text>
            @foreach ($scenarios as $scenario)
                <native:pressable class="w-full rounded-xl border p-3 {{ $scenario['active'] ? 'border-theme-primary bg-theme-primary/5' : 'border-theme-outline' }}" @tap="toggleScenario({{ $scenario['id'] }})">
                    <native:row class="w-full items-center gap-3">
                        <native:icon :name="$scenario['active'] ? 'check_circle' : 'radio_button_unchecked'" :size="20" class="text-theme-primary" />
                        <native:column class="flex-1 gap-1">
                            <native:text class="text-sm font-semibold text-theme-on-surface">{{ $scenario['name'] }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $scenario['description'] }}</native:text>
                        </native:column>
                    </native:row>
                </native:pressable>
            @endforeach
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">اهداف مالی</native:text>
                <native:button label="+ هدف" size="sm" variant="tonal" @tap="openGoalForm" />
            </native:row>
            @if ($goals === [])
                <native:text class="text-xs text-theme-on-surface-variant">هدف مالی ثبت نشده است.</native:text>
            @else
                @foreach ($goals as $goal)
                    <native:column class="w-full gap-1 rounded-xl bg-theme-surface-variant p-3">
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-sm font-semibold text-theme-on-surface">{{ $goal['name'] }}</native:text>
                            <native:text class="text-xs font-bold {{ $goal['on_track'] ? 'text-theme-success' : 'text-theme-accent' }}">{{ $percent($goal['percent']) }}</native:text>
                        </native:row>
                        <native:progress-bar :value="$goal['percent'] / 100" />
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $goal['saved'] }} از {{ $goal['target'] }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $goal['required'] }} در ماه</native:text>
                        </native:row>
                    </native:column>
                @endforeach
            @endif
        </native:column>
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showGoalForm }}" detents="large" @dismiss="closeGoalForm">
    @if ($showGoalDate)
        <native:jalali-calendar :selected="$goalDate" @select="setGoalDate" />
    @else
        <native:column class="w-full gap-3 bg-theme-surface p-5">
            <native:text class="text-base font-bold text-theme-on-surface">هدف مالی جدید</native:text>
            <native:outlined-text-input label="نام هدف" placeholder="مثلاً صندوق اضطراری" native:model.debounce.300ms="goalName" />
            <native:outlined-text-input label="مبلغ هدف ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="goalTargetInput" />
            <native:outlined-text-input label="مبلغ ذخیره‌شده ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="goalSavedInput" />
            <native:pressable class="w-full rounded-2xl border border-theme-outline bg-theme-surface p-3" @tap="openGoalDate">
                <native:row class="w-full items-center justify-between">
                    <native:column class="gap-1">
                        <native:text class="text-xs text-theme-on-surface-variant">تاریخ هدف</native:text>
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $goalDateLabel }}</native:text>
                    </native:column>
                    <native:icon name="calendar_month" :size="18" class="text-theme-primary" />
                </native:row>
            </native:pressable>
            <native:row class="w-full gap-2">
                <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeGoalForm" />
                <native:button label="افزودن هدف" variant="primary" class="flex-1" @tap="saveGoal" />
            </native:row>
        </native:column>
    @endif
</native:bottom-sheet>
