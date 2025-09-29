import {
  analyticsQueue,
  emailQueue,
  notificationQueue,
} from '../config/queue.config';
import type { AnalyticsJobData, NotificationJobData } from '../types';

export class QueueService {
  // Analytics queue methods
  static async calculateAnalytics(
    companyId: string,
    type: AnalyticsJobData['type'],
    userId: string,
    priority?: number
  ) {
    return await analyticsQueue.add(
      'calculate-analytics',
      {
        companyId,
        type,
        userId,
      },
      {
        priority,
        delay: 2000, // Small delay to batch requests
      }
    );
  }

  static async scheduleAnalyticsRefresh(
    companyId: string,
    priority: number = 4
  ) {
    // Schedule all analytics types
    //: Array<AnalyticsJobData['type']>
    const jobs = ['summary', 'monthly', 'trends', 'distribution'].map((type) =>
      this.calculateAnalytics(
        companyId,
        type as AnalyticsJobData['type'],
        'system',
        priority
      )
    );

    return await Promise.all(jobs);
  }

  // Notification queue methods
  static async sendNotification(notificationData: NotificationJobData) {
    return await notificationQueue.add('send-notification', notificationData);
  }

  // Queue management
  static async getQueueStats() {
    const [emailStats, analyticsStats, notificationStats] = await Promise.all([
      emailQueue.getJobCounts(),
      analyticsQueue.getJobCounts(),
      notificationQueue.getJobCounts(),
    ]);

    return {
      email: emailStats,
      analytics: analyticsStats,
      notification: notificationStats,
    };
  }

  /**
   * Setup recurring analytics refresh using Redis
   */
  static async setupRecurringAnalytics(): Promise<void> {
    // Add recurring job every hour
    await analyticsQueue.add(
      'recurring-refresh',
      { type: 'recurring' },
      {
        repeat: {
          pattern: '0 * * * *', // Every hour at minute 0
        },
        jobId: 'analytics-recurring',
        removeOnComplete: 1,
        removeOnFail: 1,
      }
    );

    console.log('📊 Recurring analytics refresh scheduled');
  }

  static async clearCompletedJobs() {
    await Promise.all([
      emailQueue.clean(24 * 60 * 60 * 1000, 1000, 'completed'), // 24 hours, up to 1000 jobs
      analyticsQueue.clean(24 * 60 * 60 * 1000, 1000, 'completed'),
      notificationQueue.clean(24 * 60 * 60 * 1000, 1000, 'completed'),
    ]);
  }
}
