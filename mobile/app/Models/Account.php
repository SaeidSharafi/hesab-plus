<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'integer',
            'include_in_net_worth' => 'boolean',
            'archived' => 'boolean',
        ];
    }

    public function outgoingTransactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'account_id');
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(Transaction::class, 'to_account_id');
    }
}
