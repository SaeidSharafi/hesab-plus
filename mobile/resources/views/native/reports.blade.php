<native:top-bar title="گزارش‌ها" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        <native:row class="w-full gap-2 rounded-xl bg-theme-surface-variant p-1">
            <native:button label="این ماه" size="sm" class="flex-1" variant="{{ $period === 'this_month' ? 'primary' : 'ghost' }}" @tap="setPeriod('this_month')" />
            <native:button label="ماه قبل" size="sm" class="flex-1" variant="{{ $period === 'last_month' ? 'primary' : 'ghost' }}" @tap="setPeriod('last_month')" />
            <native:button label="۳ ماه" size="sm" class="flex-1" variant="{{ $period === 'last_3' ? 'primary' : 'ghost' }}" @tap="setPeriod('last_3')" />
            <native:button label="همه" size="sm" class="flex-1" variant="{{ $period === 'all' ? 'primary' : 'ghost' }}" @tap="setPeriod('all')" />
        </native:row>

        <native:row class="w-full gap-2">
            <native:button label="هزینه‌ها" size="sm" class="flex-1" variant="{{ $kind === 'expense' ? 'primary' : 'ghost' }}" @tap="setKind('expense')" />
            <native:button label="درآمدها" size="sm" class="flex-1" variant="{{ $kind === 'income' ? 'primary' : 'ghost' }}" @tap="setKind('income')" />
        </native:row>

        <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">{{ $periodLabel }}</native:text>
                <native:text class="text-xs text-theme-on-surface-variant">{{ $num($count) }} تراکنش</native:text>
            </native:row>
            <native:text class="text-2xl font-extrabold text-theme-on-surface">{{ $total }}</native:text>
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">تراز دوره</native:text>
                <native:text class="text-sm font-bold {{ $netNegative ? 'text-theme-destructive' : 'text-theme-success' }}">{{ $net }}</native:text>
            </native:row>
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">تفکیک دسته‌بندی‌ها</native:text>
            @if ($rows === [])
                <native:text class="text-xs text-theme-on-surface-variant">در این دوره تراکنشی در این بخش وجود ندارد.</native:text>
            @else
                @foreach ($rows as $row)
                    <native:column class="w-full gap-1 {{ $row['indent'] }}">
                        <native:row class="w-full items-center justify-between gap-2">
                            <native:row class="flex-1 items-center gap-2">
                                <native:column class="h-2 w-2 rounded-full bg-[{{ $row['color'] }}]" />
                                <native:text class="text-sm {{ $row['is_parent'] ? 'font-bold' : 'font-medium' }} text-theme-on-surface">{{ $row['name'] }}</native:text>
                            </native:row>
                            <native:text class="text-xs font-semibold text-theme-on-surface">{{ $row['total'] }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $percent($row['percent']) }}</native:text>
                        </native:row>
                        <native:progress-bar :value="$row['percent'] / 100" />
                    </native:column>
                @endforeach
            @endif
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">روند ۶ ماه اخیر</native:text>
            @foreach ($monthly as $month)
                <native:column class="w-full gap-1">
                    <native:row class="w-full items-center justify-between">
                        <native:text class="text-xs text-theme-on-surface">{{ $month['label'] }}</native:text>
                        <native:text class="text-xs font-semibold text-theme-on-surface">{{ $month['value'] }}</native:text>
                    </native:row>
                    <native:progress-bar :value="$month['ratio']" />
                </native:column>
            @endforeach
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">بودجه ماه جاری</native:text>
                <native:text class="text-xs text-theme-on-surface-variant">نرخ پس‌انداز: {{ $percent($savingsRate) }}</native:text>
            </native:row>
            @if ($budgets === [])
                <native:text class="text-xs text-theme-on-surface-variant">هنوز بودجه‌ای تعیین نشده است.</native:text>
            @else
                @foreach ($budgets as $budget)
                    <native:column class="w-full gap-1">
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs font-semibold text-theme-on-surface">{{ $budget['name'] }}</native:text>
                            <native:text class="text-xs {{ $budget['status_class'] }}">{{ $budget['status_label'] }}</native:text>
                        </native:row>
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $budget['spent'] }} از {{ $budget['limit'] }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $percent($budget['percent']) }}</native:text>
                        </native:row>
                        <native:progress-bar :value="$budget['percent'] / 100" />
                    </native:column>
                @endforeach
            @endif
        </native:column>
    </native:column>
</native:scroll-view>
