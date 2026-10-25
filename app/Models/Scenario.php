<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Scenario extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'monthly_delta' => 'integer',
            'one_time_delta' => 'integer',
            'start_month_offset' => 'integer',
            'duration_months' => 'integer',
        ];
    }
}
