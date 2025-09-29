export interface AnalyticsSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  transactionCount: number;
  currentMonth: {
    income: number;
    expenses: number;
    profit: number;
  };
  calculatedAt: Date;
}

export interface MonthlyAnalytics {
  month: string;
  income: number;
  expenses: number;
  profit: number;
  transactionCount: number;
  profitMargin: number;
}

export interface AnalyticsTrends {
  month: string;
  income: number;
  expenses: number;
  incomeCount: number;
  expenseCount: number;
  growthRate: number;
}

export interface AnalyticsDistribution {
  byDepartment: {
    department: string;
    income: number;
    expenses: number;
    count: number;
  }[];
  byAction: {
    action: string;
    income: number;
    expenses: number;
    count: number;
  }[];
  monthlyComparison: {
    current: {
      month: string;
      income: number;
      expenses: number;
      profit: number;
    };
    previous: {
      month: string;
      income: number;
      expenses: number;
      profit: number;
    };
    changes: {
      income: number;
      expenses: number;
      profit: number;
    };
  };
}

export interface HighestTransactionRecord {
  id: string;
  name: string;
  amount: number;
  date: Date;
  department: string;
  action: string;
}



export interface AnalyticsRefreshRequest {
  type?: 'summary' | 'monthly' | 'trends' | 'distribution' | 'highest';
}

export interface AnalyticsCacheData {
  type: string;
  data: unknown;
  cachedAt: Date;
}
