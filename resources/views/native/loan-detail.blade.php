<native:top-bar title="{{ $loan?->lender ?? 'وام' }}" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        @if ($loan === null || $summary === null)
            @include('native.partials.empty-state', [
                'icon' => 'account_balance',
                'title' => 'وام پیدا نشد',
                'body' => 'به فهرست تعهدات برگردید.',
            ])
        @else
            <native:column class="w-full gap-3 rounded-3xl bg-theme-primary p-5">
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-sm text-theme-on-primary/80">مانده اصل وام</native:text>
                    @if ($overdueCount > 0)
                        <native:text class="text-xs font-bold text-theme-on-primary">{{ $num($overdueCount) }} قسط معوق</native:text>
                    @endif
                </native:row>
                <native:text class="text-3xl font-extrabold text-theme-on-primary">{{ $remainingPrincipal }}</native:text>
                <native:progress-bar :value="$progress" />
                <native:row class="w-full items-center justify-between text-xs text-theme-on-primary/80">
                    <native:text class="text-xs text-theme-on-primary/80">{{ $num($paidCount) }} از {{ $num($totalCount) }} قسط</native:text>
                    <native:text class="text-xs text-theme-on-primary/80">{{ $percent($summary['progress']) }}</native:text>
                </native:row>
            </native:column>

            <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-xs text-theme-on-surface-variant">قسط بعدی</native:text>
                    <native:text class="text-sm font-bold text-theme-on-surface">{{ $nextDue ?? 'پایان یافته' }}</native:text>
                </native:row>
                @if ($nextLabel)
                    <native:text class="text-xs text-theme-accent">{{ $nextLabel }}</native:text>
                @endif
                <native:divider />
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-xs text-theme-on-surface-variant">مجموع اقساط باقی‌مانده</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $remainingAmount }}</native:text>
                </native:row>
                <native:row class="w-full items-center justify-between">
                    <native:text class="text-xs text-theme-on-surface-variant">سود پرداخت‌شده</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-surface">{{ $paidInterest }}</native:text>
                </native:row>
                @if ($hasPenalty)
                    <native:row class="w-full items-center justify-between">
                        <native:text class="text-xs text-theme-on-surface-variant">جریمه دیرکرد</native:text>
                        <native:text class="text-sm font-semibold text-theme-destructive">{{ $penalty }}</native:text>
                    </native:row>
                @endif
                @if ($effectiveRate !== null)
                    <native:row class="w-full items-center justify-between">
                        <native:text class="text-xs text-theme-on-surface-variant">نرخ موثر سالانه</native:text>
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $percent($effectiveRate) }}</native:text>
                    </native:row>
                @endif
                @if ($payoff)
                    <native:row class="w-full items-center justify-between">
                        <native:text class="text-xs text-theme-on-surface-variant">پایان اقساط</native:text>
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $payoff }}</native:text>
                    </native:row>
                @endif
            </native:column>

            @if ($isReducing)
                <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                    <native:text class="text-sm font-bold text-theme-on-surface">ماشین‌حساب تسویه زودهنگام</native:text>
                    <native:outlined-text-input
                        label="پرداخت اضافه ({{ $earlyInputLabel }})"
                        placeholder="مثلاً ۵۰,۰۰۰,۰۰۰"
                        keyboard="number"
                        native:model.debounce.300ms="earlyInput"
                    />
                    @if ($early)
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface-variant">سود صرفه‌جویی</native:text>
                            <native:text class="text-sm font-bold text-theme-success">{{ $early['saved'] }}</native:text>
                        </native:row>
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface-variant">اقساط باقی‌مانده</native:text>
                            <native:text class="text-sm font-semibold text-theme-on-surface">{{ $num($early['new_count']) }} قسط</native:text>
                        </native:row>
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface-variant">تسویه نهایی</native:text>
                            <native:text class="text-sm font-semibold text-theme-on-surface">{{ $early['payoff'] }}</native:text>
                        </native:row>
                    @else
                        <native:text class="text-xs text-theme-on-surface-variant">مبلغ اضافه را وارد کنید تا سود صرفه‌جویی‌شده محاسبه شود.</native:text>
                    @endif
                </native:column>
            @endif

            <native:column class="w-full gap-2">
                <native:text class="text-sm font-bold text-theme-on-surface">اقساط</native:text>
                @foreach ($rows as $row)
                    <native:column class="w-full gap-2 rounded-2xl border border-theme-outline bg-theme-surface p-3">
                        <native:row class="w-full items-start justify-between gap-2">
                            <native:row class="items-center gap-2">
                                <native:column class="h-8 w-8 items-center justify-center rounded-lg bg-theme-surface-variant">
                                    <native:text class="text-xs font-bold text-theme-on-surface">{{ $num($row['number']) }}</native:text>
                                </native:column>
                                <native:column class="gap-1">
                                    <native:text class="text-xs font-semibold text-theme-on-surface">{{ $row['due'] }}</native:text>
                                    <native:text class="text-xs {{ $row['status_class'] }}">{{ $row['status_label'] }}</native:text>
                                </native:column>
                            </native:row>
                            <native:column class="items-end gap-1">
                                <native:text class="text-sm font-bold text-theme-on-surface">{{ $row['amount'] }}</native:text>
                                @if ($row['penalty'])
                                    <native:text class="text-xs text-theme-destructive">جریمه: {{ $row['penalty'] }}</native:text>
                                @endif
                            </native:column>
                        </native:row>
                        <native:row class="w-full items-center gap-3">
                            <native:text class="text-xs text-theme-on-surface-variant">اصل: {{ $row['principal'] }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">سود: {{ $row['interest'] }}</native:text>
                        </native:row>
                        @if ($row['paid'])
                            <native:button label="برگشت پرداخت" size="sm" variant="ghost" @tap="undo({{ $row['id'] }})" />
                        @else
                            <native:row class="w-full gap-2">
                                <native:button label="پرداخت قسط" size="sm" variant="primary" class="flex-1" @tap="pay({{ $row['id'] }})" />
                                <native:button label="تعویق ۷ روز" size="sm" variant="ghost" @tap="defer({{ $row['id'] }})" />
                            </native:row>
                        @endif
                    </native:column>
                @endforeach
            </native:column>

            <native:button label="حذف وام و اقساط" variant="destructive" size="sm" @tap="requestDelete" />
        @endif
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showDelete }}" detents="medium" @dismiss="closeDelete">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">حذف وام؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">تمام اقساط و تراکنش‌های پرداخت مرتبط حذف می‌شوند. موجودی حساب‌ها خودکار اصلاح می‌شود.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeDelete" />
            <native:button label="حذف وام" variant="destructive" class="flex-1" @tap="deleteLoan" />
        </native:row>
    </native:column>
</native:bottom-sheet>
