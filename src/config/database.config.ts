import { DataSource } from 'typeorm';
import { Company } from '../models/Company';
import { Currency } from '../models/Currency';
import { Invite } from '../models/Invite';
import { Notice } from '../models/Notice';
import { Subscription } from '../models/Subscription';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import './load-env';

export const AppDataSource = new DataSource({
  type: 'postgres', // or 'mysql'
  url: process.env.DB_URL,
  synchronize: process.env.NODE_ENV === 'development',
  // logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    Company,
    Transaction,
    Currency,
    Notice,
    Subscription,
    Invite,
  ],
  migrations: ['src/migrations/*.ts'],
});
