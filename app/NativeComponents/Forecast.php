<?php

namespace App\NativeComponents;

use App\Models\Scenario;
use App\Services\Forecast as ForecastService;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use App\Support\Money;
use Illuminate\View\View;
use InvalidArgumentException;

class Forecast extends HesabScreen
{
    public int $horizon = 90;

    public bool $showReal = false;

    public bool $showGoalForm = false;

    public bool $showGoalDate = false;

    public string $goalName = '';

    public string $goalTargetInput = '';

    public string $goalSavedInput = '0';

    public string $goalDate = '';

    public function mount(): void
    {
        $this->goalDate = $this->today()->addMonths(6)->toString();
    }

    public function setHorizon(int $days): void
    {
        if (in_array($days, [30, 90, 180], true)) {
            $this->horizon = $days;
        }
    }

    public function toggleReal(): void
    {
        $this->showReal = ! $this->showReal;
    }

    public function toggleScenario(int $id): void
    {
        $scenario = Scenario::query()->find($id);
        if ($scenario !== null) {
            $scenario->update(['active' => ! $scenario->active]);
        }
    }

    public function openGoalForm(): void
    {
        $this->goalName = '';
        $this->goalTargetInput = '';
        $this->goalSavedInput = '0';
        $this->goalDate = $this->today()->addMonths(6)->toString();
        $this->showGoalForm = true;
    }

    public function closeGoalForm(): void
    {
        $this->showGoalForm = false;
    }

    public function openGoalDate(): void
    {
        $this->showGoalDate = true;
    }

    public function closeGoalDate(): void
    {
        $this->showGoalDate = false;
    }

    public function setGoalDate(string $date): void
    {
        if (JalaliDate::fromString($date) !== null) {
            $this->goalDate = $date;
        }
        $this->showGoalDate = false;
    }

    public function saveGoal(): void
    {
        try {
            (new LedgerWriter)->createGoal([
                'name' => $this->goalName,
                'target' => Money::parseToRial($this->goalTargetInput, $this->settings()->currency),
                'saved' => Money::parseToRial($this->goalSavedInput, $this->settings()->currency),
                'target_jalali' => $this->goalDate,
            ]);
            $this->succeed('هدف اضافه شد.');
            $this->showGoalForm = false;
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function render(): View
    {
        $forecast = (new ForecastService($this->ledger()))->run($this->horizon);
        $points = [];
        $lastIndex = count($forecast['points']) - 1;
        foreach ($forecast['points'] as $index => $point) {
            if ($point['offset'] % 30 !== 0 && $index !== $lastIndex) {
                continue;
            }
            $value = $this->showReal ? $point['real'] : $point['balance'];
            $points[] = [
                'date' => $this->dateText($point['date'], 'long'),
                'label' => $point['offset'] === 0 ? 'امروز' : $this->number($point['offset']).' روز',
                'value' => $this->amount($value),
                'negative' => $value < 0,
                'events' => count($point['events']),
            ];
        }

        $goals = array_map(function (array $row): array {
            $goal = $row['goal'];

            return [
                'id' => $goal->id,
                'name' => $goal->name,
                'percent' => $row['percent'],
                'saved' => $this->amount((int) $goal->saved),
                'target' => $this->amount((int) $goal->target),
                'required' => $this->amount((int) $row['required_monthly']),
                'months' => $row['months_left'],
                'on_track' => $row['on_track'],
                'color' => $goal->color,
            ];
        }, $forecast['goals']);

        $shortfalls = array_map(fn (array $shortfall): array => [
            'date' => $this->dateText($shortfall['date'], 'long'),
            'account' => $shortfall['account_name'],
            'amount' => $this->amount((int) $shortfall['amount']),
            'reason' => $shortfall['reason'],
            'suggestion' => $shortfall['suggested_name']
                ? 'انتقال از '.$shortfall['suggested_name']
                : null,
        ], array_slice($forecast['shortfalls'], 0, 5));

        $scenarios = Scenario::query()->orderBy('id')->get()->map(fn (Scenario $scenario): array => [
            'id' => $scenario->id,
            'name' => $scenario->name,
            'description' => $scenario->description,
            'active' => $scenario->active,
        ])->all();

        return $this->screen('native.forecast', [
            'points' => $points,
            'shortfalls' => $shortfalls,
            'goals' => $goals,
            'scenarios' => $scenarios,
            'start' => $this->amount($forecast['start_balance']),
            'end' => $this->amount($forecast['end_balance']),
            'lowest' => $this->amount($forecast['lowest_balance']),
            'lowestDate' => $forecast['lowest_point'] ? $this->dateText($forecast['lowest_point']['date'], 'long') : '—',
            'baseline' => $this->amount($forecast['baseline_monthly']),
            'baselineLow' => $this->amount($forecast['baseline_low']),
            'baselineHigh' => $this->amount($forecast['baseline_high']),
            'salary' => $this->amount($forecast['salary_monthly']),
            'payday' => $this->number($forecast['salary_payday']),
            'endOfMonth' => $this->amount($forecast['end_of_month_savings'], true),
            'endOfMonthNegative' => $forecast['end_of_month_savings'] < 0,
            'debtFree' => $forecast['debt_free'] ? $this->dateText($forecast['debt_free'], 'long') : 'بدون قسط فعال',
            'inflation' => $this->settings()->inflation_percent,
            'goalDateLabel' => $this->dateText($this->goalDate),
            'currencyLabel' => $this->settings()->currency === 'TOMAN' ? 'تومان' : 'ریال',
            'horizonLabel' => $this->number($this->horizon).' روز',
        ]);
    }
}
