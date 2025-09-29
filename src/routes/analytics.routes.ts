import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import {
  authenticate,
  requireFullAuthenticate,
} from '../middleware/auth.middleware';
import {
  analyticsRateLimit,
  generalRateLimit,
} from '../middleware/rateLimiter.middleware';
import { authorize, requireAnyRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ROLE_ENUM } from '../types';
import { analyticsRefreshSchema } from '../validations/analytics.validation';

const router = Router();
const analyticsController = new AnalyticsController();

// Bind controller methods to preserve 'this'
analyticsController.getSummary =
  analyticsController.getSummary.bind(analyticsController);
analyticsController.getMonthlyAnalytics =
  analyticsController.getMonthlyAnalytics.bind(analyticsController);
analyticsController.getTrends =
  analyticsController.getTrends.bind(analyticsController);
analyticsController.getDistribution =
  analyticsController.getDistribution.bind(analyticsController);
analyticsController.getHighestRecords =
  analyticsController.getHighestRecords.bind(analyticsController);
analyticsController.getOverview =
  analyticsController.getOverview.bind(analyticsController);
analyticsController.refreshAnalytics =
  analyticsController.refreshAnalytics.bind(analyticsController);
analyticsController.getCacheStatus =
  analyticsController.getCacheStatus.bind(analyticsController);

// Apply authentication to all routes
router.use(authenticate);
router.use(requireFullAuthenticate);

/**
 * @route   GET /api/analytics/summary
 * @desc    Get financial summary (total income, expenses, net profit)
 * @access  Private (Manager, Admin, Super Admin)
 * @cache   30 minutes
 */
router.get(
  '/summary',

  authorize('analytics', 'read'),
  analyticsRateLimit,
  analyticsController.getSummary
);

/**
 * @route   GET /api/analytics/monthly
 * @desc    Get monthly income/expense chart data
 * @access  Private (Manager, Admin, Super Admin)
 * @cache   30 minutes
 */
router.get(
  '/monthly',

  authorize('analytics', 'read'),
  analyticsRateLimit,
  analyticsController.getMonthlyAnalytics
);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get profit trends over the last 6 months
 * @access  Private (Manager, Admin, Super Admin)
 * @cache   30 minutes
 */
router.get(
  '/trends',

  authorize('analytics', 'read'),
  analyticsRateLimit,
  analyticsController.getTrends
);

/**
 * @route   GET /api/analytics/distribution
 * @desc    Get expense/income distribution by department and action
 * @access  Private (Manager, Admin, Super Admin)
 * @cache   30 minutes
 */
router.get(
  '/distribution',

  authorize('analytics', 'read'),
  analyticsRateLimit,
  analyticsController.getDistribution
);

/**
 * @route   GET /api/analytics/highest
 * @desc    Get highest income and expense records
 * @access  Private (Manager, Admin, Super Admin)
 * @cache   30 minutes
 */
router.get(
  '/highest',

  authorize('analytics', 'read'),
  analyticsRateLimit,
  analyticsController.getHighestRecords
);

/**
 * @route   GET /api/analytics/overview
 * @desc    Get all analytics data at once (dashboard overview)
 * @access  Private (Manager, Admin, Super Admin)
 * @cache   30 minutes
 */
router.get(
  '/overview',

  authorize('analytics', 'read'),
  analyticsRateLimit,
  analyticsController.getOverview
);

/**
 * @route   GET /api/analytics/status
 * @desc    Check analytics cache status and last refresh time
 * @access  Private (Manager, Admin, Super Admin)
 */
router.get(
  '/status',

  authorize('analytics', 'read'),
  generalRateLimit,
  analyticsController.getCacheStatus
);

/**
 * @route   POST /api/analytics/refresh
 * @desc    Force analytics recalculation (queued job)
 * @access  Private (Admin, Super Admin)
 */
router.post(
  '/refresh',
  requireAnyRole(ROLE_ENUM.ADMIN, ROLE_ENUM.SUPER_ADMIN),
  authorize('analytics', 'write'),
  generalRateLimit,
  validate(analyticsRefreshSchema),
  analyticsController.refreshAnalytics
);

export default router;
