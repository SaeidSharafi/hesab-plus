<?php

namespace App\NativeComponents;

use App\Models\Account;
use App\Models\Cheque;
use App\Models\Loan;
use App\Models\Person;
use App\Services\LedgerWriter;
use App\Support\HesabScreen;
use App\Support\JalaliDate;
use Illuminate\View\View;
use InvalidArgumentException;

class Obligations extends HesabScreen
{
    public string $tab = 'loans';

    public ?int $deletingChequeId = null;

    public function mount(): void
    {
        $tab = (string) $this->data('tab', 'loans');
        if (in_array($tab, ['loans', 'cheques', 'people'], true)) {
            $this->tab = $tab;
        }
    }

    public function setTab(string $tab): void
    {
        if (in_array($tab, ['loans', 'cheques', 'people'], true)) {
            $this->tab = $tab;
        }
    }

    public function createLoan(): void
    {
        $this->go('/loans/new');
    }

    public function openLoan(int $id): void
    {
        $this->go("/loans/{$id}");
    }

    public function createCheque(): void
    {
        $this->go('/cheques/new');
    }

    public function createDebt(): void
    {
        $this->go('/debts/new');
    }

    public function openPerson(int $id): void
    {
        $this->go("/people/{$id}");
    }

    public function settleCheque(int $id): void
    {
        $cheque = Cheque::query()->find($id);
        if ($cheque === null) {
            $this->fail('چک پیدا نشد.');

            return;
        }
        try {
            $account = Account::query()->find($cheque->account_id) ?? Account::query()->first();
            (new LedgerWriter)->settleCheque($cheque, $account);
            $this->succeed('وضعیت چک ثبت شد.');
        } catch (InvalidArgumentException $exception) {
            $this->fail($exception->getMessage());
        }
    }

    public function undoCheque(int $id): void
    {
        $cheque = Cheque::query()->find($id);
        if ($cheque === null) {
            return;
        }
        (new LedgerWriter)->undoCheque($cheque);
    }

    public function requestDeleteCheque(int $id): void
    {
        $this->deletingChequeId = $id;
    }

    public function closeDeleteCheque(): void
    {
        $this->deletingChequeId = null;
    }

    public function deleteCheque(): void
    {
        if ($this->deletingChequeId === null) {
            return;
        }
        $cheque = Cheque::query()->find($this->deletingChequeId);
        if ($cheque !== null) {
            (new LedgerWriter)->deleteCheque($cheque);
        }
        $this->deletingChequeId = null;
    }

    public function render(): View
    {
        $ledger = $this->ledger();
        $accountNames = Account::query()->pluck('name', 'id');

        $loans = Loan::query()
            ->with('installments')
            ->orderByDesc('id')
            ->get()
            ->map(function (Loan $loan) use ($ledger): array {
                $summary = $ledger->loanSummary($loan);
                $next = $summary['next'];
                $nextDue = $next['state']['effective_due'] ?? null;

                return [
                    'id' => $loan->id,
                    'lender' => $loan->lender,
                    'remaining' => $this->amount($summary['remaining_principal']),
                    'progress' => min(1, $summary['progress'] / 100),
                    'paid' => $summary['paid_count'],
                    'total' => $summary['total_count'],
                    'overdue' => $summary['overdue_count'],
                    'next' => $nextDue ? $this->dateText($nextDue, 'short') : '—',
                    'next_label' => $nextDue ? $this->dateText($nextDue, 'short') : 'پایان یافته',
                    'installment' => $next ? $this->amount((int) $next['installment']->amount) : '—',
                ];
            })
            ->all();

        $cheques = Cheque::query()
            ->orderBy('due_jalali')
            ->get()
            ->map(fn (Cheque $cheque): array => [
                'id' => $cheque->id,
                'title' => 'چک '.($cheque->direction === 'issued' ? 'پرداختی به ' : 'دریافتی از ').$cheque->counterparty,
                'bank' => $cheque->bank.' · '.$cheque->number,
                'amount' => $this->amount((int) $cheque->amount),
                'due' => $this->dateText($cheque->due_jalali),
                'due_label' => JalaliDate::fromString($cheque->due_jalali)?->dueLabel($this->today(), $this->settings()->numerals) ?? '—',
                'status' => $cheque->status,
                'status_label' => $this->chequeStatusLabel($cheque->status),
                'pending' => $cheque->status === 'pending',
                'cashed' => $cheque->status === 'cashed',
                'direction' => $cheque->direction,
                'account' => $accountNames[$cheque->account_id] ?? null,
            ])
            ->all();

        $people = Person::query()
            ->with('debts')
            ->orderBy('name')
            ->get()
            ->map(function (Person $person) use ($ledger): array {
                $summary = $ledger->personSummary($person);

                return [
                    'id' => $person->id,
                    'name' => $person->name,
                    'color' => $person->avatar_color,
                    'initial' => mb_substr($person->name, 0, 1),
                    'balance' => $this->amount($summary['balance'], true),
                    'balance_class' => $summary['balance'] > 0
                        ? 'text-theme-success'
                        : ($summary['balance'] < 0 ? 'text-theme-destructive' : 'text-theme-on-surface-variant'),
                    'subtitle' => $summary['overdue'] > 0
                        ? $summary['overdue'].' مورد معوق'
                        : ($summary['active'] > 0 ? $summary['active'].' مورد فعال' : 'بدون بدهی فعال'),
                    'overdue' => $summary['overdue'],
                ];
            })
            ->all();

        $chequeSummary = $ledger->chequeSummary();
        $loanTotals = $ledger->loanTotals();

        return $this->screen('native.obligations', [
            'loans' => $loans,
            'cheques' => $cheques,
            'people' => $people,
            'chequeSummary' => $chequeSummary,
            'loanTotals' => $loanTotals,
            'dueCount' => count($ledger->obligations(30)),
            'deletingCheque' => $this->deletingChequeId,
            'loanTotalLabel' => $this->amount($loanTotals['remaining_principal']),
            'issuedLabel' => $this->amount($chequeSummary['issued_pending']),
            'receivedLabel' => $this->amount($chequeSummary['received_pending']),
        ]);
    }

    private function chequeStatusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'در انتظار سررسید',
            'cashed' => 'وصول / پاس شده',
            'bounced' => 'برگشتی',
            'returned' => 'عودت داده شده',
            'canceled' => 'لغو شده',
            default => $status,
        };
    }
}
