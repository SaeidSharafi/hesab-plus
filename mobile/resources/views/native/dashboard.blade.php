<native:top-bar title="حساب+" subtitle="{{ $monthLabel }}">
    <native:top-bar-action id="settings" label="تنظیمات" @tap="openSettings" :ios-icon="'gearshape'" :android-icon="'settings'" />
</native:top-bar>

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-28">
        @include('native.partials.notice')

        <native:column class="w-full gap-3 rounded-3xl bg-theme-primary p-5">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm text-theme-on-primary/80">دارایی خالص</native:text>
                <native:icon name="shield" :size="18" class="text-theme-on-primary/70" />
            </native:row>
            <native:text class="text-3xl font-extrabold text-theme-on-primary">{{ $money($net['net_worth']) }}</native:text>
            <native:row class="w-full gap-4 border-t border-theme-on-primary/20 pt-3">
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-primary/70">دارایی‌ها</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-primary">{{ $money($net['assets']) }}</native:text>
                </native:column>
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-primary/70">بدهی‌ها</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-primary">{{ $money($net['liabilities']) }}</native:text>
                </native:column>
            </native:row>
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">{{ $monthLabel }}</native:text>
                <native:pressable class="rounded-lg px-1 py-1" @tap="openTransactions">
                    <native:text class="text-xs font-semibold text-theme-primary">گردش حساب</native:text>
                </native:pressable>
            </native:row>
            <native:row class="w-full gap-3">
                <native:column class="flex-1 gap-1 rounded-xl bg-theme-success/10 p-3">
                    <native:text class="text-xs text-theme-on-surface-variant">درآمد</native:text>
                    <native:text class="text-sm font-bold text-theme-success">{{ $money($month['income']) }}</native:text>
                </native:column>
                <native:column class="flex-1 gap-1 rounded-xl bg-theme-destructive/10 p-3">
                    <native:text class="text-xs text-theme-on-surface-variant">هزینه</native:text>
                    <native:text class="text-sm font-bold text-theme-destructive">{{ $money($month['expense']) }}</native:text>
                </native:column>
            </native:row>
            <native:progress-bar :value="$expenseRatio" />
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">تراز ماه</native:text>
                <native:text class="text-sm font-bold {{ $month['net'] >= 0 ? 'text-theme-success' : 'text-theme-destructive' }}">
                    {{ $money($month['net'], true) }}
                </native:text>
            </native:row>
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:row class="w-full items-center justify-between">
                <native:row class="items-center gap-2">
                    <native:icon name="event_note" :size="18" class="text-theme-accent" />
                    <native:text class="text-sm font-bold text-theme-on-surface">سررسیدهای پیش‌رو</native:text>
                </native:row>
                <native:pressable class="rounded-lg px-1 py-1" @tap="openObligations">
                    <native:text class="text-xs font-semibold text-theme-primary">همه</native:text>
                </native:pressable>
            </native:row>

            @if ($obligations === [])
                <native:text class="text-xs text-theme-on-surface-variant">سررسیدی در ۳۰ روز آینده ثبت نشده است.</native:text>
            @else
                @foreach ($obligations as $item)
                    <native:column class="w-full gap-2 rounded-xl bg-theme-surface-variant p-3">
                        <native:row class="w-full items-center justify-between gap-2">
                            <native:column class="flex-1 gap-1">
                                <native:text class="text-sm font-semibold text-theme-on-surface">{{ $item['title'] }}</native:text>
                                <native:text class="text-xs text-theme-on-surface-variant">{{ $dateLabel($item['due'], 'short') }} · {{ $dueLabel($item['due']) }}</native:text>
                            </native:column>
                            <native:text class="text-sm font-bold {{ $item['direction'] === 'in' ? 'text-theme-success' : 'text-theme-on-surface' }}">{{ $money($item['amount']) }}</native:text>
                        </native:row>
                        @if ($item['type'] === 'installment')
                            <native:button label="پرداخت قسط" variant="tonal" size="sm" @tap="pay({{ $item['installment_id'] }})" />
                        @endif
                    </native:column>
                @endforeach
            @endif
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">حساب‌ها</native:text>
                <native:pressable class="rounded-lg px-1 py-1" @tap="openAccounts">
                    <native:text class="text-xs font-semibold text-theme-primary">مدیریت</native:text>
                </native:pressable>
            </native:row>
            @foreach ($accounts as $account)
                <native:row class="w-full items-center gap-3">
                    <native:column class="h-9 w-9 items-center justify-center rounded-full bg-[{{ $account['color'] }}]">
                        <native:text class="text-xs font-bold text-white">{{ $account['initial'] }}</native:text>
                    </native:column>
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-sm font-semibold text-theme-on-surface">{{ $account['name'] }}</native:text>
                        <native:text class="text-xs text-theme-on-surface-variant">{{ $account['type'] }}</native:text>
                    </native:column>
                    <native:text class="text-sm font-bold text-theme-on-surface">{{ $account['balance'] }}</native:text>
                </native:row>
            @endforeach
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">تراکنش‌های اخیر</native:text>
                <native:pressable class="rounded-lg px-1 py-1" @tap="openTransactions">
                    <native:text class="text-xs font-semibold text-theme-primary">مشاهده همه</native:text>
                </native:pressable>
            </native:row>
            @if ($recent === [])
                @include('native.partials.empty-state', [
                    'icon' => 'receipt_long',
                    'title' => 'هنوز تراکنشی ثبت نشده',
                    'body' => 'با دکمه + اولین هزینه یا درآمد را ثبت کنید.',
                    'actionLabel' => 'ثبت تراکنش',
                    'action' => 'createTransaction',
                ])
            @else
                @foreach ($recent as $row)
                    <native:pressable class="w-full" @tap="editTransaction({{ $row['id'] }})">
                        <native:row class="w-full items-center gap-3 rounded-xl py-1">
                            <native:column class="h-10 w-10 items-center justify-center rounded-full bg-[{{ $row['color'] }}]">
                                <native:text class="text-sm font-bold text-white">{{ $row['initial'] }}</native:text>
                            </native:column>
                            <native:column class="flex-1 gap-1">
                                <native:text class="text-sm font-semibold text-theme-on-surface">{{ $row['title'] }}</native:text>
                                <native:text class="text-xs text-theme-on-surface-variant">{{ $row['date'] }} · {{ $row['subtitle'] }}</native:text>
                            </native:column>
                            <native:text class="text-sm font-bold {{ $row['amount_class'] }}">{{ $row['amount'] }}</native:text>
                        </native:row>
                    </native:pressable>
                @endforeach
            @endif
        </native:column>
    </native:column>
</native:scroll-view>

<native:fab icon="add" @tap="createTransaction" />

@include('native.partials.bottom-nav', ['dueCount' => $dueCount])
