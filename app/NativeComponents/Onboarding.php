<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use Illuminate\View\View;
use InvalidArgumentException;

class Onboarding extends HesabScreen
{
    public string $currency = 'TOMAN';

    public function mount(): void
    {
        $this->currency = $this->settings()->currency;
    }

    public function chooseCurrency(string $currency): void
    {
        if (! in_array($currency, ['TOMAN', 'RIAL'], true)) {
            return;
        }
        $this->currency = $currency;
        (new LedgerWriter)->updateSettings(['currency' => $currency]);
    }

    public function startEmpty(): void
    {
        try {
            (new LedgerWriter)->startEmpty('کیف پول');
            $this->navigate('/');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function loadDemo(): void
    {
        try {
            (new LedgerWriter)->loadDemo();
            $this->navigate('/');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        } catch (\Throwable $exception) {
            report($exception);
            $this->fail('بارگذاری داده نمونه انجام نشد. دوباره تلاش کنید.');
        }
    }

    public function render(): View
    {
        return $this->screen('native.onboarding', [
            'currency' => $this->currency,
            'accountsCount' => Account::query()->count(),
        ]);
    }
}
