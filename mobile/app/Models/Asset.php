<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asset extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'current_price' => 'integer',
            'previous_close' => 'integer',
            'price_history' => 'array',
        ];
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class)->orderBy('date_jalali')->orderBy('id');
    }
}
