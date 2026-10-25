<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Installment extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'number' => 'integer',
            'amount' => 'integer',
            'principal' => 'integer',
            'interest' => 'integer',
            'penalty' => 'integer',
        ];
    }

    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'paid_txn_id');
    }
}
