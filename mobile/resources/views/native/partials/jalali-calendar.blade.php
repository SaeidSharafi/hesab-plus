<native:column class="w-full gap-3 bg-theme-surface p-4">
    <native:row class="w-full items-center justify-between">
        <native:button variant="ghost" size="sm" icon="chevron_right" a11y-label="ماه قبل" @tap="previousMonth" />
        <native:text class="text-base font-bold text-theme-on-surface">{{ $monthLabel }}</native:text>
        <native:button variant="ghost" size="sm" icon="chevron_left" a11y-label="ماه بعد" @tap="nextMonth" />
    </native:row>

    <native:row class="w-full">
        @foreach ($weekdayShort as $label)
            <native:column class="flex-1 items-center justify-center">
                <native:text class="text-xs text-theme-on-surface-variant">{{ $label }}</native:text>
            </native:column>
        @endforeach
    </native:row>

    @foreach ($weeks as $week)
        <native:row class="w-full">
            @foreach ($week as $cell)
                @php
                    $isSelected = $selectedDate !== null && $selectedDate->isSameDay($cell['date']);
                    $isToday = $cell['date']->isSameDay($today);
                    $class = $isSelected
                        ? 'bg-theme-primary'
                        : ($isToday ? 'border border-theme-primary bg-theme-primary/10' : 'bg-theme-surface');
                    $textClass = $isSelected
                        ? 'text-theme-on-primary'
                        : ($cell['in_month'] ? 'text-theme-on-surface' : 'text-theme-on-surface-variant/40');
                @endphp
                <native:pressable class="flex-1 items-center justify-center py-1" @tap="pick('{{ $cell['date']->toString() }}')">
                    <native:column class="h-12 w-full items-center justify-center rounded-lg {{ $class }}">
                        <native:text class="text-sm font-semibold {{ $textClass }}">{{ $num($cell['date']->day) }}</native:text>
                    </native:column>
                </native:pressable>
            @endforeach
        </native:row>
    @endforeach

    <native:button label="امروز" variant="tonal" size="sm" @tap="pickToday" />
</native:column>
