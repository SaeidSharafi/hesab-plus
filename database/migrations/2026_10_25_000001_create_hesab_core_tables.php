<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('currency', 10)->default('TOMAN');
            $table->string('numerals', 10)->default('fa');
            $table->string('theme', 10)->default('system');
            $table->boolean('hide_balances')->default(false);
            $table->boolean('onboarding_done')->default(false);
            $table->unsignedSmallInteger('inflation_percent')->default(35);
            $table->unsignedBigInteger('active_person_id')->nullable();
            $table->timestamps();
        });

        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->nullable()->unique();
            $table->string('name');
            $table->string('type', 20)->default('bank');
            $table->string('bank_name')->nullable();
            $table->string('number')->nullable();
            $table->bigInteger('opening_balance')->default(0);
            $table->string('color', 10)->default('#0F766E');
            $table->string('icon', 40)->default('wallet');
            $table->boolean('include_in_net_worth')->default(true);
            $table->boolean('archived')->default(false);
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->foreignId('parent_id')->nullable()->index();
            $table->string('name');
            $table->string('kind', 10)->default('expense');
            $table->string('icon', 40)->default('category');
            $table->string('color', 10)->default('#64748B');
            $table->boolean('archived')->default(false);
            $table->timestamps();
        });

        Schema::create('people', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->text('note')->nullable();
            $table->string('avatar_color', 10)->default('#0F766E');
            $table->timestamps();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 20);
            $table->foreignId('account_id')->index();
            $table->unsignedBigInteger('to_account_id')->nullable()->index();
            $table->bigInteger('amount');
            $table->bigInteger('fee')->default(0);
            $table->string('date_jalali', 10)->index();
            $table->unsignedBigInteger('category_id')->nullable()->index();
            $table->unsignedBigInteger('person_id')->nullable()->index();
            $table->text('note')->nullable();
            $table->json('tags')->nullable();
            $table->json('splits')->nullable();
            $table->string('cash_direction', 4)->nullable();
            $table->bigInteger('loan_interest')->nullable();
            $table->string('ref_kind', 30)->nullable();
            $table->string('ref_id')->nullable();
            $table->unsignedBigInteger('installment_id')->nullable()->index();
            $table->unsignedBigInteger('cheque_id')->nullable()->index();
            $table->unsignedBigInteger('debt_id')->nullable()->index();
            $table->unsignedBigInteger('lot_id')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->string('lender');
            $table->bigInteger('principal');
            $table->string('interest_model', 30)->default('reducing_balance');
            $table->decimal('annual_rate', 6, 2)->default(0);
            $table->bigInteger('total_fee')->default(0);
            $table->unsignedSmallInteger('installment_count');
            $table->unsignedTinyInteger('frequency_months')->default(1);
            $table->string('disbursement_jalali', 10);
            $table->string('first_due_jalali', 10);
            $table->foreignId('account_id')->index();
            $table->decimal('penalty_annual_percent', 6, 2)->default(6);
            $table->string('status', 20)->default('active');
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('number');
            $table->string('due_jalali', 10)->index();
            $table->bigInteger('amount');
            $table->bigInteger('principal');
            $table->bigInteger('interest')->default(0);
            $table->bigInteger('penalty')->default(0);
            $table->string('paid_at_jalali', 10)->nullable();
            $table->unsignedBigInteger('paid_txn_id')->nullable();
            $table->string('deferred_to_jalali', 10)->nullable();
            $table->timestamps();
            $table->unique(['loan_id', 'number']);
        });

        Schema::create('debts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->constrained()->cascadeOnDelete();
            $table->string('direction', 10);
            $table->bigInteger('amount');
            $table->string('original_unit', 20)->default('toman');
            $table->decimal('quantity', 18, 4)->default(0);
            $table->bigInteger('unit_rate')->default(10);
            $table->string('date_jalali', 10);
            $table->string('due_jalali', 10)->nullable()->index();
            $table->boolean('affects_account')->default(false);
            $table->unsignedBigInteger('account_id')->nullable();
            $table->text('note')->nullable();
            $table->string('status', 20)->default('active');
            $table->json('settlements')->nullable();
            $table->string('forgiven_at_jalali', 10)->nullable();
            $table->timestamps();
        });

        Schema::create('cheques', function (Blueprint $table) {
            $table->id();
            $table->string('direction', 10);
            $table->string('number');
            $table->string('bank');
            $table->bigInteger('amount');
            $table->string('issue_jalali', 10);
            $table->string('due_jalali', 10)->index();
            $table->string('counterparty');
            $table->string('status', 20)->default('pending');
            $table->text('note')->nullable();
            $table->unsignedBigInteger('account_id')->nullable();
            $table->unsignedBigInteger('txn_id')->nullable();
            $table->timestamps();
        });

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('symbol', 30);
            $table->string('name');
            $table->string('class', 20)->default('manual');
            $table->string('unit', 20)->default('واحد');
            $table->bigInteger('current_price')->default(0);
            $table->bigInteger('previous_close')->default(0);
            $table->string('last_updated_jalali', 10);
            $table->json('price_history')->nullable();
            $table->string('source', 20)->default('manual');
            $table->timestamps();
        });

        Schema::create('lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10);
            $table->string('date_jalali', 10)->index();
            $table->decimal('quantity', 18, 4);
            $table->bigInteger('price_per_unit');
            $table->bigInteger('fee')->default(0);
            $table->unsignedBigInteger('account_id')->nullable();
            $table->unsignedBigInteger('txn_id')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('goals', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->bigInteger('target');
            $table->bigInteger('saved')->default(0);
            $table->string('target_jalali', 10);
            $table->unsignedBigInteger('account_id')->nullable();
            $table->string('icon', 40)->default('flag');
            $table->string('color', 10)->default('#0F766E');
            $table->timestamps();
        });

        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->unique()->constrained()->cascadeOnDelete();
            $table->bigInteger('amount');
            $table->boolean('rollover')->default(false);
            $table->timestamps();
        });

        Schema::create('scenarios', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type', 30)->default('gold_dca');
            $table->boolean('active')->default(false);
            $table->bigInteger('monthly_delta')->default(0);
            $table->bigInteger('one_time_delta')->default(0);
            $table->unsignedSmallInteger('start_month_offset')->default(0);
            $table->unsignedSmallInteger('duration_months')->default(12);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'scenarios', 'budgets', 'goals', 'lots', 'assets', 'cheques', 'debts',
            'installments', 'loans', 'transactions', 'people', 'categories', 'accounts', 'settings',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
