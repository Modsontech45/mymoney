import { AppInitialization } from '../app.init';
import { logger } from './logger';

export const setupGracefulShutdown = (): void => {
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.process('SIGTERM received, shutting down gracefully...');
    await AppInitialization.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.process('SIGINT received, shutting down gracefully...');
    await AppInitialization.shutdown();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.boom(`Uncaught Exception: ${error.message}`);
    console.error(error);
    await AppInitialization.shutdown();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    logger.boom('Unhandled Rejection at:');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    await AppInitialization.shutdown();
    process.exit(1);
  });
};
