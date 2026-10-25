<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Goal;
use App\Services\Ledger;
use App\Support\HesabScreen;
use Illuminate\View\View;

class More extends HesabScreen
{
    public function reports(): void
    {
        $this->go('/reports');
    }

    public function forecast(): void
    {
        $this->go('/forecast');
    }

    public function accounts(): void
    {
        $this->go('/accounts');
    }

    public function categories(): void
    {
        $this->go('/categories');
    }

    public function reminders(): void
    {
        $this->go('/reminders');
    }

    public function openSettings(): void
    {
        $this->go('/settings');
    }

    public function render(): View
    {
        $ledger = new Ledger;
        $net = $ledger->netWorth();

        return $this->screen('native.more', [
            'netWorth' => $this->amount($net['net_worth']),
            'accountsCount' => Account::query()->where('archived', false)->count(),
            'goalsCount' => Goal::query()->count(),
            'obligationsCount' => count($ledger->obligations(30)),
            'dueCount' => count($ledger->obligations(30)),
        ]);
    }
}
