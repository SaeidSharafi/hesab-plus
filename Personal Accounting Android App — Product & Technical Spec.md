# Personal Accounting Android App — Product & Technical Spec

*Working name: **Hesab+** (placeholder). Target: Android, Persian-first (RTL, Jalali calendar, Toman/Rial), offline-first.*

## 1. Goal

Build a personal finance app that matches the everyday strengths of Parmis Mobile (fast income/expense entry, accounts, cheques, budgets, Excel/PDF reports) and then goes well beyond it in five areas Parmis handles weakly or not at all:

1. Loan tracking with reliable alarms
2. A personal debt / lending ledger (money I lent, money I borrowed, per person)
3. Granular reporting down to sub-sub-categories
4. Financial projections (cash flow and net worth)
5. Investment tracking (gold, coins, investment funds, stocks, FX, crypto)

The unifying idea: **one ledger, many lenses.** Every rial/toman movement is a transaction in one database. Loans, debts, investments and projections are structured views and schedules on top of that ledger, so reports and forecasts always agree with each other.

## 2. Research: what Parmis Mobile does today

**Source caveat.** The official Parmis product page blocks automated access, so I could not read it directly. What follows comes from the Cafe Bazaar listing text, Digiato's review, and comparison articles from Digikala Mag and others. Please open the official page and the app itself and correct anything below before treating it as ground truth.

**What it offers (per those sources):**

- Income and expense recording, with 40+ expense categories, each with an amount, budget and bank account
- Budgeting per income/expense account, with min/max limits and live over/under status
- Full cheque management (received and issued) with due dates and reminders
- Installments and loan payments in separate sections, with reminders
- A debtors/creditors concept tied to phone contacts
- Family members' income and expenses
- Reports: trial balance, expense/income totals with drill-down to each item, statement per account, account balance, charts; export to Excel and PDF
- SMS-based quick entry, backup/restore
- Jalali, Gregorian and Hijri calendars; multiple currencies
- Free, Android and iOS, about 670K installs on Cafe Bazaar

**Honest read of your gap list.** Reviews suggest Parmis *does* have basic loan/installment and debtor/creditor screens. So the gap is most likely depth, not total absence:

| Your requirement | Likely Parmis state | What this spec adds |
| --- | --- | --- |
| Loan tracking + alarms | Basic installments/loans, simple reminders | Full amortization engine, irregular schedules, early payoff, penalties, escalating alarms that survive Doze and OEM battery killers |
| Personal debt/lending | Contact-based debtors/creditors | Per-person running ledger, partial settlements, due dates, gold/FX denominated debts, shareable statements |
| Granular category reports | Account-level totals with item drill-down | Unlimited-depth category tree, tags, multi-dimension pivots, sunburst/treemap, period comparison, saved reports |
| Projections | None found | Cash-flow forecast from scheduled items plus statistical baseline, scenarios, inflation-aware net worth projection |
| Investments | None found | Lot-based portfolio for gold, coins, funds, stocks, FX, crypto with P/L, XIRR, allocation |

## 3. Design principles

- **Offline-first, local-first.** All data lives in an on-device encrypted database. No account needed. Sync is optional and later.
- **Entry in under 5 seconds.** The add-transaction flow is the most-used screen; everything else is secondary.
- **Persian-native.** RTL layout, Jalali dates everywhere (with a toggle), Persian digits, Toman/Rial switch (display-only; storage is always Rial).
- **Exact money.** Never floating point. Integer minor units; quantities (gold in milligrams, fund units) also integers.
- **Schedules are data.** Installments, recurring items, cheques and debt due dates are rows that feed reminders, reports and projections from one source.
- **Reliability over cleverness** for alarms. A missed installment reminder is a product failure.

## 4. Feature specification

### 4.1 Core ledger (parity baseline)

**Accounts.** Types: cash, bank account, card, wallet, savings deposit, loan (liability), credit/BNPL, investment (linked to Section 4.6). Each has opening balance, currency, color/icon, and an "include in net worth" flag.

**Transactions.** Three kinds: expense, income, transfer (between own accounts, with optional fee). Fields: amount, date/time (Jalali picker), account, category, tags, payee/person, note, attachments (receipt photo), location (optional). **Split transactions**: one supermarket receipt split across Groceries, Cleaning, Gifts.

**Recurring transactions.** Rules such as monthly on Jalali day 5, every 2 weeks, last day of Jalali month. Generated as *pending* entries the user confirms (or auto-posts, per rule).

**Cheques.** Received and issued: number, bank, amount, issue date, due date, payee/payer, status (pending, cashed, bounced, returned, endorsed to someone). Reminders before due date. Cashing a cheque creates the matching transaction.

**Budgets.** Monthly (Jalali month) per category or parent category, with rollover option, soft limit (warn at 80%) and hard limit (alert at 100%). Because categories form a tree, a budget on "Food" automatically includes every child.

**Search and filters.** Full-text over notes, payees and tags; filters by amount range, date range, account, category, person, tag, status.

### 4.2 Loan tracking and alarms *(requested #1)*

**What a loan is.** A liability the user repays on a schedule. Each loan record holds: lender (bank/person), principal, disbursement date and receiving account, interest model, fees, number of installments, first due date, installment frequency, and the repayment source account.

**Interest models (Iran-relevant):**

- *Reducing balance (annuity):* standard formula for equal installments. `PMT = P·r / (1 − (1+r)^−n)`, where r is the periodic rate.
- *Flat rate:* interest = P·rate·years, spread evenly (common in some Iranian bank products and BNPL).
- *Qard al-hasanah (0%):* principal only, with optional flat service fee.
- *Custom / manual schedule:* the user enters each due date and amount exactly as the bank's table shows. This matters because Iranian bank schedules often do not match any clean formula, so the app must never insist on computing them.

**Installment lifecycle.** Each installment is a row with due date, amount, principal part, interest part, and status: upcoming, due today, paid, partially paid, overdue, skipped/deferred. Marking one paid creates a transaction from the chosen account and splits it into principal (reduces liability) and interest/fees (expense).

**Loan dashboard.**

- Remaining principal, total remaining payments, total interest paid and remaining
- Next due date with countdown
- Progress bar and projected payoff date
- Effective annual rate (computed from actual cash flows, to compare loans honestly)
- **Early payoff calculator:** "pay X extra now" shows interest saved and new payoff date
- **Penalty tracker:** late-payment penalty (جریمه دیرکرد) by daily rate or fixed rule, accruing when overdue

**Alarms.** This is the headline feature, so it gets its own rules:

- Per-loan reminder policy, e.g. 7 days before, 1 day before, on the day at 09:00, then every day while overdue until marked paid or snoozed.
- Alarm tiers: normal notification, high-priority heads-up, and a full-screen intent alarm for the due day (optional, user chooses per loan).
- Notification actions: **Mark paid**, **Snooze 1 day**, **Open**.
- **Low-balance warning:** if the repayment account will not cover an installment due within N days, warn early (this uses the projection engine, Section 4.5).
- A single **Upcoming obligations** screen merges installments, cheques, debt due dates and recurring bills in one timeline.

**Reliability engineering (important on Android):**

- Schedule exact alarms with `AlarmManager.setExactAndAllowWhileIdle`. On Android 12+ this needs `SCHEDULE_EXACT_ALARM` (or `USE_EXACT_ALARM` for alarm-class apps); guide the user to grant it.
- Re-register all alarms after reboot (`BOOT_COMPLETED`), app update, timezone change, and exact-alarm permission change.
- Keep a `WorkManager` periodic worker as a safety net: it re-checks "was any reminder due and not shown?" and fires it late rather than never.
- Aggressive OEM task killers (Xiaomi/MIUI, Huawei, Oppo, Samsung sleeping apps) are the #1 cause of missed reminders. Ship an **onboarding checklist** that detects the manufacturer and deep-links to the right autostart / battery settings screen.
- Add an in-app **reminder health check**: "Notifications: OK. Exact alarms: OK. Battery optimization: exempt: NO. Tap to fix."

### 4.3 Personal debt and lending system *(requested #2)*

This is a **person-centric ledger**, separate from bank loans.

**Core model.** A *Person* (optionally linked to a phone contact) has a running balance. Each *debt entry* has a direction: **I lent** (they owe me) or **I borrowed** (I owe them). The balance per person is the signed sum of entries, so "Ali owes me 12,000,000" is always one glance.

**Capabilities:**

- **Partial settlements:** repayments reduce the balance; the history of each lend/repay remains visible.
- **Due dates and promises:** "Ali promised to pay by 15 Aban", with reminders to me, and a polite pre-written message I can send.
- **Affects accounts toggle:** lending 5M cash normally creates a transaction (money left my wallet). But sometimes the debt is non-cash ("I paid the restaurant bill for both of us") or already recorded, so the toggle controls whether an account balance changes.
- **Any unit:** a debt can be in Rial, USD, or *gold* ("I lent 2 gold coins"). The ledger keeps the original unit and shows a live Rial equivalent, with an option to settle at the original or the current value.
- **Interest (optional):** most personal loans are interest-free, so default is none.
- **Write-off / forgiveness:** close a debt as forgiven, recorded as an expense (if I lent) or income (if I borrowed).
- **Group expenses:** split a dinner among 4 friends and generate the 3 receivables automatically (equal, percentage, or custom shares).
- **Statements:** generate a per-person statement (image or PDF) and share it via Telegram, Bale, WhatsApp, SMS.
- **Evidence:** attach a photo (card-to-card receipt, signed note) to any entry.
- **Dashboard:** total I'm owed, total I owe, overdue receivables, "who to chase this week".

### 4.4 Granular category reports *(requested #3)*

**Foundation: a real category tree.** Unlimited depth (UI encourages 3 levels), e.g. *Housing → Utilities → Electricity*, *Transport → Car → Fuel / Insurance / Repairs*. Plus **tags** as a second, orthogonal dimension (e.g. `#trip-shiraz`, `#wedding`, `#tax-deductible`). Re-parenting a category re-rolls all historical reports automatically because reports are computed from the tree, not stored.

**Report engine.** One query model: **measure × group-by × filters × period**.

- *Measures:* sum, count, average, median, max, share of total
- *Group-by (any one or two):* category at any level, tag, account, person/payee, weekday, Jalali month, quarter, year
- *Filters:* all fields from the transaction search
- *Period:* any range, plus presets (this Jalali month, last 3 months, this year, fiscal year)

**Views:**

- **Drill-down tree:** tap *Transport* to see its children, tap *Car* to see *Fuel*, tap *Fuel* to see transactions. Each level shows amount, % of parent, % of total, and a trend sparkline.
- **Sunburst / treemap** for a visual "where did the money go".
- **Pivot table:** rows = sub-category, columns = Jalali months, cells = amount. Export-friendly.
- **Trend chart per sub-category:** e.g. fuel spend by month with a moving average.
- **Period comparison:** this month vs last month vs same month last year; deltas in amount and percent, highlighting the biggest movers.
- **Budget vs actual** at any tree level.
- **Top-N:** biggest payees, biggest single expenses, most frequent small spends (the "latte factor" view).
- **Uncategorized queue:** quick UI to clear unassigned transactions, with the app learning payee→category rules.

**Saved reports and export.** Save any configuration as a named report, pin it to the home screen, export to Excel/CSV/PDF, and share a chart as an image.

### 4.5 Projections *(requested #4)*

Projection is the feature that turns the app from a record into a planning tool. Two engines feed it.

**Engine A: scheduled (deterministic).** Everything with a known date and amount: loan installments, recurring income (salary), recurring bills, cheques, debt due dates, planned transactions. These are exact.

**Engine B: baseline (statistical).** Variable spending (groceries, fuel, eating out) is estimated per category from history: median of the last 3 to 6 months, optionally adjusted for Jalali-month seasonality (Nowruz, Muharram/Ramadan months, back-to-school). The forecast is shown as a **band** (p25 to p75), not one false-precise line.

**Outputs:**

- **Cash-flow forecast** per account and total, for 30/90/180/365 days: day-by-day balance with the lowest point highlighted.
- **Low-balance and shortfall alerts:** "On 12 Azar your Melli account will be 3.2M short for the installment." Suggests a transfer from another account.
- **End-of-month estimate:** projected savings this month given spending so far, shown on the home screen.
- **Net worth projection:** assets, liabilities, and investments rolled forward under stated assumptions.
- **Debt-free date:** when all loans end, and how extra payments change it.
- **Goals:** target amount + date → required monthly saving → on-track / behind indicator.
- **What-if scenarios:** toggle "take new loan", "skip the trip", "salary +20%", "add 2M/month to gold" and see the curve change without touching real data (scenarios are overlays).
- **Inflation awareness:** show projections in **nominal Toman** and in **real terms** (deflated by a user-set inflation rate, default editable) or in **gold/USD equivalent**. With persistent inflation, a flat Toman savings line is misleading; this toggle is a differentiator.

### 4.6 Investment tracking *(requested #5)*

**Asset classes:**

| Class | Examples | Unit | Price source |
| --- | --- | --- | --- |
| Physical gold | Gold bars, 18k gold (طلای ۱۸ عیار), jewelry | grams (store as mg) | Market price, manual |
| Coins | Emami, half, quarter, gram coins (سکه) | count | Market price |
| Gold funds | Gold-backed ETFs/funds | units | Exchange price / NAV |
| Investment funds (صندوق سرمایه‌گذاری) | Fixed-income, equity, mixed, gold funds | units | NAV (issue/redemption) or exchange price |
| Stocks (بورس) | Listed shares | shares | Exchange price |
| FX | USD, EUR, AED | units | Market rate |
| Crypto | BTC, USDT | units | Exchange price |
| Deposits | Fixed deposits, certificates | amount | Interest schedule |
| Manual assets | Real estate, car | 1 | User valuation, periodic |

**Model: lot-based.** Each buy creates a *lot* (date, quantity, price, fee). Sells consume lots using **FIFO** (default) or average cost (configurable). This gives correct cost basis and realized P/L even with many partial trades.

**Metrics per holding and for the portfolio:**

- Quantity, average cost, current price, current value
- Unrealized P/L and realized P/L (amount and %)
- **XIRR** (annualized return respecting the timing of each cash flow)
- Income received (fund profit payouts, dividends, deposit interest)
- Fees paid
- **Allocation** pie by class and by asset; target allocation with rebalance hints
- **Real return:** performance against gold and against USD as benchmarks, and against inflation (this answers "did my investment actually beat holding gold?")

**Valuation history.** Store a daily price snapshot per asset when a price is fetched or entered, so the portfolio value chart is accurate over time without re-deriving from today's price.

**Price providers.** A pluggable `PriceProvider` interface with three implementations:

1. **Manual entry** (always works, always the fallback)
2. **Online fetch** from public price sources for gold/coin/FX and exchange/fund data
3. **Optional self-hosted proxy** (see Section 6.3) that normalizes sources into one stable JSON API for the app

Public Iranian price sources change or restrict access without notice, so none should be a hard dependency: cache every price, show "last updated", and let the user override. **Verify each source's terms and stability before building on it.**

**Funds specifics worth modeling:** many funds have two prices (issue vs redemption/cancel NAV) and, for exchange-traded ones, a market price that can differ from NAV. Let the user choose which one values the holding, and show the NAV-vs-market premium/discount for ETFs.

**Investment ↔ ledger link.** Buying 1 coin from my bank account creates a transfer-like transaction (cash → investment account). Selling creates the reverse, and the gain flows to reports as realized income. Net worth always includes current market value.

### 4.7 Additional features recommended

Ordered by value-to-effort:

1. **Net worth dashboard.** Assets minus liabilities, trend over time, split by liquid / invested / fixed. The single best motivational screen.
2. **Multi-currency and "denominate in" view.** View all balances in Toman, USD, or grams of gold. Very relevant in a high-inflation context.
3. **Savings goals** with progress, linked to an account or to an investment.
4. **Bank SMS parsing.** Detect Iranian bank transaction SMS and propose a pre-filled transaction to confirm (never auto-post). Note: `READ_SMS` is restricted on Google Play but fine for Bazaar/Myket distribution; make it opt-in.
5. **Quick-add everywhere.** Home screen widget, persistent notification button, quick-settings tile, and a share target so sharing a card-to-card receipt image into the app opens a pre-filled entry.
6. **Import:** CSV/Excel import with column mapping, and a dedicated **Parmis export importer** so migration is painless.
7. **Encrypted backup/restore.** Local file, plus optional upload to the user's own storage (e.g., Google Drive, or your own server). Passphrase-protected, versioned.
8. **App lock.** Biometric/PIN, hide balances on the home screen, screenshot blocking option.
9. **Smart insights.** Rule-based first, not AI hype: "Fuel spending is up 34% vs your 3-month average", "You have 6 subscriptions totaling 1.8M/month", "This category is uncategorized for 12 transactions."
10. **Subscription/recurring detector** that finds repeated same-payee charges and proposes recurring rules.
11. **Envelope / sinking funds** for irregular yearly costs (car insurance, Nowruz shopping, school fees): auto-set aside 1/12 each month.
12. **Shared household (phase 2+).** Family members with permissions, shared accounts and categories. Needs sync, so it belongs after the local-first core is solid.
13. **Tax/fiscal helpers.** Tag-based yearly summaries for deductible expenses.
14. **Optional AI assist (opt-in, later).** Natural-language entry ("350 هزار تومان بنزین دیروز") parsed into a draft transaction. Must run only on explicit user action and never block normal entry.

## 5. Data model (Room / SQLite)

All money in integer Rial. Quantities in integer base units. Dates as UTC epoch plus a stored Jalali-friendly local date for grouping.

- `account(id, name, type, currency, opening_balance, include_in_net_worth, archived)`
- `category(id, parent_id, name, kind[expense|income], icon, color, sort)`
- `tag(id, name)` and `transaction_tag(txn_id, tag_id)`
- `person(id, name, phone, contact_lookup_key)`
- `txn(id, kind, account_id, to_account_id, amount, fee, date, category_id, person_id, note, status[pending|posted], source[manual|recurring|sms|loan|debt|investment], ref_id)`
- `txn_split(id, txn_id, category_id, amount, note)`
- `attachment(id, owner_type, owner_id, uri)`
- `recurring_rule(id, template_json, rrule_or_jalali_rule, next_run, auto_post)`
- `budget(id, category_id, period, amount, rollover, soft_pct)`
- `loan(id, lender, principal, interest_model, rate, fee, currency, disbursed_on, pay_account_id, status)`
- `loan_installment(id, loan_id, due_date, amount, principal_part, interest_part, status, paid_txn_id, penalty_accrued)`
- `debt_entry(id, person_id, direction, amount, unit, date, due_date, affects_account, account_id, note, settled_by_entry_id)`
- `cheque(id, direction, number, bank, amount, issue_date, due_date, counterparty, status, txn_id)`
- `asset(id, class, name, unit, price_provider, symbol, valuation_mode)`
- `investment_txn(id, asset_id, type[buy|sell|income|fee], qty, price, fee, date, account_id, txn_id)`
- `lot(id, asset_id, open_qty, cost_per_unit, opened_on, closed)` *(derived, rebuildable)*
- `price_snapshot(asset_id, date, price, source)`
- `reminder(id, owner_type, owner_id, fire_at, tier, state, snoozed_until)`
- `goal(id, name, target, target_date, linked_account_id)`
- `scenario(id, name, overlay_json)`

**Key invariant:** balances and reports are *derived* from `txn` rows. Loans, debts and investments reference transactions rather than duplicating money, so deleting or editing a payment updates every report consistently.

## 6. Architecture and tech stack

### 6.1 Android app

- **Language/UI:** Kotlin, Jetpack Compose, Material 3. Compose handles RTL well; set `layoutDirection` from locale and test every screen in RTL.
- **Architecture:** single-activity, MVVM/MVI, unidirectional data flow, feature modules (`core`, `ledger`, `loans`, `debts`, `reports`, `projections`, `investments`, `settings`) with a domain layer of pure Kotlin use-cases that is unit-testable without Android.
- **DI:** Hilt. **Async:** Coroutines + Flow.
- **DB:** Room on SQLite; encryption via SQLCipher (or app-level encrypted backup if you prefer to avoid the dependency). Use Room migrations from day one, never destructive migration.
- **Background:** WorkManager (periodic checks, price refresh), AlarmManager (exact reminders), a boot receiver.
- **Dates:** `android.icu.util.PersianCalendar` (ICU, available from API 24) for Jalali logic, wrapped in a small `JalaliDate` value class so UI and domain never touch ICU directly. Write thorough tests around month lengths and leap years.
- **Money:** a `Money` value class over `Long` (Rial) with display-time Toman/Rial formatting and Persian digits.
- **Charts:** Vico (Compose-native) or MPAndroidChart; sunburst/treemap likely needs a small custom Canvas implementation.
- **Min SDK:** 24 (Android 7.0), which covers the vast majority of devices in this market.
- **Distribution:** Cafe Bazaar, Myket, direct APK; Google Play if sanctions/payment realities allow. SMS permission is only viable outside Play.

### 6.2 Quality

- Unit tests for: amortization math, FIFO lots, XIRR, projection engine, Jalali recurrence.
- Golden-file tests: a fixed sample dataset must always produce the same report numbers.
- Instrumented tests for alarm scheduling and reboot recovery (use test shims for `AlarmManager`).
- Property-based tests for money: sum of splits = parent amount, transfers net to zero.

### 6.3 Optional backend (later, your home turf)

Since you run Laravel infrastructure, a thin optional sync/price service fits naturally:

- **Price proxy:** a Laravel service that scrapes/aggregates gold, coin, FX, and fund prices, normalizes them, caches them, and serves one stable endpoint. Isolates the app from source breakage; you fix the scraper server-side without shipping an app update.
- **Encrypted sync:** end-to-end encrypted blob sync (server cannot read data), with last-write-wins per row plus a change log. Defer until the local app is solid; sync is where personal finance apps get hard.

## 7. Security and privacy

- Financial data never leaves the device unless the user enables backup or sync.
- Database encrypted at rest; app lock with biometrics; `FLAG_SECURE` option; no analytics SDKs that see amounts.
- Backups encrypted with a user passphrase (Argon2/PBKDF2 key derivation + AES-GCM). Show a clear warning that a lost passphrase cannot be recovered.
- Explicit, granular permission requests (notifications, exact alarms, contacts, SMS) each with a plain-language reason and a working app if denied.

## 8. Roadmap

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| **0. Foundations** | Project setup, design system (RTL, Jalali, Money), Room schema + migrations, backup skeleton | Can create accounts and categories; Jalali and money tests green |
| **1. Core ledger (MVP)** | Accounts, transactions, transfers, splits, category tree, tags, search, budgets, basic reports, recurring | Daily use possible; entry under 5 seconds |
| **2. Obligations** | Loans + installments + alarms, cheques, personal debt ledger, Upcoming timeline, reminder health check | Reminders fire correctly after reboot on 3+ OEM devices |
| **3. Reports** | Report engine, drill-down, pivot, sunburst/treemap, comparisons, saved reports, Excel/PDF export | Any sub-category answerable in 3 taps |
| **4. Investments** | Assets, lots, price providers, P/L, XIRR, allocation, valuation history | Portfolio value matches manual spreadsheet check |
| **5. Projections** | Scheduled + baseline engines, cash-flow forecast, shortfall alerts, goals, scenarios, real-terms view | Forecast within a sensible band on 6 months of back-tested data |
| **6. Polish and growth** | Net worth dashboard, SMS parsing, widgets, importers (Parmis/CSV), insights, optional sync | Beta with real users |

**Suggested build order rationale.** Obligations (Phase 2) comes before reports because loans and debts are your top pain points and they generate the scheduled data that projections (Phase 5) later need. Investments precede projections so the net-worth projection has real inputs.

## 9. Agent-ready implementation prompts

Use these with a coding agent (OpenCode, Claude Code, etc.). Give the agent this document as context, run one phase at a time, and require tests before moving on.

### 9.1 Master context prompt

```
You are building an offline-first Android personal-accounting app in Kotlin with Jetpack Compose (Material 3), Room, Hilt, Coroutines/Flow, WorkManager.
Hard constraints:
- Persian-first: full RTL, Jalali calendar (android.icu.util.PersianCalendar wrapped in a JalaliDate value class), Persian digits, Toman/Rial display toggle. Storage is always integer Rial.
- Money is never floating point: use a Money value class over Long. Quantities are integer base units (gold in milligrams).
- Balances and reports are DERIVED from the txn table. Loans, debts and investments reference transactions; they never duplicate money.
- Domain layer is pure Kotlin and unit-tested; no Android imports in domain.
- Room migrations from day one; no destructive migration.
- minSdk 24. No network calls except the optional price provider.
Work in small, reviewable commits. After each task: run unit tests, list what changed, list open questions. Do not start the next task until tests pass.
```

### 9.2 Phase 0: Foundations

```
Task: Scaffold the multi-module project (core, ledger, loans, debts, reports, projections, investments, settings).
Deliver: Money value class + formatter (Rial/Toman, Persian digits); JalaliDate wrapper with add/subtract months, month length, leap-year, weekday, formatting; Room schema v1 for account, category, tag, txn, txn_split, attachment; Compose theme with RTL.
Acceptance: unit tests for Jalali month boundaries/leap years (incl. 1403 and 1408 boundary cases), Money arithmetic and rounding, schema migration test harness in place.
```

### 9.3 Phase 2: Loans and alarms

```
Task: Implement loans with installments and reliable reminders.
Deliver: amortization engine supporting reducing-balance, flat-rate, 0% and fully manual schedules; installment status lifecycle; mark-paid creates a split transaction (principal vs interest/fee); early-payoff calculator; penalty accrual.
Alarms: AlarmManager.setExactAndAllowWhileIdle scheduler with tiered reminders (before / on-day / repeating overdue); notification actions (Mark paid, Snooze 1 day); boot/timezone/app-update/permission-change re-registration; WorkManager catch-up worker; reminder health-check screen with OEM-specific battery-setting deep links.
Acceptance: golden tests for PMT and flat-rate schedules; instrumented test that alarms are re-registered after simulated reboot; overdue reminders repeat until acknowledged.
```

### 9.4 Phase 2: Personal debts

```
Task: Implement the person-centric debt ledger.
Deliver: Person (optionally linked to Contacts), debt_entry with direction (lent/borrowed), partial settlements, due dates + reminders, affects-account toggle, units (Rial/USD/gold) with live Rial equivalent, write-off, group-split generator, per-person statement export as image/PDF with share intent.
Acceptance: per-person balance equals signed sum of entries; settlements never exceed outstanding without explicit confirmation; write-off posts the correct income/expense.
```

### 9.5 Phase 3: Reports

```
Task: Build the report engine and views.
Deliver: query model (measure x group-by x filters x period) executed in SQL; category-tree rollups; drill-down tree, sunburst/treemap, pivot (sub-category x Jalali month), trend per sub-category, period comparison, top-N, budget-vs-actual at any tree level; saved reports; Excel/CSV/PDF export.
Acceptance: parent total always equals sum of children + direct entries; re-parenting a category updates historical reports; golden dataset produces fixed expected numbers.
```

### 9.6 Phase 4: Investments

```
Task: Implement lot-based portfolio tracking.
Deliver: asset classes (gold, coin, fund, stock, FX, crypto, deposit, manual); buy/sell/income/fee transactions; FIFO and average-cost modes; realized/unrealized P/L; XIRR; allocation; price_snapshot history; PriceProvider interface with Manual and Remote implementations (remote disabled by default, cached, shows last-updated).
Acceptance: FIFO cost basis tests with partial sells; XIRR matches reference values within 0.01%; portfolio value history uses stored snapshots, not today's price.
```

### 9.7 Phase 5: Projections

```
Task: Implement the forecast engines.
Deliver: scheduled engine (installments, recurring, cheques, debt due dates); baseline engine (per-category median of last 3-6 Jalali months with optional seasonality, p25-p75 band); cash-flow forecast per account; shortfall alerts; end-of-month estimate; debt-free date; goals; scenario overlays that never mutate real data; real-terms view using a user-set inflation rate.
Acceptance: back-test against 6 months of historical data and report forecast error; scenarios are fully reversible; alerts fire only when shortfall is within the configured horizon.
```

## 10. Open questions to settle before building

1. **Distribution:** Bazaar/Myket only, or Google Play too? This decides whether SMS parsing is allowed.
2. **Sync:** Is single-device enough for v1, or do you need phone + tablet / spouse access early?
3. **Price sources:** Which gold/coin/fund/stock sources do you trust, and are you willing to run the Laravel price proxy?
4. **Currency display default:** Toman or Rial? And should USD/gold denominated views be in v1?
5. **Personal or public product?** If you plan to publish it, add onboarding, localization strings, support channel, and privacy policy to the scope.
6. **Parmis migration:** Do you have a Parmis export file so I can define the importer format precisely?
