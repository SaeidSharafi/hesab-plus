<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Loan extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'principal' => 'integer',
            'total_fee' => 'integer',
            'annual_rate' => 'float',
            'penalty_annual_percent' => 'float',
            'installment_count' => 'integer',
            'frequency_months' => 'integer',
        ];
    }

    public function installments(): HasMany
    {
        return $this->hasMany(Installment::class)->orderBy('number');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Transaction::class, 'ref_id')->where('ref_kind', 'loan_installment');
    }
}
