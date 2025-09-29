import { Express, Request, Response } from 'express';
import { errorHandler } from '../middleware/error.middleware';

// Import route modules
import analyticsRoutes from './analytics.routes';
import authRoutes from './auth.routes';
import companyRoutes from './company.routes';
import transactionRoutes from './transaction.routes';
import userRoutes from './user.routes';
// import noticeRoutes from './notice.routes';

export const setupRoutes = (app: Express): void => {
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'success',
      message: 'Finance Record Backend is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  // API documentation endpoint
  app.get('/api', (req: Request, res: Response) => {
    res.json({
      status: 'success',
      message: 'Finance Record Backend API',
      version: '1.0.0',
      endpoints: {
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          verifyEmail: 'POST /api/auth/verify-email',
          forgotPassword: 'POST /api/auth/forgot-password',
          resetPassword: 'POST /api/auth/reset-password',
          refresh: 'POST /api/auth/refresh',
        },
        companies: {
          getCompany: 'GET /api/companies/:id',
          updateCompany: 'PUT /api/companies/:id',
          addMember: 'POST /api/companies/:id/members',
          getMembers: 'GET /api/companies/:id/members',
          removeMember: 'DELETE /api/companies/:id/members/:userId',
          updateMemberRole: 'PUT /api/companies/:id/members/:userId/role',
          resendInvitation:
            'POST /api/companies/:id/members/:userId/resend-invitation',
          getCurrencies: 'GET /api/companies/currencies',
        },
      },
    });
  });

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/users', userRoutes);
  // app.use('/api/notices', noticeRoutes);

  // Global error handler (must be last)
  app.use(errorHandler);
};
