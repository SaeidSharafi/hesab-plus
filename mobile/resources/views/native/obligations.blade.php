<native:top-bar title="تعهدات و اقساط" />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-28">
        @include('native.partials.notice')

        <native:column class="w-full gap-3 rounded-3xl bg-theme-primary p-5">
            <native:text class="text-sm text-theme-on-primary/80">مانده اصل وام‌ها</native:text>
            <native:text class="text-3xl font-extrabold text-theme-on-primary">{{ $loanTotalLabel }}</native:text>
            <native:row class="w-full gap-4 border-t border-theme-on-primary/20 pt-3">
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-primary/70">چک پرداختی</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-primary">{{ $issuedLabel }}</native:text>
                </native:column>
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-primary/70">چک دریافتی</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-primary">{{ $receivedLabel }}</native:text>
                </native:column>
            </native:row>
        </native:column>

        <native:row class="w-full gap-2 rounded-xl bg-theme-surface-variant p-1">
            <native:button label="وام‌ها" size="sm" class="flex-1" variant="{{ $tab === 'loans' ? 'primary' : 'ghost' }}" @tap="setTab('loans')" />
            <native:button label="چک‌ها" size="sm" class="flex-1" variant="{{ $tab === 'cheques' ? 'primary' : 'ghost' }}" @tap="setTab('cheques')" />
            <native:button label="اشخاص" size="sm" class="flex-1" variant="{{ $tab === 'people' ? 'primary' : 'ghost' }}" @tap="setTab('people')" />
        </native:row>

        @if ($tab === 'loans')
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">وام‌ها و تسهیلات</native:text>
                <native:button label="+ وام" size="sm" variant="tonal" @tap="createLoan" />
            </native:row>

            @if ($loans === [])
                @include('native.partials.empty-state', [
                    'icon' => 'account_balance',
                    'title' => 'وامی ثبت نشده',
                    'body' => 'اولین وام یا تسهیلات را با جدول اقساط اضافه کنید.',
                    'actionLabel' => 'افزودن وام',
                    'action' => 'createLoan',
                ])
            @else
                @foreach ($loans as $loan)
                    <native:pressable class="w-full" @tap="openLoan({{ $loan['id'] }})">
                        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                            <native:row class="w-full items-start justify-between">
                                <native:column class="flex-1 gap-1">
                                    <native:text class="text-sm font-bold text-theme-on-surface">{{ $loan['lender'] }}</native:text>
                                    <native:text class="text-xs text-theme-on-surface-variant">{{ $num($loan['paid']) }} از {{ $num($loan['total']) }} قسط پرداخت شده</native:text>
                                </native:column>
                                @if ($loan['overdue'] > 0)
                                    <native:badge label="{{ $num($loan['overdue']) }} معوق" />
                                @endif
                            </native:row>
                            <native:progress-bar :value="$loan['progress']" />
                            <native:row class="w-full items-center justify-between">
                                <native:column class="gap-1">
                                    <native:text class="text-xs text-theme-on-surface-variant">مانده اصل</native:text>
                                    <native:text class="text-sm font-bold text-theme-on-surface">{{ $loan['remaining'] }}</native:text>
                                </native:column>
                                <native:column class="items-end gap-1">
                                    <native:text class="text-xs text-theme-on-surface-variant">قسط بعدی</native:text>
                                    <native:text class="text-sm font-semibold text-theme-accent">{{ $loan['next_label'] }}</native:text>
                                </native:column>
                            </native:row>
                        </native:column>
                    </native:pressable>
                @endforeach
            @endif
        @elseif ($tab === 'cheques')
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">چک‌های صیادی</native:text>
                <native:button label="+ چک" size="sm" variant="tonal" @tap="createCheque" />
            </native:row>

            @if ($cheques === [])
                @include('native.partials.empty-state', [
                    'icon' => 'receipt_long',
                    'title' => 'چکی ثبت نشده',
                    'body' => 'چک‌های دریافتی و پرداختی را با سررسید ثبت کنید.',
                    'actionLabel' => 'افزودن چک',
                    'action' => 'createCheque',
                ])
            @else
                @foreach ($cheques as $cheque)
                    <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                        <native:row class="w-full items-start justify-between gap-2">
                            <native:column class="flex-1 gap-1">
                                <native:text class="text-sm font-bold text-theme-on-surface">{{ $cheque['title'] }}</native:text>
                                <native:text class="text-xs text-theme-on-surface-variant">{{ $cheque['bank'] }}</native:text>
                            </native:column>
                            <native:text class="text-sm font-bold text-theme-on-surface">{{ $cheque['amount'] }}</native:text>
                        </native:row>
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $cheque['due'] }} · {{ $cheque['due_label'] }}</native:text>
                            <native:text class="text-xs font-semibold {{ $cheque['pending'] ? 'text-theme-accent' : 'text-theme-success' }}">{{ $cheque['status_label'] }}</native:text>
                        </native:row>
                        <native:row class="w-full gap-2">
                            @if ($cheque['pending'])
                                <native:button label="ثبت وصول / پاس" size="sm" variant="tonal" class="flex-1" @tap="settleCheque({{ $cheque['id'] }})" />
                            @elseif ($cheque['cashed'])
                                <native:button label="برگشت به انتظار" size="sm" variant="ghost" class="flex-1" @tap="undoCheque({{ $cheque['id'] }})" />
                            @endif
                            <native:button label="حذف" size="sm" variant="destructive" @tap="requestDeleteCheque({{ $cheque['id'] }})" />
                        </native:row>
                    </native:column>
                @endforeach
            @endif
        @else
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">دفتر اشخاص</native:text>
                <native:button label="+ بدهی/طلب" size="sm" variant="tonal" @tap="createDebt" />
            </native:row>

            @if ($people === [])
                @include('native.partials.empty-state', [
                    'icon' => 'people',
                    'title' => 'شخصی ثبت نشده',
                    'body' => 'برای پیگیری طلب و بدهی، یک شخص اضافه کنید.',
                    'actionLabel' => 'ثبت بدهی/طلب',
                    'action' => 'createDebt',
                ])
            @else
                @foreach ($people as $person)
                    <native:pressable class="w-full" @tap="openPerson({{ $person['id'] }})">
                        <native:row class="w-full items-center gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                            <native:column class="h-11 w-11 items-center justify-center rounded-full bg-[{{ $person['color'] }}]">
                                <native:text class="text-sm font-bold text-white">{{ $person['initial'] }}</native:text>
                            </native:column>
                            <native:column class="flex-1 gap-1">
                                <native:text class="text-sm font-bold text-theme-on-surface">{{ $person['name'] }}</native:text>
                                <native:text class="text-xs text-theme-on-surface-variant">{{ $person['subtitle'] }}</native:text>
                            </native:column>
                            <native:text class="text-sm font-bold {{ $person['balance_class'] }}">{{ $person['balance'] }}</native:text>
                        </native:row>
                    </native:pressable>
                @endforeach
            @endif
        @endif
    </native:column>
</native:scroll-view>

@include('native.partials.bottom-nav', ['dueCount' => $dueCount])

<native:bottom-sheet visible="{{ $deletingCheque !== null }}" detents="medium" @dismiss="closeDeleteCheque">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">حذف چک؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">اگر چک وصول شده باشد، تراکنش مرتبط هم حذف می‌شود.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeDeleteCheque" />
            <native:button label="حذف" variant="destructive" class="flex-1" @tap="deleteCheque" />
        </native:row>
    </native:column>
</native:bottom-sheet>
