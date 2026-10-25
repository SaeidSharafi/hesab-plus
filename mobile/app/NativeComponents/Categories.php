<?php

namespace App\NativeComponents;

use App\Models\Budget;
use App\Models\Category;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\Money;
use App\Support\Persian;
use Illuminate\View\View;
use InvalidArgumentException;

class Categories extends HesabScreen
{
    public string $kind = 'expense';

    public bool $showForm = false;

    public bool $showBudget = false;

    public bool $showParentPicker = false;

    public ?int $budgetCategoryId = null;

    public string $budgetInput = '';

    public string $name = '';

    public ?int $parentId = null;

    public function setKind(string $kind): void
    {
        if (in_array($kind, ['expense', 'income'], true)) {
            $this->kind = $kind;
            $this->parentId = null;
        }
    }

    public function openForm(): void
    {
        $this->name = '';
        $this->parentId = null;
        $this->showForm = true;
    }

    public function closeForm(): void
    {
        $this->showForm = false;
    }

    public function openParentPicker(): void
    {
        $this->showParentPicker = true;
    }

    public function closeParentPicker(): void
    {
        $this->showParentPicker = false;
    }

    public function selectParent(?int $id): void
    {
        $this->parentId = $id;
        $this->showParentPicker = false;
    }

    public function saveCategory(): void
    {
        try {
            (new LedgerWriter)->createCategory([
                'name' => $this->name,
                'kind' => $this->kind,
                'parent_id' => $this->parentId,
            ]);
            $this->succeed('دسته‌بندی اضافه شد.');
            $this->showForm = false;
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function openBudget(int $categoryId): void
    {
        $budget = Budget::query()->where('category_id', $categoryId)->first();
        $this->budgetCategoryId = $categoryId;
        $factor = $this->settings()->currency === 'TOMAN' ? 10 : 1;
        $this->budgetInput = $budget !== null
            ? Persian::number((int) round($budget->amount / $factor), 0, $this->settings()->numerals)
            : '';
        $this->showBudget = true;
    }

    public function closeBudget(): void
    {
        $this->showBudget = false;
        $this->budgetCategoryId = null;
    }

    public function saveBudget(): void
    {
        if ($this->budgetCategoryId === null) {
            return;
        }
        $category = Category::query()->find($this->budgetCategoryId);
        if ($category === null) {
            return;
        }
        try {
            (new LedgerWriter)->setBudget($category, Money::parseToRial($this->budgetInput, $this->settings()->currency));
            $this->succeed('بودجه ذخیره شد.');
            $this->closeBudget();
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function deleteBudget(): void
    {
        if ($this->budgetCategoryId === null) {
            return;
        }
        $budget = Budget::query()->where('category_id', $this->budgetCategoryId)->first();
        if ($budget !== null) {
            (new LedgerWriter)->deleteBudget($budget);
        }
        $this->closeBudget();
    }

    public function render(): View
    {
        $categories = Category::query()
            ->where('kind', $this->kind)
            ->where('archived', false)
            ->orderByRaw('parent_id is not null')
            ->orderBy('name')
            ->get();
        $spent = $this->ledger()->categoryDirect('expense', $this->today()->startOfMonth(), $this->today()->endOfMonth());
        $budgets = Budget::query()->get()->keyBy('category_id');
        $byParent = [];
        foreach ($categories as $category) {
            $byParent[$category->parent_id ?? 0][] = $category;
        }

        $rolled = [];
        $rollup = function (Category $category) use (&$rollup, &$rolled, $byParent, $spent): int {
            if (isset($rolled[$category->id])) {
                return $rolled[$category->id];
            }
            $total = $spent[$category->id] ?? 0;
            foreach ($byParent[$category->id] ?? [] as $child) {
                $total += $rollup($child);
            }

            return $rolled[$category->id] = $total;
        };

        $rows = [];
        $walk = function (Category $category, int $level) use (&$walk, &$rows, $rollup, $byParent, $budgets): void {
            $budget = $budgets->get($category->id);
            $total = $rollup($category);
            $rows[] = [
                'id' => $category->id,
                'name' => $category->name,
                'color' => $category->color,
                'level' => $level,
                'indent' => $level === 0 ? 'pl-0' : 'pl-4',
                'spent' => $this->amount($total),
                'budget' => $budget !== null ? $this->amount((int) $budget->amount) : null,
                'percent' => $budget !== null && $budget->amount > 0 ? min(100, ($total / $budget->amount) * 100) : 0,
                'has_budget' => $budget !== null,
            ];
            foreach ($byParent[$category->id] ?? [] as $child) {
                $walk($child, $level + 1);
            }
        };
        foreach ($byParent[0] ?? [] as $root) {
            $walk($root, 0);
        }

        $parents = Category::query()
            ->where('kind', $this->kind)
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get();

        return $this->screen('native.categories', [
            'rows' => $rows,
            'parents' => $parents->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
            ])->all(),
            'currencyLabel' => $this->settings()->currency === 'TOMAN' ? 'تومان' : 'ریال',
            'selectedParentName' => $this->parentId ? Category::query()->whereKey($this->parentId)->value('name') : null,
            'budgetCategoryName' => $this->budgetCategoryId ? Category::query()->whereKey($this->budgetCategoryId)->value('name') : null,
        ]);
    }
}
