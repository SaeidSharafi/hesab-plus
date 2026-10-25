<native:top-bar title="{{ $person?->name ?? 'دفتر شخص' }}" back />

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-10">
        @include('native.partials.notice')

        @if ($person === null || $summary === null)
            @include('native.partials.empty-state', [
                'icon' => 'people',
                'title' => 'شخص پیدا نشد',
                'body' => 'به فهرست اشخاص برگردید.',
            ])
        @else
            <native:column class="w-full gap-2 rounded-3xl bg-theme-primary p-5">
                <native:row class="w-full items-center gap-3">
                    <native:column class="h-12 w-12 items-center justify-center rounded-full bg-white/20">
                        <native:text class="text-lg font-bold text-theme-on-primary">{{ mb_substr($person->name, 0, 1) }}</native:text>
                    </native:column>
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-sm text-theme-on-primary/80">تراز حساب</native:text>
                        <native:text class="text-2xl font-extrabold text-theme-on-primary">{{ $balanceLabel }}</native:text>
                    </native:column>
                </native:row>
                <native:row class="w-full gap-4 border-t border-theme-on-primary/20 pt-3">
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-xs text-theme-on-primary/70">طلب من</native:text>
                        <native:text class="text-sm font-semibold text-theme-on-primary">{{ $lentLabel }}</native:text>
                    </native:column>
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-xs text-theme-on-primary/70">بدهی من</native:text>
                        <native:text class="text-sm font-semibold text-theme-on-primary">{{ $borrowedLabel }}</native:text>
                    </native:column>
                </native:row>
            </native:column>

            <native:button label="+ ثبت بدهی یا طلب جدید" variant="tonal" size="md" @tap="createDebt" />

            @if ($rows === [])
                @include('native.partials.empty-state', [
                    'icon' => 'receipt_long',
                    'title' => 'ریز حسابی وجود ندارد',
                    'body' => 'اولین طلب یا بدهی این شخص را ثبت کنید.',
                    'actionLabel' => 'ثبت مورد جدید',
                    'action' => 'createDebt',
                ])
            @else
                @foreach ($rows as $row)
                    <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                        <native:row class="w-full items-start justify-between gap-2">
                            <native:column class="flex-1 gap-1">
                                <native:text class="text-sm font-bold {{ $row['direction'] === 'lent' ? 'text-theme-success' : 'text-theme-destructive' }}">{{ $row['direction_label'] }}</native:text>
                                <native:text class="text-xs text-theme-on-surface-variant">{{ $row['note'] ?? 'بدون بابت' }}</native:text>
                            </native:column>
                            <native:column class="items-end gap-1">
                                <native:text class="text-sm font-bold text-theme-on-surface">{{ $row['amount'] }}</native:text>
                                <native:text class="text-xs {{ $row['overdue'] ? 'text-theme-destructive' : 'text-theme-on-surface-variant' }}">{{ $row['status_label'] }}</native:text>
                            </native:column>
                        </native:row>

                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $row['due'] }}{{ $row['due_label'] ? ' · '.$row['due_label'] : '' }}</native:text>
                            <native:text class="text-xs text-theme-on-surface-variant">{{ $row['original'] }}</native:text>
                        </native:row>

                        @if ($row['settled_amount'])
                            <native:text class="text-xs text-theme-on-surface-variant">تسویه‌شده تاکنون: {{ $row['settled_amount'] }}</native:text>
                        @endif

                        @if ($row['active'])
                            <native:row class="w-full gap-2">
                                <native:button label="تسویه" size="sm" variant="primary" class="flex-1" @tap="openSettle({{ $row['id'] }})" />
                                <native:button label="یادآوری" size="sm" variant="tonal" @tap="openReminder({{ $row['id'] }})" />
                                <native:button label="بخشیدن" size="sm" variant="ghost" @tap="openForgive({{ $row['id'] }})" />
                            </native:row>
                        @endif

                        <native:pressable class="mt-1" @tap="requestDelete({{ $row['id'] }})">
                            <native:text class="text-xs font-semibold text-theme-destructive">حذف این مورد</native:text>
                        </native:pressable>
                    </native:column>
                @endforeach
            @endif
        @endif
    </native:column>
</native:scroll-view>

<native:bottom-sheet visible="{{ $showSettle }}" detents="large" @dismiss="closeSettle">
    <native:column class="w-full gap-3 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">ثبت تسویه</native:text>
        <native:text class="text-xs text-theme-on-surface-variant">مانده قابل تسویه: {{ $settleOutstanding }}</native:text>
        <native:outlined-text-input label="مبلغ تسویه ({{ $settings->currency === 'TOMAN' ? 'تومان' : 'ریال' }})" keyboard="number" native:model.debounce.300ms="settleInput" autofocus />
        <native:text class="text-xs font-bold text-theme-on-surface-variant">واریز / برداشت از حساب</native:text>
        <native:pressable class="w-full rounded-xl p-2 {{ $settleAccountId === null ? 'bg-theme-primary/10' : '' }}" @tap="selectSettleAccount(null)">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm {{ $settleAccountId === null ? 'font-bold text-theme-primary' : 'text-theme-on-surface' }}">بدون جابه‌جایی حساب</native:text>
                @if ($settleAccountId === null)
                    <native:icon name="check" :size="18" class="text-theme-primary" />
                @endif
            </native:row>
        </native:pressable>
        @foreach ($accounts as $account)
            <native:pressable class="w-full rounded-xl p-2" @tap="selectSettleAccount({{ $account['id'] }})">
                <native:row class="w-full items-center gap-3">
                    <native:column class="h-8 w-8 items-center justify-center rounded-full bg-[{{ $account['color'] }}]">
                        <native:text class="text-xs font-bold text-white">{{ $account['initial'] }}</native:text>
                    </native:column>
                    <native:text class="flex-1 text-sm {{ $settleAccountId === $account['id'] ? 'font-bold text-theme-primary' : 'text-theme-on-surface' }}">{{ $account['name'] }}</native:text>
                    @if ($settleAccountId === $account['id'])
                        <native:icon name="check" :size="18" class="text-theme-primary" />
                    @endif
                </native:row>
            </native:pressable>
        @endforeach
        <native:row class="w-full gap-2 pt-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeSettle" />
            <native:button label="ثبت تسویه" variant="primary" class="flex-1" @tap="settle" />
        </native:row>
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showForgive }}" detents="medium" @dismiss="closeForgive">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">بخشیدن بدهی؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">این مورد از حالت فعال خارج می‌شود و دیگر در مانده حساب اثر ندارد.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeForgive" />
            <native:button label="بخشیدن" variant="destructive" class="flex-1" @tap="forgive" />
        </native:row>
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showReminder }}" detents="large" @dismiss="closeReminder">
    <native:column class="w-full gap-3 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">متن یادآوری محترمانه</native:text>
        @foreach ($reminderLines as $line)
            <native:text class="text-sm text-theme-on-surface">{{ $line }}</native:text>
        @endforeach
        <native:button label="بستن" variant="ghost" @tap="closeReminder" />
    </native:column>
</native:bottom-sheet>

<native:bottom-sheet visible="{{ $showDelete }}" detents="medium" @dismiss="closeDelete">
    <native:column class="w-full gap-4 bg-theme-surface p-5">
        <native:text class="text-base font-bold text-theme-on-surface">حذف این مورد؟</native:text>
        <native:text class="text-sm text-theme-on-surface-variant">اگر تراکنش مرتبطی وجود داشته باشد، آن هم حذف می‌شود.</native:text>
        <native:row class="w-full gap-2">
            <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeDelete" />
            <native:button label="حذف" variant="destructive" class="flex-1" @tap="deleteDebt" />
        </native:row>
    </native:column>
</native:bottom-sheet>
