export interface EmailJobData {
  to: string;
  subject: string;
  text: string;
  html: string;
  priority?: number;
}

export interface AnalyticsJobData {
  companyId: string;
  type: 'summary' | 'monthly' | 'trends' | 'distribution' | 'highest' | 'all' | 'recurring';
  priority?: number;
  userId: string;
}

export interface NotificationJobData {
  userId: string;
  type: 'email' | 'push';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface BaseJobData {
  id: string;
  priority: number;
  attempts: number;
  delay?: number;
}

export interface EmailJob extends BaseJobData {
  type: 'email';
  data: EmailJobData;
}

export interface AnalyticsJob extends BaseJobData {
  type: 'analytics';
  data: {
    companyId: string;
    refreshType: 'full' | 'partial';
  };
}
