import { format, startOfMonth, subMonths } from 'date-fns';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Company } from '../models/Company';
import { Transaction } from '../models/Transaction';
import {
  AnalyticsDistribution,
  AnalyticsSummary,
  AnalyticsTrends,
  HighestTransactionRecord,
  MonthlyAnalytics,
  TransactionType,
} from '../types';
import { CACHE_CONFIG } from '../utils/constant';
import { NotFoundError } from '../utils/error';
import { CacheService } from './cache.service';

export class AnalyticsService {
  private transactionRepo: Repository<Transaction>;
  private companyRepo: Repository<Company>;

  constructor() {
    this.transactionRepo = AppDataSource.getRepository(Transaction);
    this.companyRepo = AppDataSource.getRepository(Company);
  }

  private generateCacheKey(companyId: string, type: string): string {
    return `analytics:${companyId}:${type}`;
  }

  private async invalidateAnalyticsCache(companyId: string): Promise<void> {
    await CacheService.invalidateAnalytics(companyId);
  }

  async validateCompanyAccess(companyId: string): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  }

  async getSummary(companyId: string): Promise<AnalyticsSummary> {
    await this.validateCompanyAccess(companyId);

    const cacheKey = this.generateCacheKey(companyId, 'summary');

    return CacheService.withCache(
      cacheKey,
      async () => {
        return this.calculateSummary(companyId);
      },
      true,
      CACHE_CONFIG.analytics || 1800 // 30 minutes default
    );
  }

  async getMonthlyAnalytics(companyId: string): Promise<MonthlyAnalytics[]> {
    await this.validateCompanyAccess(companyId);

    const cacheKey = this.generateCacheKey(companyId, 'monthly');

    return CacheService.withCache(
      cacheKey,
      async () => {
        return this.calculateMonthlyData(companyId);
      },
      true,
      CACHE_CONFIG.analytics || 1800
    );
  }

  async getTrends(companyId: string): Promise<AnalyticsTrends[]> {
    await this.validateCompanyAccess(companyId);

    const cacheKey = this.generateCacheKey(companyId, 'trends');

    return CacheService.withCache(
      cacheKey,
      async () => {
        return this.calculateTrends(companyId);
      },
      true,
      CACHE_CONFIG.analytics || 1800
    );
  }

  async getDistribution(companyId: string): Promise<AnalyticsDistribution> {
    await this.validateCompanyAccess(companyId);

    const cacheKey = this.generateCacheKey(companyId, 'distribution');

    return CacheService.withCache(
      cacheKey,
      async () => {
        return this.calculateDistribution(companyId);
      },
      true,
      CACHE_CONFIG.analytics || 1800
    );
  }

  async getHighestRecords(companyId: string): Promise<{
    highestIncome: HighestTransactionRecord[];
    highestExpense: HighestTransactionRecord[];
  }> {
    await this.validateCompanyAccess(companyId);

    const cacheKey = this.generateCacheKey(companyId, 'highest');

    return CacheService.withCache(
      cacheKey,
      async () => {
        return this.calculateHighestRecords(companyId);
      },
      true,
      CACHE_CONFIG.analytics || 1800
    );
  }

  async getCacheStatus(companyId: string) {
    const cacheStatus = await CacheService.getAnalyticsCacheStatus(companyId);

    return {
      companyId: companyId,
      cacheStatus: Object.values(cacheStatus).some((s) => s.exists)
        ? 'active'
        : 'inactive',
      lastRefresh: new Date(),
      availableTypes: Object.keys(cacheStatus).filter(
        (k) => cacheStatus[k].exists === true
      ),
    };
  }

  // Core calculation methods
  async calculateSummary(companyId: string): Promise<AnalyticsSummary> {
    const [income, expenses, transactionCount, currentMonthData] =
      await Promise.all([
        this.transactionRepo
          .createQueryBuilder('t')
          .select('SUM(t.amount)', 'total')
          .where('t.companyId = :companyId AND t.type = :type', {
            companyId,
            type: TransactionType.INCOME,
          })
          .getRawOne(),
        this.transactionRepo
          .createQueryBuilder('t')
          .select('SUM(t.amount)', 'total')
          .where('t.companyId = :companyId AND t.type = :type', {
            companyId,
            type: TransactionType.EXPENSE,
          })
          .getRawOne(),
        this.transactionRepo.count({ where: { companyId } }),
        this.getCurrentMonthData(companyId),
      ]);

    const totalIncome = parseFloat(income.total) || 0;
    const totalExpenses = parseFloat(expenses.total) || 0;
    const netProfit = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
      transactionCount,
      currentMonth: currentMonthData,
      calculatedAt: new Date(),
    };
  }

  async calculateMonthlyData(companyId: string): Promise<MonthlyAnalytics[]> {
    const monthlyData = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        "TO_CHAR(t.transactionDate, 'YYYY-MM') as month",
        "SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income",
        "SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses",
        'COUNT(*) as transactionCount',
      ])
      .where('t.companyId = :companyId', { companyId })
      .groupBy('month')
      .orderBy('month', 'DESC')
      .limit(12) // Last 12 months
      .getRawMany();

    return monthlyData.map(
      (item: {
        income: string;
        expenses: string;
        month: string;
        transactionCount: string;
      }) => {
        const income = parseFloat(item.income) || 0;
        const expenses = parseFloat(item.expenses) || 0;
        const profit = income - expenses;

        return {
          month: item.month,
          income,
          expenses,
          profit,
          transactionCount: parseInt(item.transactionCount) || 0,
          profitMargin: income > 0 ? (profit / income) * 100 : 0,
        };
      }
    );
  }

  async calculateTrends(companyId: string): Promise<AnalyticsTrends[]> {
    const sixMonthsAgo = subMonths(new Date(), 6);

    const trendsData = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        "TO_CHAR(t.transactionDate, 'YYYY-MM') as month",
        'SUM(t.amount) as total',
        't.type as type',
        'COUNT(*) as count',
      ])
      .where(
        't.companyId = :companyId AND t.transactionDate >= :sixMonthsAgo',
        { companyId, sixMonthsAgo }
      )
      .groupBy('month, t.type')
      .orderBy('month', 'DESC')
      .getRawMany();

    // Group by month and organize by type
    const monthlyTrends: { [key: string]: AnalyticsTrends } = {};

    trendsData.forEach((item: any) => {
      const month = item.month;
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          month,
          income: 0,
          expenses: 0,
          incomeCount: 0,
          expenseCount: 0,
          growthRate: 0,
        };
      }

      if (item.type === TransactionType.INCOME) {
        monthlyTrends[month].income = parseFloat(item.total) || 0;
        monthlyTrends[month].incomeCount = parseInt(item.count) || 0;
      } else {
        monthlyTrends[month].expenses = parseFloat(item.total) || 0;
        monthlyTrends[month].expenseCount = parseInt(item.count) || 0;
      }
    });

    // Calculate growth rates
    const trends = Object.values(monthlyTrends).sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    for (let i = 0; i < trends.length - 1; i++) {
      const current = trends[i];
      const previous = trends[i + 1];

      if (previous.income > 0) {
        current.growthRate =
          ((current.income - previous.income) / previous.income) * 100;
      }
    }

    return trends;
  }

  async calculateDistribution(
    companyId: string
  ): Promise<AnalyticsDistribution> {
    const [departmentData, actionData, monthlyDistribution] = await Promise.all(
      [
        // Distribution by department
        this.transactionRepo
          .createQueryBuilder('t')
          .select([
            "COALESCE(t.department, 'Unspecified') as department",
            "SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income",
            "SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses",
            'COUNT(*) as count',
          ])
          .where('t.companyId = :companyId', { companyId })
          .groupBy('department')
          .getRawMany(),

        // Distribution by action
        this.transactionRepo
          .createQueryBuilder('t')
          .select([
            "COALESCE(t.action, 'Unspecified') as action",
            'SUM(t.amount) as total',
            't.type as type',
            'COUNT(*) as count',
          ])
          .where('t.companyId = :companyId', { companyId })
          .groupBy('action, t.type')
          .getRawMany(),

        // Current month vs previous month
        this.getMonthlyComparison(companyId),
      ]
    );

    return {
      byDepartment: departmentData.map((item: any) => ({
        department: item.department,
        income: parseFloat(item.income) || 0,
        expenses: parseFloat(item.expenses) || 0,
        count: parseInt(item.count) || 0,
      })),
      byAction: this.processActionData(actionData),
      monthlyComparison: monthlyDistribution,
    };
  }

  async calculateHighestRecords(companyId: string): Promise<{
    highestIncome: HighestTransactionRecord[];
    highestExpense: HighestTransactionRecord[];
  }> {
    const [highestIncome, highestExpense] = await Promise.all([
      this.transactionRepo.find({
        where: { companyId, type: TransactionType.INCOME },
        order: { amount: 'DESC' },
        take: 10,
        select: [
          'id',
          'name',
          'amount',
          'transactionDate',
          'department',
          'action',
        ],
      }),
      this.transactionRepo.find({
        where: { companyId, type: TransactionType.EXPENSE },
        order: { amount: 'DESC' },
        take: 10,
        select: [
          'id',
          'name',
          'amount',
          'transactionDate',
          'department',
          'action',
        ],
      }),
    ]);

    return {
      highestIncome: highestIncome.map((t) => ({
        id: t.id,
        name: t.name,
        amount: t.amount,
        date: t.transactionDate,
        department: t.department || 'Unspecified',
        action: t.action || 'Unspecified',
      })),
      highestExpense: highestExpense.map((t) => ({
        id: t.id,
        name: t.name,
        amount: t.amount,
        date: t.transactionDate,
        department: t.department || 'Unspecified',
        action: t.action || 'Unspecified',
      })),
    };
  }

  // Helper methods
  private async getCurrentMonthData(companyId: string) {
    const currentMonth = format(new Date(), 'yyyy-MM');

    const [income, expenses] = await Promise.all([
      this.transactionRepo
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where(
          "t.companyId = :companyId AND t.type = :type AND TO_CHAR(t.transactionDate, 'YYYY-MM') = :month",
          { companyId, type: TransactionType.INCOME, month: currentMonth }
        )
        .getRawOne(),
      this.transactionRepo
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where(
          "t.companyId = :companyId AND t.type = :type AND TO_CHAR(t.transactionDate, 'YYYY-MM') = :month",
          { companyId, type: TransactionType.EXPENSE, month: currentMonth }
        )
        .getRawOne(),
    ]);

    const monthlyIncome = parseFloat(income.total) || 0;
    const monthlyExpenses = parseFloat(expenses.total) || 0;

    return {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      profit: monthlyIncome - monthlyExpenses,
    };
  }

  private async getMonthlyComparison(companyId: string) {
    const currentDate = new Date();
    const currentMonth = format(currentDate, 'yyyy-MM');
    const previousMonth = format(
      startOfMonth(subMonths(currentDate, 1)),
      'yyyy-MM'
    );

    const [current, previous] = await Promise.all([
      this.getMonthData(companyId, currentMonth),
      this.getMonthData(companyId, previousMonth),
    ]);

    return {
      current: {
        month: currentMonth,
        ...current,
      },
      previous: {
        month: previousMonth,
        ...previous,
      },
      changes: {
        income:
          previous.income > 0
            ? ((current.income - previous.income) / previous.income) * 100
            : 0,
        expenses:
          previous.expenses > 0
            ? ((current.expenses - previous.expenses) / previous.expenses) * 100
            : 0,
        profit:
          previous.profit !== 0
            ? ((current.profit - previous.profit) / Math.abs(previous.profit)) *
              100
            : 0,
      },
    };
  }

  private async getMonthData(companyId: string, month: string) {
    const [income, expenses] = await Promise.all([
      this.transactionRepo
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where(
          "t.companyId = :companyId AND t.type = :type AND TO_CHAR(t.transactionDate, 'YYYY-MM') = :month",
          { companyId, type: TransactionType.INCOME, month }
        )
        .getRawOne(),
      this.transactionRepo
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where(
          "t.companyId = :companyId AND t.type = :type AND TO_CHAR(t.transactionDate, 'YYYY-MM') = :month",
          { companyId, type: TransactionType.EXPENSE, month }
        )
        .getRawOne(),
    ]);

    const monthlyIncome = parseFloat(income.total) || 0;
    const monthlyExpenses = parseFloat(expenses.total) || 0;

    return {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      profit: monthlyIncome - monthlyExpenses,
    };
  }

  private processActionData(actionData: any[]) {
    const actionMap: {
      [key: string]: { income: number; expenses: number; count: number };
    } = {};

    actionData.forEach((item: any) => {
      const action = item.action;
      if (!actionMap[action]) {
        actionMap[action] = { income: 0, expenses: 0, count: 0 };
      }

      const amount = parseFloat(item.total) || 0;
      const count = parseInt(item.count) || 0;

      if (item.type === TransactionType.INCOME) {
        actionMap[action].income += amount;
      } else {
        actionMap[action].expenses += amount;
      }
      actionMap[action].count += count;
    });

    return Object.entries(actionMap).map(([action, data]) => ({
      action,
      ...data,
    }));
  }

  // Background refresh methods for worker
  async refreshAnalytics(companyId: string, type?: string): Promise<void> {
    await this.validateCompanyAccess(companyId);

    if (type) {
      // Refresh specific analytics type
      await this.invalidateAnalyticsCache(companyId);

      switch (type) {
        case 'summary':
          await this.getSummary(companyId);
          break;
        case 'monthly':
          await this.getMonthlyAnalytics(companyId);
          break;
        case 'trends':
          await this.getTrends(companyId);
          break;
        case 'distribution':
          await this.getDistribution(companyId);
          break;
        case 'highest':
          await this.getHighestRecords(companyId);
          break;
      }
    } else {
      // Refresh all analytics
      await this.invalidateAnalyticsCache(companyId);
      await Promise.all([
        this.getSummary(companyId),
        this.getMonthlyAnalytics(companyId),
        this.getTrends(companyId),
        this.getDistribution(companyId),
        this.getHighestRecords(companyId),
      ]);
    }
  }

  
}
