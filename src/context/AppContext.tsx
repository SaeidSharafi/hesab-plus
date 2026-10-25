import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Account,
  Asset,
  Category,
  Cheque,
  CurrencyUnit,
  DebtEntry,
  Goal,
  InstallmentStatus,
  InvestmentLot,
  Loan,
  LoanInstallment,
  NumeralStyle,
  Person,
  Scenario,
  Transaction
} from '../types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_ASSETS,
  INITIAL_CATEGORIES,
  INITIAL_CHEQUES,
  INITIAL_DEBTS,
  INITIAL_GOALS,
  INITIAL_INSTALLMENTS,
  INITIAL_INVESTMENT_LOTS,
  INITIAL_LOANS,
  INITIAL_PEOPLE,
  INITIAL_SCENARIOS,
  INITIAL_TRANSACTIONS
} from '../data/initialData';
import { generateAmortizationSchedule } from '../utils/amortization';
import { getTodayJalali } from '../utils/jalali';

interface AppContextType {
  // Navigation & Preferences
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currencyUnit: CurrencyUnit;
  setCurrencyUnit: (unit: CurrencyUnit) => void;
  numeralStyle: NumeralStyle;
  setNumeralStyle: (style: NumeralStyle) => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (txn: Transaction | null) => void;

  // Data
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  loans: Loan[];
  installments: LoanInstallment[];
  debts: DebtEntry[];
  people: Person[];
  cheques: Cheque[];
  assets: Asset[];
  investmentLots: InvestmentLot[];
  goals: Goal[];
  scenarios: Scenario[];

  // Actions
  addTransaction: (txn: Omit<Transaction, 'id'>) => void;
  updateTransaction: (txn: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (acc: Omit<Account, 'id'>) => void;
  addLoan: (loanData: Omit<Loan, 'id'>) => void;
  payLoanInstallment: (installmentId: string, accountId: string) => void;
  snoozeInstallment: (installmentId: string, days: number) => void;
  addPerson: (p: Omit<Person, 'id'>) => Person;
  addDebtEntry: (debt: Omit<DebtEntry, 'id'>) => void;
  settleDebt: (debtId: string, amountRial: number, accountId?: string) => void;
  forgiveDebt: (debtId: string) => void;
  addCheque: (ch: Omit<Cheque, 'id'>) => void;
  updateChequeStatus: (chequeId: string, status: Cheque['status'], accountId?: string) => void;
  addInvestmentLot: (lot: Omit<InvestmentLot, 'id'>) => void;
  updateAssetPrice: (assetId: string, newPriceRial: number) => void;
  toggleScenario: (scenarioId: string) => void;
  importParmisData: (rows: any[]) => { importedCount: number };
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => boolean;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'hesab_plus_data_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currencyUnit, setCurrencyUnit] = useState<CurrencyUnit>('TOMAN');
  const [numeralStyle, setNumeralStyle] = useState<NumeralStyle>('fa');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Core Data States
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_transactions`);
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_loans`);
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [installments, setInstallments] = useState<LoanInstallment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_installments`);
    return saved ? JSON.parse(saved) : INITIAL_INSTALLMENTS;
  });

  const [debts, setDebts] = useState<DebtEntry[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_debts`);
    return saved ? JSON.parse(saved) : INITIAL_DEBTS;
  });

  const [people, setPeople] = useState<Person[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_people`);
    return saved ? JSON.parse(saved) : INITIAL_PEOPLE;
  });

  const [cheques, setCheques] = useState<Cheque[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_cheques`);
    return saved ? JSON.parse(saved) : INITIAL_CHEQUES;
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_assets`);
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [investmentLots, setInvestmentLots] = useState<InvestmentLot[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_investment_lots`);
    return saved ? JSON.parse(saved) : INITIAL_INVESTMENT_LOTS;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_goals`);
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_scenarios`);
    return saved ? JSON.parse(saved) : INITIAL_SCENARIOS;
  });

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
    localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
    localStorage.setItem(`${STORAGE_KEY}_transactions`, JSON.stringify(transactions));
    localStorage.setItem(`${STORAGE_KEY}_loans`, JSON.stringify(loans));
    localStorage.setItem(`${STORAGE_KEY}_installments`, JSON.stringify(installments));
    localStorage.setItem(`${STORAGE_KEY}_debts`, JSON.stringify(debts));
    localStorage.setItem(`${STORAGE_KEY}_people`, JSON.stringify(people));
    localStorage.setItem(`${STORAGE_KEY}_cheques`, JSON.stringify(cheques));
    localStorage.setItem(`${STORAGE_KEY}_assets`, JSON.stringify(assets));
    localStorage.setItem(`${STORAGE_KEY}_investment_lots`, JSON.stringify(investmentLots));
    localStorage.setItem(`${STORAGE_KEY}_goals`, JSON.stringify(goals));
    localStorage.setItem(`${STORAGE_KEY}_scenarios`, JSON.stringify(scenarios));
  }, [accounts, categories, transactions, loans, installments, debts, people, cheques, assets, investmentLots, goals, scenarios]);

  // Actions
  const addTransaction = (txnData: Omit<Transaction, 'id'>) => {
    const id = `txn-${Date.now()}`;
    const newTxn: Transaction = { ...txnData, id };

    // Update account balances
    setAccounts((prev) =>
      prev.map((acc) => {
        if (newTxn.kind === 'expense' && acc.id === newTxn.accountId) {
          return { ...acc, balance: acc.balance - newTxn.amount };
        }
        if (newTxn.kind === 'income' && acc.id === newTxn.accountId) {
          return { ...acc, balance: acc.balance + newTxn.amount };
        }
        if (newTxn.kind === 'transfer') {
          if (acc.id === newTxn.accountId) {
            return { ...acc, balance: acc.balance - newTxn.amount - (newTxn.fee || 0) };
          }
          if (acc.id === newTxn.toAccountId) {
            return { ...acc, balance: acc.balance + newTxn.amount };
          }
        }
        return acc;
      })
    );

    setTransactions((prev) => [newTxn, ...prev]);
  };

  const updateTransaction = (updatedTxn: Transaction) => {
    const oldTxn = transactions.find((t) => t.id === updatedTxn.id);
    if (!oldTxn) return;

    // Update account balances by reverting old effect and applying new effect
    setAccounts((prev) =>
      prev.map((acc) => {
        let bal = acc.balance;
        // Revert old transaction
        if (oldTxn.kind === 'expense' && acc.id === oldTxn.accountId) {
          bal += oldTxn.amount;
        }
        if (oldTxn.kind === 'income' && acc.id === oldTxn.accountId) {
          bal -= oldTxn.amount;
        }
        if (oldTxn.kind === 'transfer') {
          if (acc.id === oldTxn.accountId) {
            bal += oldTxn.amount + (oldTxn.fee || 0);
          }
          if (acc.id === oldTxn.toAccountId) {
            bal -= oldTxn.amount;
          }
        }

        // Apply updated transaction
        if (updatedTxn.kind === 'expense' && acc.id === updatedTxn.accountId) {
          bal -= updatedTxn.amount;
        }
        if (updatedTxn.kind === 'income' && acc.id === updatedTxn.accountId) {
          bal += updatedTxn.amount;
        }
        if (updatedTxn.kind === 'transfer') {
          if (acc.id === updatedTxn.accountId) {
            bal -= updatedTxn.amount + (updatedTxn.fee || 0);
          }
          if (acc.id === updatedTxn.toAccountId) {
            bal += updatedTxn.amount;
          }
        }

        return { ...acc, balance: bal };
      })
    );

    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTxn.id ? updatedTxn : t))
    );
  };

  const deleteTransaction = (id: string) => {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) return;

    // Revert account balances
    setAccounts((prev) =>
      prev.map((acc) => {
        if (txn.kind === 'expense' && acc.id === txn.accountId) {
          return { ...acc, balance: acc.balance + txn.amount };
        }
        if (txn.kind === 'income' && acc.id === txn.accountId) {
          return { ...acc, balance: acc.balance - txn.amount };
        }
        if (txn.kind === 'transfer') {
          if (acc.id === txn.accountId) {
            return { ...acc, balance: acc.balance + txn.amount + (txn.fee || 0) };
          }
          if (acc.id === txn.toAccountId) {
            return { ...acc, balance: acc.balance - txn.amount };
          }
        }
        return acc;
      })
    );

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const addAccount = (accData: Omit<Account, 'id'>) => {
    const id = `acc-${Date.now()}`;
    setAccounts((prev) => [...prev, { ...accData, id }]);
  };

  const addLoan = (loanData: Omit<Loan, 'id'>) => {
    const loanId = `loan-${Date.now()}`;
    const newLoan: Loan = { ...loanData, id: loanId };

    // Generate schedule
    const scheduleResult = generateAmortizationSchedule(
      loanData.principal,
      loanData.annualRatePercent,
      loanData.installmentCount,
      loanData.startDate,
      loanData.interestModel,
      loanId
    );

    const newInstallments: LoanInstallment[] = scheduleResult.schedule.map((row) => ({
      id: `inst-${loanId}-${row.installmentNumber}`,
      loanId,
      installmentNumber: row.installmentNumber,
      dueDate: new Date().toISOString(),
      jalaliDueDate: row.jalaliDueDate,
      amount: row.paymentAmount,
      principalPart: row.principalPart,
      interestPart: row.interestPart,
      status: row.installmentNumber === 1 ? 'due' : 'upcoming',
      penaltyAccrued: 0
    }));

    // Inflow principal to account
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === loanData.repaymentAccountId) {
          return { ...acc, balance: acc.balance + loanData.principal - loanData.totalFee };
        }
        return acc;
      })
    );

    setLoans((prev) => [...prev, newLoan]);
    setInstallments((prev) => [...prev, ...newInstallments]);
  };

  const payLoanInstallment = (installmentId: string, accountId: string) => {
    const inst = installments.find((i) => i.id === installmentId);
    if (!inst || inst.status === 'paid') return;

    const loan = loans.find((l) => l.id === inst.loanId);
    const todayJalali = getTodayJalali();
    const txnId = `txn-loan-${Date.now()}`;

    // Create split transaction: principal part reduces liability, interest part is expense
    const newTxn: Transaction = {
      id: txnId,
      kind: 'expense',
      accountId,
      amount: inst.amount + inst.penaltyAccrued,
      date: new Date().toISOString(),
      jalaliDate: todayJalali,
      categoryId: 'cat-loan-interest',
      note: `پرداخت قسط ${inst.installmentNumber} وام ${loan?.lender || ''}`,
      tags: ['قسط_وام', loan?.lender || 'بانک'],
      status: 'posted',
      refType: 'loan',
      refId: inst.id,
      splitItems: [
        {
          id: `split-${txnId}-1`,
          categoryId: 'cat-loan-interest',
          amount: inst.interestPart + inst.penaltyAccrued,
          note: 'سود و کارمزد قسط'
        },
        {
          id: `split-${txnId}-2`,
          categoryId: 'cat-housing', // principal repayment
          amount: inst.principalPart,
          note: 'اصل قسط بازپرداخت شده'
        }
      ]
    };

    // Deduct from account
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, balance: acc.balance - (inst.amount + inst.penaltyAccrued) } : acc))
    );

    // Update installment
    setInstallments((prev) =>
      prev.map((i) =>
        i.id === installmentId
          ? {
              ...i,
              status: 'paid',
              paidDate: todayJalali,
              paidTxnId: txnId
            }
          : i
      )
    );

    setTransactions((prev) => [newTxn, ...prev]);
  };

  const snoozeInstallment = (installmentId: string, days: number) => {
    setInstallments((prev) =>
      prev.map((i) =>
        i.id === installmentId
          ? {
              ...i,
              status: 'deferred'
            }
          : i
      )
    );
  };

  const addPerson = (pData: Omit<Person, 'id'>): Person => {
    const id = `p-${Date.now()}`;
    const newPerson: Person = { ...pData, id };
    setPeople((prev) => [...prev, newPerson]);
    return newPerson;
  };

  const addDebtEntry = (debtData: Omit<DebtEntry, 'id'>) => {
    const id = `debt-${Date.now()}`;
    const newDebt: DebtEntry = { ...debtData, id };

    // If affectsAccount is true, create matching transaction
    if (newDebt.affectsAccount && newDebt.accountId) {
      const isLent = newDebt.direction === 'lent'; // lent = money left my account
      const txnKind = isLent ? 'expense' : 'income';
      const person = people.find((p) => p.id === newDebt.personId);

      addTransaction({
        kind: txnKind,
        accountId: newDebt.accountId,
        amount: newDebt.amountRial,
        date: new Date().toISOString(),
        jalaliDate: newDebt.jalaliDate,
        categoryId: isLent ? 'cat-lifestyle' : 'cat-income-salary',
        personId: newDebt.personId,
        note: `${isLent ? 'قرض داده شده به' : 'قرض گرفته شده از'} ${person?.name || 'شخص'}: ${newDebt.note || ''}`,
        tags: [isLent ? 'طلب' : 'بدهی', person?.name || ''],
        status: 'posted',
        refType: 'debt',
        refId: id
      });
    }

    setDebts((prev) => [newDebt, ...prev]);
  };

  const settleDebt = (debtId: string, amountRial: number, accountId?: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;

    const person = people.find((p) => p.id === debt.personId);
    const todayJalali = getTodayJalali();

    if (accountId) {
      // Create settling transaction: if I lent, receiving settlement is income; if I borrowed, paying back is expense
      const kind = debt.direction === 'lent' ? 'income' : 'expense';
      addTransaction({
        kind,
        accountId,
        amount: amountRial,
        date: new Date().toISOString(),
        jalaliDate: todayJalali,
        personId: debt.personId,
        note: `تسویه ${debt.direction === 'lent' ? 'طلب از' : 'بدهی به'} ${person?.name || ''}`,
        tags: ['تسویه_حساب', person?.name || ''],
        status: 'posted',
        refType: 'debt',
        refId: debtId
      });
    }

    setDebts((prev) =>
      prev.map((d) =>
        d.id === debtId
          ? {
              ...d,
              status: 'settled',
              settledAt: todayJalali,
              settledAmountRial: amountRial
            }
          : d
      )
    );
  };

  const forgiveDebt = (debtId: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return;

    setDebts((prev) =>
      prev.map((d) =>
        d.id === debtId
          ? {
              ...d,
              status: 'forgiven',
              settledAt: getTodayJalali()
            }
          : d
      )
    );
  };

  const addCheque = (chData: Omit<Cheque, 'id'>) => {
    const id = `ch-${Date.now()}`;
    setCheques((prev) => [{ ...chData, id }, ...prev]);
  };

  const updateChequeStatus = (chequeId: string, status: Cheque['status'], accountId?: string) => {
    const ch = cheques.find((c) => c.id === chequeId);
    if (!ch) return;

    if (status === 'cashed' && accountId) {
      // Cashing a cheque creates matching transaction
      const isIssued = ch.direction === 'issued';
      addTransaction({
        kind: isIssued ? 'expense' : 'income',
        accountId,
        amount: ch.amount,
        date: new Date().toISOString(),
        jalaliDate: getTodayJalali(),
        note: `پاس شدن چک صیاد ${ch.number} (${ch.counterparty})`,
        tags: ['چک_صیاد', ch.bank],
        status: 'posted',
        refType: 'cheque',
        refId: chequeId
      });
    }

    setCheques((prev) => prev.map((c) => (c.id === chequeId ? { ...c, status } : c)));
  };

  const addInvestmentLot = (lotData: Omit<InvestmentLot, 'id'>) => {
    const id = `lot-${Date.now()}`;
    const newLot: InvestmentLot = { ...lotData, id };
    const asset = assets.find((a) => a.id === newLot.assetId);
    const totalOutflow = Math.round(newLot.quantity * newLot.pricePerUnitRial + newLot.feeRial);

    // If an account was chosen, link cash flow
    if (newLot.accountId) {
      if (newLot.type === 'buy') {
        addTransaction({
          kind: 'expense',
          accountId: newLot.accountId,
          amount: totalOutflow,
          date: new Date().toISOString(),
          jalaliDate: newLot.jalaliDate,
          categoryId: 'cat-income-investment',
          note: `خرید ${newLot.quantity} ${asset?.unit || ''} ${asset?.name || ''}`,
          tags: ['سرمایه‌گذاری', asset?.name || ''],
          status: 'posted',
          refType: 'investment',
          refId: id
        });
      } else {
        addTransaction({
          kind: 'income',
          accountId: newLot.accountId,
          amount: Math.round(newLot.quantity * newLot.pricePerUnitRial - newLot.feeRial),
          date: new Date().toISOString(),
          jalaliDate: newLot.jalaliDate,
          categoryId: 'cat-income-investment',
          note: `فروش ${newLot.quantity} ${asset?.unit || ''} ${asset?.name || ''}`,
          tags: ['سرمایه‌گذاری', 'فروش_دارایی', asset?.name || ''],
          status: 'posted',
          refType: 'investment',
          refId: id
        });
      }
    }

    setInvestmentLots((prev) => [newLot, ...prev]);
  };

  const updateAssetPrice = (assetId: string, newPriceRial: number) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? {
              ...a,
              previousClosePriceRial: a.currentPriceRial,
              currentPriceRial: newPriceRial,
              lastUpdated: `${getTodayJalali()} ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`
            }
          : a
      )
    );
  };

  const toggleScenario = (scenarioId: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, active: !s.active } : s)));
  };

  const importParmisData = (rows: any[]) => {
    let count = 0;
    const newTxns: Transaction[] = [];
    rows.forEach((row, i) => {
      const amount = parseInt(row.amount || row.mablagh || '0', 10);
      if (amount > 0) {
        newTxns.push({
          id: `parmis-${Date.now()}-${i}`,
          kind: (row.kind === 'income' || row.noa === 'درآمد') ? 'income' : 'expense',
          accountId: accounts[0]?.id || 'acc-saman',
          amount: amount * 10, // assuming input in Toman
          date: new Date().toISOString(),
          jalaliDate: row.date || getTodayJalali(),
          note: row.desc || row.tozihat || 'وارد شده از پارمیس',
          tags: ['پارمیس'],
          status: 'posted'
        });
        count++;
      }
    });

    if (newTxns.length > 0) {
      setTransactions((prev) => [...newTxns, ...prev]);
    }
    return { importedCount: count };
  };

  const exportBackupJSON = (): string => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      accounts,
      categories,
      transactions,
      loans,
      installments,
      debts,
      people,
      cheques,
      assets,
      investmentLots,
      goals,
      scenarios
    };
    return JSON.stringify(data, null, 2);
  };

  const importBackupJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.accounts) setAccounts(parsed.accounts);
      if (parsed.categories) setCategories(parsed.categories);
      if (parsed.transactions) setTransactions(parsed.transactions);
      if (parsed.loans) setLoans(parsed.loans);
      if (parsed.installments) setInstallments(parsed.installments);
      if (parsed.debts) setDebts(parsed.debts);
      if (parsed.people) setPeople(parsed.people);
      if (parsed.cheques) setCheques(parsed.cheques);
      if (parsed.assets) setAssets(parsed.assets);
      if (parsed.investmentLots) setInvestmentLots(parsed.investmentLots);
      if (parsed.goals) setGoals(parsed.goals);
      if (parsed.scenarios) setScenarios(parsed.scenarios);
      return true;
    } catch (e) {
      console.error('Backup import error', e);
      return false;
    }
  };

  const resetAllData = () => {
    localStorage.clear();
    setAccounts(INITIAL_ACCOUNTS);
    setCategories(INITIAL_CATEGORIES);
    setTransactions(INITIAL_TRANSACTIONS);
    setLoans(INITIAL_LOANS);
    setInstallments(INITIAL_INSTALLMENTS);
    setDebts(INITIAL_DEBTS);
    setPeople(INITIAL_PEOPLE);
    setCheques(INITIAL_CHEQUES);
    setAssets(INITIAL_ASSETS);
    setInvestmentLots(INITIAL_INVESTMENT_LOTS);
    setGoals(INITIAL_GOALS);
    setScenarios(INITIAL_SCENARIOS);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currencyUnit,
        setCurrencyUnit,
        numeralStyle,
        setNumeralStyle,
        isQuickAddOpen,
        setIsQuickAddOpen,
        editingTransaction,
        setEditingTransaction,
        accounts,
        categories,
        transactions,
        loans,
        installments,
        debts,
        people,
        cheques,
        assets,
        investmentLots,
        goals,
        scenarios,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addAccount,
        addLoan,
        payLoanInstallment,
        snoozeInstallment,
        addPerson,
        addDebtEntry,
        settleDebt,
        forgiveDebt,
        addCheque,
        updateChequeStatus,
        addInvestmentLot,
        updateAssetPrice,
        toggleScenario,
        importParmisData,
        exportBackupJSON,
        importBackupJSON,
        resetAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
