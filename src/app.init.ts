import { AppDataSource } from './config/database.config';
import { Transaction } from './models/Transaction';
import { seedDatabase } from './scripts/seed';
import { QueueService } from './services/queue.service';

export class AppInitialization {
  private static intervals: NodeJS.Timeout[] = [];
  private static isInitialized = false;

  /**
   * Initialize all background services and workers
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ App already initialized, skipping...');
      return;
    }

    try {
      console.log('🚀 Starting application initialization...');

      // 1. Initialize Workers
      await this.initializeWorkers();

      // 2. Set up Analytics Scheduling
      await this.setupAnalyticsScheduling();

      // 3. Set up Transaction Auto-locking
      await this.setupTransactionAutoLocking();

      // 4. Seed Database (first time setup)
      await this.setupDatabaseSeeding();

      // 5. Setup other recurring tasks
      await this.setupRecurringTasks();

      this.isInitialized = true;
      console.log('✅ Application initialization completed successfully');
    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize all workers
   */
  private static async initializeWorkers(): Promise<void> {
    console.log('🔄 Initializing workers...');

    try {
      // Import and start analytics worker
      await import('./workers/email.worker');
      console.log('✅ Email worker initialized');
      // Import and start analytics worker
      await import('./workers/analytics.worker');
      console.log('✅ Analytics worker initialized');

      // Add other workers here as needed
      // await import('../workers/email.worker');
      // await import('../workers/notification.worker');
    } catch (error) {
      console.error('❌ Failed to initialize workers:', error);
      throw error;
    }
  }

  /**
   * Set up analytics scheduling and recurring jobs
   */
  private static async setupAnalyticsScheduling(): Promise<void> {
    console.log('🔄 Setting up analytics scheduling...');

    try {
      await QueueService.setupRecurringAnalytics();

      // Set up hourly check for active companies (fallback if Redis scheduling fails)
      const analyticsInterval = setInterval(
        async () => {
          try {
            await QueueService.setupRecurringAnalytics();
          } catch (error) {
            console.error('❌ Hourly analytics scheduling error:', error);
          }
        },
        60 * 60 * 1000
      ); // Every hour

      this.intervals.push(analyticsInterval);
      console.log('✅ Analytics scheduling initialized');
    } catch (error) {
      console.error('❌ Failed to setup analytics scheduling:', error);
      throw error;
    }
  }

  /**
   * Set up transaction auto-locking
   */
  private static async setupTransactionAutoLocking(): Promise<void> {
    console.log('🔄 Setting up transaction auto-locking...');

    try {
      const lockingInterval = setInterval(async () => {
        try {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

          const result = await AppDataSource.createQueryBuilder()
            .update(Transaction)
            .set({ isLocked: true })
            .where('createdAt <= :date AND isLocked = false', {
              date: fiveMinutesAgo,
            })
            .execute();

          if (result.affected && result.affected > 0) {
            console.log(`🔒 Auto-locked ${result.affected} transactions`);

            // Get unique company IDs from locked transactions and trigger analytics refresh
            const lockedTransactions = await AppDataSource.createQueryBuilder()
              .select('DISTINCT companyId')
              .from(Transaction, 'transaction')
              .where('updatedAt >= :date AND isLocked = true', {
                date: new Date(Date.now() - 60000),
              })
              .getRawMany();

            // Queue analytics refresh for affected companies
            for (const { companyId } of lockedTransactions) {
              await QueueService.calculateAnalytics(
                companyId,
                'all',
                'system',
                2 // Low priority for auto-lock updates
              );
            }
          }
        } catch (error) {
          console.error('❌ Transaction auto-lock error:', error);
        }
      }, 60000); // Run every minute

      this.intervals.push(lockingInterval);
      console.log('✅ Transaction auto-locking initialized');
    } catch (error) {
      console.error('❌ Failed to setup transaction auto-locking:', error);
      throw error;
    }
  }

  /**
   * Set up database seeding
   */
  private static async setupDatabaseSeeding(): Promise<void> {
    console.log('🔄 Setting up database seeding...');

    try {
      console.log('🌱 Seeding database for the first time...');
      await seedDatabase(false);
      console.log('✅ Database seeding completed');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      // Don't throw here - seeding failure shouldn't prevent app startup
      console.warn('⚠️ Continuing without seeding...');
    }
  }

  /**
   * Set up other recurring background tasks
   */
  private static async setupRecurringTasks(): Promise<void> {
    console.log('🔄 Setting up recurring tasks...');

    try {
      // Clean up old queue jobs every 6 hours
      const cleanupInterval = setInterval(
        async () => {
          try {
            await QueueService.clearCompletedJobs();
            console.log('🧹 Queue cleanup completed');
          } catch (error) {
            console.error('❌ Queue cleanup error:', error);
          }
        },
        6 * 60 * 60 * 1000
      ); // Every 6 hours

      this.intervals.push(cleanupInterval);

      // Cache cleanup every 2 hours (if you have a cache cleanup method)
      const cacheCleanupInterval = setInterval(
        async () => {
          try {
            // Add cache cleanup logic here if needed
            console.log('🗑️ Cache cleanup check completed');
          } catch (error) {
            console.error('❌ Cache cleanup error:', error);
          }
        },
        2 * 60 * 60 * 1000
      ); // Every 2 hours

      this.intervals.push(cacheCleanupInterval);

      console.log('✅ Recurring tasks initialized');
    } catch (error) {
      console.error('❌ Failed to setup recurring tasks:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown of all services
   */
  static async shutdown(): Promise<void> {
    console.log('🔄 Starting graceful shutdown...');

    try {
      // Clear all intervals
      this.intervals.forEach((interval) => {
        clearInterval(interval);
      });
      this.intervals = [];
      console.log('✅ All intervals cleared');

      // Close queue service

      // Close database connection
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('✅ Database connection closed');
      }

      this.isInitialized = false;
      console.log('✅ Graceful shutdown completed');
    } catch (error) {
      console.error('❌ Shutdown error:', error);
      throw error;
    }
  }

  /**
   * Health check for initialization status
   */
  static getStatus(): {
    initialized: boolean;
    activeIntervals: number;
    workers: string[];
  } {
    return {
      initialized: this.isInitialized,
      activeIntervals: this.intervals.length,
      workers: ['analytics'], // Add other workers as you create them
    };
  }

  /**
   * Force restart of specific services
   */
  static async restart(
    service?: 'analytics' | 'locking' | 'all'
  ): Promise<void> {
    console.log(`🔄 Restarting ${service || 'all'} services...`);

    try {
      if (!service || service === 'all') {
        await this.shutdown();
        await this.initialize();
      } else {
        switch (service) {
          case 'analytics':
            await this.setupAnalyticsScheduling();
            break;
          case 'locking':
            await this.setupTransactionAutoLocking();
            break;
        }
      }

      console.log(`✅ ${service || 'all'} services restarted`);
    } catch (error) {
      console.error(
        `❌ Failed to restart ${service || 'all'} services:`,
        error
      );
      throw error;
    }
  }
}
