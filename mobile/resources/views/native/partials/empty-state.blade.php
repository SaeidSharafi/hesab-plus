<native:column class="w-full items-center justify-center gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-6">
    <native:icon name="{{ $icon ?? 'inbox' }}" :size="30" class="text-theme-on-surface-variant" />
    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $title }}</native:text>
    @if (! empty($body))
        <native:text class="text-center text-xs text-theme-on-surface-variant">{{ $body }}</native:text>
    @endif
    @if (! empty($actionLabel))
        <native:button label="{{ $actionLabel }}" variant="tonal" size="sm" @tap="{{ $action }}" class="mt-1" />
    @endif
</native:column>
