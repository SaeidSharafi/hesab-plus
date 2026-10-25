<native:top-bar title="سرمایه و دارایی">
    <native:top-bar-action id="new-asset" label="دارایی جدید" @tap="openAssetForm" :ios-icon="'plus.circle'" :android-icon="'add_circle'" />
</native:top-bar>

<native:scroll-view class="w-full flex-1 bg-theme-background">
    <native:column class="w-full gap-4 p-4 pb-28">
        @include('native.partials.notice')

        <native:column class="w-full gap-3 rounded-3xl bg-theme-primary p-5">
            <native:text class="text-sm text-theme-on-primary/80">ارزش روز سبد</native:text>
            <native:text class="text-3xl font-extrabold text-theme-on-primary">{{ $marketValue }}</native:text>
            <native:row class="w-full gap-4 border-t border-theme-on-primary/20 pt-3">
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-primary/70">سود / زیان</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-primary">{{ $unrealized }}</native:text>
                    <native:text class="text-xs text-theme-on-primary/70">{{ $percent($unrealizedPercent) }}</native:text>
                </native:column>
                <native:column class="flex-1 gap-1">
                    <native:text class="text-xs text-theme-on-primary/70">بازده XIRR</native:text>
                    <native:text class="text-sm font-semibold text-theme-on-primary">{{ $xirr ?? 'نیاز به تاریخچه بیشتر' }}</native:text>
                </native:column>
            </native:row>
        </native:column>

        <native:row class="w-full gap-2">
            <native:column class="flex-1 gap-1 rounded-2xl border border-theme-outline bg-theme-surface p-3">
                <native:text class="text-xs text-theme-on-surface-variant">بهای تمام‌شده</native:text>
                <native:text class="text-sm font-bold text-theme-on-surface">{{ $costBasis }}</native:text>
            </native:column>
            <native:column class="flex-1 gap-1 rounded-2xl border border-theme-outline bg-theme-surface p-3">
                <native:text class="text-xs text-theme-on-surface-variant">سود محقق‌شده</native:text>
                <native:text class="text-sm font-bold text-theme-success">{{ $realized }}</native:text>
            </native:column>
        </native:row>

        @if ($allocation !== [])
            <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
                <native:text class="text-sm font-bold text-theme-on-surface">ترکیب سبد</native:text>
                @foreach ($allocation as $item)
                    <native:column class="w-full gap-1">
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface">{{ $item['label'] }}</native:text>
                            <native:text class="text-xs font-semibold text-theme-on-surface-variant">{{ $percent($item['percent']) }}</native:text>
                        </native:row>
                        <native:progress-bar :value="$item['percent'] / 100" />
                    </native:column>
                @endforeach
            </native:column>
        @endif

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:text class="text-sm font-bold text-theme-on-surface">دارایی‌ها و سود/زیان</native:text>
            @if ($holdings === [])
                <native:text class="text-xs text-theme-on-surface-variant">هنوز دارایی‌ای در سبد نیست. یک دارایی اضافه کنید یا معامله ثبت کنید.</native:text>
            @else
                @foreach ($holdings as $holding)
                    <native:column class="w-full gap-3 rounded-xl bg-theme-surface-variant p-3">
                        <native:row class="w-full items-start justify-between gap-2">
                            <native:column class="flex-1 gap-1">
                                <native:text class="text-sm font-bold text-theme-on-surface">{{ $holding['name'] }}</native:text>
                                <native:text class="text-xs text-theme-on-surface-variant">{{ $holding['symbol'] }} · {{ $holding['quantity'] }}</native:text>
                            </native:column>
                            <native:column class="items-end gap-1">
                                <native:text class="text-sm font-bold text-theme-on-surface">{{ $holding['value'] }}</native:text>
                                <native:text class="text-xs font-semibold {{ $holding['positive'] ? 'text-theme-success' : 'text-theme-destructive' }}">
                                    {{ $holding['unrealized'] }} ({{ $percent($holding['unrealized_percent']) }})
                                </native:text>
                            </native:column>
                        </native:row>
                        <native:row class="w-full items-center justify-between">
                            <native:text class="text-xs text-theme-on-surface-variant">میانگین خرید: {{ $holding['average'] }}</native:text>
                            @if ($holding['realized'])
                                <native:text class="text-xs text-theme-success">محقق‌شده: {{ $holding['realized'] }}</native:text>
                            @endif
                        </native:row>
                        <native:row class="w-full gap-2">
                            <native:button label="خرید" size="sm" variant="primary" class="flex-1" @tap="openTrade({{ $holding['id'] }}, 'buy')" />
                            <native:button label="فروش" size="sm" variant="ghost" class="flex-1" @tap="openTrade({{ $holding['id'] }}, 'sell')" />
                        </native:row>
                    </native:column>
                @endforeach
            @endif
        </native:column>

        <native:column class="w-full gap-3 rounded-2xl border border-theme-outline bg-theme-surface p-4">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-sm font-bold text-theme-on-surface">نرخ روز بازار</native:text>
                <native:text class="text-xs text-theme-on-surface-variant">{{ $todayLabel }}</native:text>
            </native:row>
            @foreach ($assets as $asset)
                <native:row class="w-full items-center gap-3 rounded-xl bg-theme-surface-variant p-2">
                    <native:column class="h-9 w-9 items-center justify-center rounded-full bg-[{{ $asset['color'] }}]">
                        <native:text class="text-xs font-bold text-white">{{ mb_substr($asset['name'], 0, 1) }}</native:text>
                    </native:column>
                    <native:column class="flex-1 gap-1">
                        <native:text class="text-xs font-semibold text-theme-on-surface">{{ $asset['name'] }}</native:text>
                        <native:text class="text-xs text-theme-on-surface-variant">{{ $asset['class'] }} · {{ $asset['unit'] }}</native:text>
                    </native:column>
                    <native:column class="items-end gap-1">
                        <native:text class="text-xs font-bold text-theme-on-surface">{{ $asset['price'] }}</native:text>
                        <native:text class="text-xs font-semibold {{ $asset['positive'] ? 'text-theme-success' : 'text-theme-destructive' }}">{{ $percent($asset['change']) }}</native:text>
                    </native:column>
                    <native:pressable class="rounded-lg p-1" @tap="openPrice({{ $asset['id'] }})">
                        <native:icon name="edit" :size="18" class="text-theme-primary" />
                    </native:pressable>
                    <native:pressable class="rounded-lg p-1" @tap="openTrade({{ $asset['id'] }}, 'buy')">
                        <native:icon name="add_circle" :size="20" class="text-theme-primary" />
                    </native:pressable>
                </native:row>
            @endforeach
        </native:column>

        <native:button label="+ افزودن دارایی جدید" variant="tonal" @tap="openAssetForm" />
    </native:column>
</native:scroll-view>

@include('native.partials.bottom-nav', ['dueCount' => $dueCount])

@if ($showTrade && $tradeAsset)
    <native:bottom-sheet visible="true" detents="large" @dismiss="closeTrade">
        <native:column class="w-full gap-3 bg-theme-surface p-5">
            <native:row class="w-full items-center justify-between">
                <native:text class="text-base font-bold text-theme-on-surface">{{ $tradeAsset->name }}</native:text>
                <native:button label="بستن" variant="ghost" size="sm" @tap="closeTrade" />
            </native:row>
            <native:row class="w-full gap-2 rounded-xl bg-theme-surface-variant p-1">
                <native:button label="خرید" size="sm" class="flex-1" variant="{{ $tradeType === 'buy' ? 'primary' : 'ghost' }}" @tap="setTradeType('buy')" />
                <native:button label="فروش" size="sm" class="flex-1" variant="{{ $tradeType === 'sell' ? 'primary' : 'ghost' }}" @tap="setTradeType('sell')" />
            </native:row>
            <native:outlined-text-input label="مقدار ({{ $tradeAsset->unit }})" keyboard="decimal" native:model.debounce.300ms="quantityInput" />
            <native:outlined-text-input label="قیمت هر واحد ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="priceInput" />
            <native:outlined-text-input label="کارمزد ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="feeInput" />
            <native:column class="w-full gap-1">
                <native:text class="text-xs font-bold text-theme-on-surface-variant">حساب</native:text>
                @foreach ($accounts as $account)
                    <native:pressable class="w-full rounded-xl p-2 {{ $accountId === $account['id'] ? 'bg-theme-primary/10' : '' }}" @tap="selectAccount({{ $account['id'] }})">
                        <native:row class="w-full items-center gap-3">
                            <native:column class="h-8 w-8 items-center justify-center rounded-full bg-[{{ $account['color'] }}]">
                                <native:text class="text-xs font-bold text-white">{{ $account['initial'] }}</native:text>
                            </native:column>
                            <native:text class="flex-1 text-sm {{ $accountId === $account['id'] ? 'font-bold text-theme-primary' : 'text-theme-on-surface' }}">{{ $account['name'] }}</native:text>
                            @if ($accountId === $account['id'])
                                <native:icon name="check" :size="18" class="text-theme-primary" />
                            @endif
                        </native:row>
                    </native:pressable>
                @endforeach
            </native:column>
            <native:row class="w-full items-center justify-between">
                <native:text class="text-xs text-theme-on-surface-variant">مبلغ معامله</native:text>
                <native:text class="text-sm font-bold text-theme-on-surface">{{ $tradeGross }}</native:text>
            </native:row>
            <native:button label="ثبت معامله" variant="primary" size="lg" @tap="saveTrade" />
        </native:column>
    </native:bottom-sheet>
@endif

@if ($showPrice && $priceAsset)
    <native:bottom-sheet visible="true" detents="medium" @dismiss="closePrice">
        <native:column class="w-full gap-3 bg-theme-surface p-5">
            <native:text class="text-base font-bold text-theme-on-surface">ویرایش قیمت {{ $priceAsset->name }}</native:text>
            <native:outlined-text-input label="قیمت هر {{ $priceAsset->unit }} ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="editedPriceInput" autofocus />
            <native:row class="w-full gap-2">
                <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closePrice" />
                <native:button label="ثبت قیمت" variant="primary" class="flex-1" @tap="savePrice" />
            </native:row>
        </native:column>
    </native:bottom-sheet>
@endif

@if ($showAssetForm)
    <native:bottom-sheet visible="true" detents="large" @dismiss="closeAssetForm">
        <native:scroll-view class="w-full">
            <native:column class="w-full gap-3 bg-theme-surface p-5">
                <native:text class="text-base font-bold text-theme-on-surface">دارایی جدید</native:text>
                <native:outlined-text-input label="نام دارایی" placeholder="مثلاً طلای ۱۸ عیار" native:model.debounce.300ms="newAssetName" />
                <native:outlined-text-input label="نماد" placeholder="مثلاً GOLD18" native:model.debounce.300ms="newAssetSymbol" />
                <native:column class="w-full gap-2">
                    <native:text class="text-xs font-bold text-theme-on-surface-variant">نوع دارایی</native:text>
                    <native:row class="w-full flex-wrap gap-2">
                        <native:button label="طلا" size="sm" variant="{{ $newAssetClass === 'gold' ? 'primary' : 'ghost' }}" @tap="setNewAssetClass('gold')" />
                        <native:button label="سکه" size="sm" variant="{{ $newAssetClass === 'coin' ? 'primary' : 'ghost' }}" @tap="setNewAssetClass('coin')" />
                        <native:button label="صندوق" size="sm" variant="{{ $newAssetClass === 'fund' ? 'primary' : 'ghost' }}" @tap="setNewAssetClass('fund')" />
                        <native:button label="سهام" size="sm" variant="{{ $newAssetClass === 'stock' ? 'primary' : 'ghost' }}" @tap="setNewAssetClass('stock')" />
                        <native:button label="ارز" size="sm" variant="{{ $newAssetClass === 'fx' ? 'primary' : 'ghost' }}" @tap="setNewAssetClass('fx')" />
                        <native:button label="رمزارز" size="sm" variant="{{ $newAssetClass === 'crypto' ? 'primary' : 'ghost' }}" @tap="setNewAssetClass('crypto')" />
                        <native:button label="دستی" size="sm" variant="{{ $newAssetClass === 'manual' ? 'primary' : 'ghost' }}" @tap="setNewAssetClass('manual')" />
                    </native:row>
                </native:column>
                <native:outlined-text-input label="واحد" native:model.debounce.300ms="newAssetUnit" />
                <native:outlined-text-input label="قیمت فعلی هر واحد ({{ $currencyLabel }})" keyboard="number" native:model.debounce.300ms="newAssetPrice" />
                <native:row class="w-full gap-2">
                    <native:button label="انصراف" variant="ghost" class="flex-1" @tap="closeAssetForm" />
                    <native:button label="افزودن" variant="primary" class="flex-1" @tap="saveAsset" />
                </native:row>
            </native:column>
        </native:scroll-view>
    </native:bottom-sheet>
@endif
