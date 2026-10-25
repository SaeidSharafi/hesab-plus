<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Installment;
use App\Models\Loan;
use App\Services\Amortization;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use App\Support\Money;
use Illuminate\View\View;
use InvalidArgumentException;

class LoanDetail extends HesabScreen
{
    public int $loanId = 0;

    public string $earlyInput = '';

    public bool $showDelete = false;

    public function mount(): void
    {
        $this->loanId = (int) $this->param('id');
        if (Loan::query()->whereKey($this->loanId)->doesntExist()) {
            $this->fail('وام پیدا نشد.');
            $this->go('/obligations');
        }
    }

    public function pay(int $installmentId): void
    {
        $installment = Installment::query()->find($installmentId);
        if ($installment === null) {
            $this->fail('قسط پیدا نشد.');

            return;
        }
        try {
            $account = Account::query()->find($installment->loan?->account_id);
            (new LedgerWriter)->payInstallment($installment, $account);
            $this->succeed('قسط پرداخت شد.');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function undo(int $installmentId): void
    {
        $installment = Installment::query()->find($installmentId);
        if ($installment === null) {
            return;
        }
        try {
            (new LedgerWriter)->undoInstallment($installment);
            $this->succeed('پرداخت قسط برگشت داده شد.');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function defer(int $installmentId): void
    {
        $installment = Installment::query()->find($installmentId);
        if ($installment === null) {
            return;
        }
        try {
            (new LedgerWriter)->deferInstallment($installment, 7);
            $this->succeed('قسط یک هفته به تعویق افتاد.');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function requestDelete(): void
    {
        $this->showDelete = true;
    }

    public function closeDelete(): void
    {
        $this->showDelete = false;
    }

    public function deleteLoan(): void
    {
        $loan = Loan::query()->find($this->loanId);
        if ($loan === null) {
            return;
        }
        (new LedgerWriter)->deleteLoan($loan);
        $this->showDelete = false;
        $this->go('/obligations');
    }

    public function render(): View
    {
        $loan = Loan::query()->with('installments')->find($this->loanId);
        if ($loan === null) {
            return $this->screen('native.loan-detail', [
                'loan' => null,
                'summary' => null,
                'rows' => [],
                'early' => null,
                'earlyInputLabel' => '',
            ]);
        }

        $summary = $this->ledger()->loanSummary($loan);
        $rows = [];
        foreach ($summary['states'] as $row) {
            $installment = $row['installment'];
            $state = $row['state'];
            $rows[] = [
                'id' => $installment->id,
                'number' => $installment->number,
                'due' => $this->dateText($state['effective_due'], 'long'),
                'due_label' => JalaliDate::fromString($state['effective_due'])?->dueLabel($this->today(), $this->settings()->numerals) ?? '—',
                'amount' => $this->amount((int) $installment->amount + $state['penalty']),
                'principal' => $this->amount((int) $installment->principal),
                'interest' => $this->amount((int) $installment->interest),
                'penalty' => $state['penalty'] > 0 ? $this->amount($state['penalty']) : null,
                'status' => $state['status'],
                'status_label' => $state['label'],
                'status_class' => match ($state['status']) {
                    'paid' => 'text-theme-success',
                    'overdue' => 'text-theme-destructive',
                    'due' => 'text-theme-accent',
                    'deferred' => 'text-theme-warning',
                    default => 'text-theme-on-surface-variant',
                },
                'paid' => $state['paid'],
                'overdue' => $state['status'] === 'overdue',
            ];
        }

        $early = null;
        $earlyInputLabel = '';
        if ($loan->interest_model === 'reducing_balance' && $summary['remaining_principal'] > 0 && $summary['remaining_count'] > 0) {
            $extra = Money::parseToRial($this->earlyInput, $this->settings()->currency);
            $firstUnpaidDue = $summary['next']['state']['effective_due'] ?? $loan->first_due_jalali;
            $result = Amortization::earlyPayoff(
                $summary['remaining_principal'],
                (float) $loan->annual_rate,
                $summary['remaining_count'],
                $extra,
                $loan->interest_model,
                $firstUnpaidDue,
            );
            if ($extra > 0) {
                $early = [
                    'saved' => $this->amount($result['interest_saved']),
                    'months' => $result['months_saved'],
                    'new_count' => $result['new_count'],
                    'payoff' => $result['new_payoff'] ? $this->dateText($result['new_payoff'], 'long') : '—',
                ];
            }
        }

        return $this->screen('native.loan-detail', [
            'loan' => $loan,
            'summary' => $summary,
            'rows' => $rows,
            'early' => $early,
            'earlyInputLabel' => $this->settings()->currency === 'TOMAN' ? 'تومان' : 'ریال',
            'progress' => min(1, $summary['progress'] / 100),
            'remainingPrincipal' => $this->amount($summary['remaining_principal']),
            'remainingAmount' => $this->amount($summary['remaining_amount']),
            'paidInterest' => $this->amount($summary['paid_interest']),
            'penalty' => $this->amount($summary['penalty']),
            'hasPenalty' => $summary['penalty'] > 0,
            'paidCount' => $summary['paid_count'],
            'totalCount' => $summary['total_count'],
            'overdueCount' => $summary['overdue_count'],
            'nextDue' => $summary['next'] ? $this->dateText($summary['next']['state']['effective_due'], 'long') : null,
            'nextLabel' => $summary['next']
                ? (JalaliDate::fromString($summary['next']['state']['effective_due'])?->dueLabel($this->today(), $this->settings()->numerals) ?? '—')
                : null,
            'payoff' => $summary['payoff'] ? $this->dateText($summary['payoff'], 'long') : null,
            'effectiveRate' => $summary['effective_rate'] !== null ? $summary['effective_rate'] * 100 : null,
            'isReducing' => $loan->interest_model === 'reducing_balance',
        ]);
    }
}
