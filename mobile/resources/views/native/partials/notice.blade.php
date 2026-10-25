@if ($notice !== '')
    <native:column class="w-full rounded-xl border p-3 {{ $noticeKind === 'success' ? 'bg-theme-success/10 border-theme-success/30' : 'bg-theme-destructive/10 border-theme-destructive/30' }}">
        <native:text class="text-sm {{ $noticeKind === 'success' ? 'text-theme-success' : 'text-theme-destructive' }}">{{ $notice }}</native:text>
    </native:column>
@endif
