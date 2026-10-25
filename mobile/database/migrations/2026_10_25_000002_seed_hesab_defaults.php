<?php

use Database\Seeders\DefaultDataSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        (new DefaultDataSeeder)->run();
    }

    public function down(): void
    {
        // Default data is intentionally not removable on downgrade.
    }
};
