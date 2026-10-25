<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Asset;
use App\Models\Lot;
use App\Services\LedgerWriter;
use App\Services\Portfolio;
use App\Support\HesabScreen;
use App\Support\Money;
use App\Support\Persian;
use Illuminate\View\View;
use InvalidArgumentException;

class Investments extends HesabScreen
{
    public bool $showTrade = false;

    public bool $showPrice = false;

    public bool $showAssetForm = false;

    public bool $showAccountPicker = false;

    public ?int $tradeAssetId = null;

    public string $tradeType = 'buy';

    public string $quantityInput = '';

    public string $priceInput = '';

    public string $feeInput = '0';

    public ?int $accountId = null;

    public ?int $priceAssetId = null;

    public string $editedPriceInput = '';

    public string $newAssetName = '';

    public string $newAssetSymbol = '';

    public string $newAssetClass = 'gold';

    public string $newAssetUnit = 'گرم';

    public string $newAssetPrice = '';

    public function openTrade(int $assetId, string $type = 'buy'): void
    {
        $asset = Asset::query()->find($assetId);
        if ($asset === null) {
            return;
        }
        $this->tradeAssetId = $asset->id;
        $this->tradeType = $type === 'sell' ? 'sell' : 'buy';
        $this->quantityInput = '';
        $factor = $this->settings()->currency === 'TOMAN' ? 10 : 1;
        $this->priceInput = Persian::number((int) round($asset->current_price / $factor), 0, $this->settings()->numerals);
        $this->feeInput = '0';
        $this->accountId = Account::query()->where('archived', false)->orderBy('name')->value('id');
        $this->showTrade = true;
    }

    public function closeTrade(): void
    {
        $this->showTrade = false;
        $this->tradeAssetId = null;
    }

    public function setTradeType(string $type): void
    {
        if (in_array($type, ['buy', 'sell'], true)) {
            $this->tradeType = $type;
        }
    }

    public function openAccountPicker(): void
    {
        $this->showAccountPicker = true;
    }

    public function closeAccountPicker(): void
    {
        $this->showAccountPicker = false;
    }

    public function selectAccount(int $id): void
    {
        $this->accountId = $id;
        $this->showAccountPicker = false;
    }

    public function saveTrade(): void
    {
        $this->clearNotice();
        if ($this->tradeAssetId === null) {
            return;
        }
        try {
            (new LedgerWriter)->addLot([
                'asset_id' => $this->tradeAssetId,
                'type' => $this->tradeType,
                'quantity' => (float) str_replace([',', '٬', '،', ' '], '', Persian::english($this->quantityInput)),
                'price_per_unit' => Money::parseToRial($this->priceInput, $this->settings()->currency),
                'fee' => Money::parseToRial($this->feeInput, $this->settings()->currency),
                'account_id' => $this->accountId,
                'date_jalali' => $this->today()->toString(),
            ]);
            $this->succeed('معامله ثبت شد.');
            $this->closeTrade();
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function openPrice(int $assetId): void
    {
        $asset = Asset::query()->find($assetId);
        if ($asset === null) {
            return;
        }
        $this->priceAssetId = $asset->id;
        $factor = $this->settings()->currency === 'TOMAN' ? 10 : 1;
        $this->editedPriceInput = Persian::number((int) round($asset->current_price / $factor), 0, $this->settings()->numerals);
        $this->showPrice = true;
    }

    public function closePrice(): void
    {
        $this->showPrice = false;
        $this->priceAssetId = null;
    }

    public function savePrice(): void
    {
        if ($this->priceAssetId === null) {
            return;
        }
        $asset = Asset::query()->find($this->priceAssetId);
        if ($asset === null) {
            return;
        }
        try {
            (new LedgerWriter)->updateAssetPrice($asset, Money::parseToRial($this->editedPriceInput, $this->settings()->currency));
            $this->succeed('قیمت به‌روزرسانی شد.');
            $this->closePrice();
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function openAssetForm(): void
    {
        $this->newAssetName = '';
        $this->newAssetSymbol = '';
        $this->newAssetClass = 'gold';
        $this->newAssetUnit = 'گرم';
        $this->newAssetPrice = '';
        $this->showAssetForm = true;
    }

    public function closeAssetForm(): void
    {
        $this->showAssetForm = false;
    }

    public function setNewAssetClass(string $class): void
    {
        if (in_array($class, ['gold', 'coin', 'gold_fund', 'fund', 'stock', 'fx', 'crypto', 'deposit', 'manual'], true)) {
            $this->newAssetClass = $class;
            $this->newAssetUnit = match ($class) {
                'gold' => 'گرم',
                'coin' => 'عدد',
                'gold_fund', 'fund' => 'واحد',
                'stock' => 'سهم',
                'fx' => 'دلار',
                'crypto' => 'USDT',
                'deposit' => 'ریال',
                default => 'واحد',
            };
        }
    }

    public function saveAsset(): void
    {
        try {
            (new LedgerWriter)->createAsset([
                'name' => $this->newAssetName,
                'symbol' => $this->newAssetSymbol,
                'class' => $this->newAssetClass,
                'unit' => $this->newAssetUnit,
                'current_price' => Money::parseToRial($this->newAssetPrice, $this->settings()->currency),
            ]);
            $this->succeed('دارایی اضافه شد.');
            $this->showAssetForm = false;
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function render(): View
    {
        $assets = Asset::query()->orderBy('name')->get();
        $lots = Lot::query()->get();
        $portfolio = Portfolio::summary($assets, $lots);
        $settings = $this->settings();

        $holdingRows = array_map(fn (array $holding): array => [
            'id' => $holding['asset']->id,
            'name' => $holding['asset']->name,
            'symbol' => $holding['asset']->symbol,
            'quantity' => $this->number($holding['quantity'], $holding['quantity'] < 1 ? 4 : 2).' '.$holding['asset']->unit,
            'value' => $this->amount($holding['market_value']),
            'cost' => $this->amount($holding['cost_basis']),
            'average' => $this->amount($holding['average_cost']),
            'unrealized' => $this->amount($holding['unrealized'], true),
            'unrealized_percent' => $holding['unrealized_percent'],
            'positive' => $holding['unrealized'] >= 0,
            'realized' => $holding['realized'] > 0 ? $this->amount($holding['realized'], true) : null,
        ], $portfolio['holdings']);

        $assetRows = $assets->map(function (Asset $asset): array {
            $change = $asset->previous_close > 0 ? (($asset->current_price - $asset->previous_close) / $asset->previous_close) * 100 : 0.0;

            return [
                'id' => $asset->id,
                'name' => $asset->name,
                'symbol' => $asset->symbol,
                'unit' => $asset->unit,
                'price' => $this->amount($asset->current_price),
                'change' => $change,
                'positive' => $change >= 0,
                'class' => Portfolio::classLabel($asset->class),
                'color' => Portfolio::classColor($asset->class),
                'updated' => $this->dateText($asset->last_updated_jalali, 'short'),
            ];
        })->all();

        $tradeAsset = $this->tradeAssetId !== null ? $assets->firstWhere('id', $this->tradeAssetId) : null;
        $quantity = (float) str_replace([',', '٬', '،', ' '], '', Persian::english($this->quantityInput));
        $unitPrice = Money::parseToRial($this->priceInput, $settings->currency);
        $gross = (int) round($quantity * $unitPrice);
        $priceFactor = $settings->currency === 'TOMAN' ? 10 : 1;

        return $this->screen('native.investments', [
            'holdings' => $holdingRows,
            'assets' => $assetRows,
            'allocation' => $portfolio['allocation'],
            'marketValue' => $this->amount($portfolio['market_value']),
            'costBasis' => $this->amount($portfolio['cost_basis']),
            'unrealized' => $this->amount($portfolio['unrealized'], true),
            'unrealizedPercent' => $portfolio['unrealized_percent'],
            'unrealizedPositive' => $portfolio['unrealized'] >= 0,
            'realized' => $this->amount($portfolio['realized'], true),
            'fees' => $this->amount($portfolio['fees']),
            'xirr' => $portfolio['xirr'] !== null ? $this->percent($portfolio['xirr'] * 100) : null,
            'tradeAsset' => $tradeAsset,
            'tradeGross' => $this->amount($gross),
            'accounts' => Account::query()->where('archived', false)->orderBy('name')->get()->map(fn (Account $account): array => [
                'id' => $account->id,
                'name' => $account->name,
                'color' => $account->color,
                'initial' => mb_substr($account->name, 0, 1),
            ])->all(),
            'selectedAccount' => $this->accountId ? Account::query()->find($this->accountId) : null,
            'priceAsset' => $this->priceAssetId ? $assets->firstWhere('id', $this->priceAssetId) : null,
            'currencyLabel' => $settings->currency === 'TOMAN' ? 'تومان' : 'ریال',
            'pricePerUnitHint' => $priceFactor,
            'dueCount' => count($this->ledger()->obligations(30)),
        ]);
    }
}
