// src/controllers/analytics.controller.ts
import { NextFunction, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { QueueService } from '../services/queue.service';
import { AnalyticsRefreshRequest } from '../types/analytics.types';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  // GET /api/analytics/summary - Get financial summary
  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req;

      if (!user || !user.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required',
        });
      }

      const summary = await this.analyticsService.getSummary(user.companyId);

      res.json({
        success: true,
        data: summary,
        message: 'Financial summary retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/analytics/monthly - Get monthly analytics
  getMonthlyAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { user } = req;

      if (!user || !user.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required',
        });
      }

      const monthlyData = await this.analyticsService.getMonthlyAnalytics(
        user.companyId
      );

      res.json({
        success: true,
        data: monthlyData,
        message: 'Monthly analytics retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/analytics/trends - Get profit trends
  getTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req;

      if (!user || !user.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required',
        });
      }

      const trends = await this.analyticsService.getTrends(user.companyId);

      res.json({
        success: true,
        data: trends,
        message: 'Profit trends retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/analytics/distribution - Get expense/income distribution
  getDistribution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req;

      if (!user || !user.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required',
        });
      }

      const distribution = await this.analyticsService.getDistribution(
        user.companyId
      );

      res.json({
        success: true,
        data: distribution,
        message: 'Distribution analytics retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/analytics/highest - Get highest income/expense records
  getHighestRecords = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { user } = req;

      if (!user || !user.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required',
        });
      }

      const highestRecords = await this.analyticsService.getHighestRecords(
        user.companyId
      );

      res.json({
        success: true,
        data: highestRecords,
        message: 'Highest transaction records retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/analytics/overview - Get all analytics at once (dashboard view)
  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req;

      if (!user || !user.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required',
        });
      }

      // Run all analytics in parallel
      const [summary, monthlyData, trends, distribution, highestRecords] =
        await Promise.all([
          this.analyticsService.getSummary(user.companyId),
          this.analyticsService.getMonthlyAnalytics(user.companyId),
          this.analyticsService.getTrends(user.companyId),
          this.analyticsService.getDistribution(user.companyId),
          this.analyticsService.getHighestRecords(user.companyId),
        ]);

      res.json({
        success: true,
        data: {
          summary,
          monthly: monthlyData,
          trends,
          distribution,
          highest: highestRecords,
        },
        message: 'Analytics overview retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/analytics/refresh - Force analytics recalculation
  refreshAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { user } = req;
      const { type }: AnalyticsRefreshRequest = req.body;

      if (!user || !user.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required',
        });
      }

      // Queue analytics refresh job with high priority
      const jobType = type || 'all';
      await QueueService.calculateAnalytics(
        user.companyId,
        jobType,
        user.id,
        8
      );

      res.json({
        success: true,
        message: `Analytics ${jobType} refresh has been queued and will be processed shortly`,
        data: {
          companyId: user.companyId,
          type: jobType,
          status: 'queued',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/analytics/status - Check analytics cache status
  getCacheStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req;

      if (!user || !user.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required',
        });
      }

      const data = await this.analyticsService.getCacheStatus(user.companyId);
      res.json({
        success: true,
        data,
        message: 'Analytics cache status retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
