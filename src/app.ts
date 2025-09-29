import './config/load-env';
import './config/oauth.config'; // Initialize passport strategies
// Do not remove above lines as .vscode setting will
// update import order and will break .env load
// and cause app crash

import express from 'express';
import 'reflect-metadata';

import { setupDevelopmentTools } from './config/development';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';

// Create Express application
const app = express();

// Setup middleware
setupMiddleware(app);

// Setup development tools
setupDevelopmentTools(app);

// Setup routes
setupRoutes(app);

export default app;
