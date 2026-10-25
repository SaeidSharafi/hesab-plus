<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'int';

    /**
     * Settings live in a single row. Missing rows (first boot on a very old
     * install) are created with the same defaults the migration uses.
     */
    public static function current(): self
    {
        return self::query()->firstOrCreate(['id' => 1], [
            'currency' => 'TOMAN',
            'numerals' => 'fa',
            'theme' => 'system',
            'hide_balances' => false,
            'onboarding_done' => false,
            'inflation_percent' => 35,
        ]);
    }

    protected function casts(): array
    {
        return [
            'hide_balances' => 'boolean',
            'onboarding_done' => 'boolean',
            'inflation_percent' => 'integer',
        ];
    }
}
