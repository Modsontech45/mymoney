import { AppDataSource } from './database.config';
import redisClient from './redis.config';
import { logger } from '../utils/logger';

export const initializeDatabase = async (): Promise<void> => {
  logger.process('Initializing database connection...');
  await AppDataSource.initialize();
  logger.success('Database connected successfully');

  // Uncomment these lines if you need to reset the database
  // await AppDataSource.dropDatabase();
  // await AppDataSource.synchronize();
  // logger.success('Database dropped and recreated');
};

export const initializeRedis = async (): Promise<void> => {
  await redisClient.connect();
  logger.success('Redis connected successfully');
};
