import { Job, Worker } from 'bullmq';
import { redisConfig } from '../config/redis.config';
import { AnalyticsService } from '../services/analytics.service';
import { CacheService } from '../services/cache.service';
import { QueueService } from '../services/queue.service';
import { AnalyticsJobData } from '../types';

export const analyticsWorker = new Worker(
  'analytics',
  async (job: Job<AnalyticsJobData>) => {
    const jobData = job.data;
    const analyticsService = new AnalyticsService();

    // Handle recurring analytics refresh
    if (jobData.type === 'recurring') {
      console.log('📊 Processing recurring analytics refresh...');

      try {
        const activeCompanyIds = await CacheService.getActiveCompanyIds();
        console.log(`📊 Found ${activeCompanyIds.length} active companies`);

        if (activeCompanyIds.length === 0) {
          return { success: true, message: 'No active companies found' };
        }

        // Queue analytics jobs for active companies with low priority
        for (const companyId of activeCompanyIds) {
          await QueueService.calculateAnalytics(
            companyId,
            'all',
            'system',
            1 // Lowest priority for scheduled jobs
          );

          // Small delay to prevent overwhelming
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return {
          success: true,
          companiesProcessed: activeCompanyIds.length,
          type: 'recurring',
        };
      } catch (error) {
        console.error('❌ Failed to process recurring analytics:', error);
        throw error;
      }
    }

    const { companyId, type } = jobData;

    try {
      console.log(
        `📊 Starting analytics calculation for company ${companyId}, type: ${type}`
      );

      switch (type) {
        case 'summary':
          const summary = await analyticsService.calculateSummary(companyId);
          await CacheService.cacheAnalytics(companyId, {
            type: 'summary',
            data: summary,
          });
          console.log(`✅ Summary analytics cached for company ${companyId}`);
          break;

        case 'monthly':
          const monthly =
            await analyticsService.calculateMonthlyData(companyId);
          await CacheService.cacheAnalytics(companyId, {
            type: 'monthly',
            data: monthly,
          });
          console.log(`✅ Monthly analytics cached for company ${companyId}`);
          break;

        case 'trends':
          const trends = await analyticsService.calculateTrends(companyId);
          await CacheService.cacheAnalytics(companyId, {
            type: 'trends',
            data: trends,
          });
          console.log(`✅ Trends analytics cached for company ${companyId}`);
          break;

        case 'distribution':
          const distribution =
            await analyticsService.calculateDistribution(companyId);
          await CacheService.cacheAnalytics(companyId, {
            type: 'distribution',
            data: distribution,
          });
          console.log(
            `✅ Distribution analytics cached for company ${companyId}`
          );
          break;

        case 'highest':
          const highest =
            await analyticsService.calculateHighestRecords(companyId);
          await CacheService.cacheAnalytics(companyId, {
            type: 'highest',
            data: highest,
          });
          console.log(
            `✅ Highest records analytics cached for company ${companyId}`
          );
          break;

        case 'all':
          // Calculate all analytics types in parallel for efficiency
          const [
            summaryAll,
            monthlyAll,
            trendsAll,
            distributionAll,
            highestAll,
          ] = await Promise.all([
            analyticsService.calculateSummary(companyId),
            analyticsService.calculateMonthlyData(companyId),
            analyticsService.calculateTrends(companyId),
            analyticsService.calculateDistribution(companyId),
            analyticsService.calculateHighestRecords(companyId),
          ]);

          // Cache all results
          await Promise.all([
            CacheService.cacheAnalytics(companyId, {
              type: 'summary',
              data: summaryAll,
            }),
            CacheService.cacheAnalytics(companyId, {
              type: 'monthly',
              data: monthlyAll,
            }),
            CacheService.cacheAnalytics(companyId, {
              type: 'trends',
              data: trendsAll,
            }),
            CacheService.cacheAnalytics(companyId, {
              type: 'distribution',
              data: distributionAll,
            }),
            CacheService.cacheAnalytics(companyId, {
              type: 'highest',
              data: highestAll,
            }),
          ]);
          console.log(`✅ All analytics cached for company ${companyId}`);
          break;

        default:
          throw new Error(`Unknown analytics type: ${type}`);
      }

      console.log(
        `✅ Analytics ${type} calculated and cached for company ${companyId}`
      );
      return {
        success: true,
        type,
        companyId,
        completedAt: new Date(),
        processingTime: Date.now() - job.processedOn!,
      };
    } catch (error) {
      console.error(
        `❌ Failed to calculate ${type} analytics for company ${companyId}:`,
        error
      );
      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 3, // Process up to 3 analytics jobs simultaneously
    removeOnComplete: { count: 10 }, // Keep last 10 completed jobs
    removeOnFail: { count: 20 }, // Keep last 20 failed jobs
  }
);

// Worker event handlers
analyticsWorker.on('completed', (job, result) => {
  console.log(`📊 Analytics job ${job.id} completed successfully:`, {
    companyId: result.companyId,
    type: result.type,
    processingTime: `${result.processingTime}ms`,
  });
});

analyticsWorker.on('failed', (job, err) => {
  console.error(`📊 Analytics job ${job?.id} failed:`, {
    companyId: job?.data?.companyId,
    type: job?.data?.type,
    error: err.message,
    attempts: job?.attemptsMade,
    maxAttempts: job?.opts.attempts,
  });
});

analyticsWorker.on('error', (err) => {
  console.error('📊 Analytics worker error:', err);
});

analyticsWorker.on('stalled', (jobId) => {
  console.warn(`📊 Analytics job ${jobId} stalled`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down analytics worker...');
  await analyticsWorker.close();
  console.log('✅ Analytics worker shut down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down analytics worker...');
  await analyticsWorker.close();
  console.log('✅ Analytics worker shut down gracefully');
  process.exit(0);
});

export default analyticsWorker;
