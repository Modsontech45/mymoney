import { Job, Worker } from 'bullmq';
import { redisConfig } from '../config/redis.config';
import { sendEmail } from '../services/email.service';
import { EmailJobData } from '../types';

/**
 * Email worker processes jobs from the "email" queue
 */
export const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    const { to, subject, html, text } = job.data;
    try {
      await sendEmail(to, subject, html || text, text, false);
    } catch (error: any) {
      console.error(
        `❌ Failed to send email to ${to}:`,
        error.message || error
      );
      throw error; // Marks job as failed in BullMQ
    }
  },
  {
    connection: redisConfig,
    concurrency: 5,
    lockDuration: 60000,
  }
);

/**
 * Event handlers
 */
emailWorker.on('failed', async (job, err) => {
  if (!job) return; // Guard against undefined
  console.error(`❌ Email job ${job.id} failed:`, err?.message || err);

  // Optionally remove failed jobs to free Redis memory
  try {
    await job.remove();
  } catch (removeErr) {
    console.error(`⚠️ Failed to remove job ${job.id}:`, removeErr);
  }
});

// Optional: log completed jobs
// emailWorker.on('completed', (job) => console.log(`✅ Email job ${job.id} completed successfully`));

emailWorker.on('error', (err) => console.error('❌ Email worker error:', err));

/**
 * Graceful shutdown
 */
const gracefulShutdown = async () => {
  console.log('🔄 Shutting down email worker...');
  await emailWorker.close();
  console.log('✅ Email worker shutdown complete');
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
