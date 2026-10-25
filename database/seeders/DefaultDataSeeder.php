<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Setting;
use App\Support\DefaultCategories;
use Illuminate\Database\Seeder;

class DefaultDataSeeder extends Seeder
{
    public function run(): void
    {
        Setting::query()->updateOrCreate(['id' => 1], [
            'currency' => 'TOMAN',
            'numerals' => 'fa',
            'theme' => 'system',
            'hide_balances' => false,
            'onboarding_done' => false,
            'inflation_percent' => 35,
        ]);

        foreach (DefaultCategories::all() as $category) {
            $parentId = null;
            if ($category['parent'] !== null) {
                $parentId = Category::query()->where('slug', $category['parent'])->value('id');
            }

            Category::query()->updateOrCreate(
                ['slug' => $category['slug']],
                [
                    'parent_id' => $parentId,
                    'name' => $category['name'],
                    'kind' => $category['kind'],
                    'icon' => $category['icon'],
                    'color' => $category['color'],
                ]
            );
        }
    }
}
