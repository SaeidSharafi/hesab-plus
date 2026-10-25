<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Goal extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'target' => 'integer',
            'saved' => 'integer',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
