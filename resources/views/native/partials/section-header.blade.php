@if ($title !== '')
    <native:column class="w-full gap-1 px-1">
        <native:row class="w-full items-center justify-between">
            <native:text class="text-base font-bold text-theme-on-background">{{ $title }}</native:text>
            @if (! empty($actionLabel))
                <native:pressable class="rounded-lg px-2 py-1" @tap="{{ $action }}">
                    <native:text class="text-sm font-semibold text-theme-primary">{{ $actionLabel }}</native:text>
                </native:pressable>
            @endif
        </native:row>
        @if (! empty($subtitle))
            <native:text class="text-xs text-theme-on-surface-variant">{{ $subtitle }}</native:text>
        @endif
    </native:column>
@endif
