import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Express } from 'express';
import { logger } from '../utils/logger';
import { analyticsQueue, emailQueue, notificationQueue } from './queue.config';

export const setupDevelopmentTools = (app: Express): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // BullMQ Dashboard setup
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(analyticsQueue),
      new BullMQAdapter(notificationQueue),
    ],
    serverAdapter: serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());
  logger.dev(
    'BullMQ Dashboard available at http://localhost:3000/admin/queues'
  );
};

export const logDevelopmentInfo = (port: string | number): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log('');
  logger.info('Development Endpoints:');
  logger.list(`Auth: http://localhost:${port}/api/auth`);
  logger.list(`BullMq: http://localhost:${port}/admin/queues`);
  logger.list(`Companies: http://localhost:${port}/api/companies`);
  console.log('');
  logger.key("Don't forget to:");
  logger.list('1. Run database migrations');
  logger.list('2. Seed initial data: npm run db:seed');
  logger.list('3. Start Redis server for caching/queues');
  logger.list('4. Configure email settings in .env');
};
