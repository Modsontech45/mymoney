import app from './app';
import { AppInitialization } from './app.init';
import { initializeDatabase, initializeRedis } from './config/database.init';
import { logDevelopmentInfo } from './config/development';
import { logger } from './utils/logger';
import { setupGracefulShutdown } from './utils/shutdown';

const PORT = process.env.PORT || 3000;

// Initialize database and start server
async function startServer(): Promise<void> {
  try {
    // Initialize database connections
    await initializeDatabase();
    await initializeRedis();

    // Initialize services after database connection
    logger.process('Initializing services...');
    await AppInitialization.initialize();
    logger.success('Services initialized successfully');

    // Start the server
    app.listen(+PORT, '0.0.0.0', () => {
      logger.startup(`Server running on port ${PORT}`);
      logger.world(`Environment: ${process.env.NODE_ENV}`);
      logger.docs(`API Documentation: http://localhost:${PORT}/api`);
      logger.heart(`Health Check: http://localhost:${PORT}/health`);

      // Log development-specific information
      logDevelopmentInfo(PORT);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

// Setup graceful shutdown handlers
setupGracefulShutdown();

// Start the server
startServer();
