// src/types/company.types.ts
import { User } from '../models/User';
import { QueryOptions } from './app.type';
import { ROLE_ENUM } from './rbac.types';

export enum CompanyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// Base Company Data
export interface BaseCompanyData {
  name: string;
  description?: string;
  departments?: string[];
  inviteExpiresAfter?: number;
  currencyId?: string;
  ownerId?: string;
}

// Create Company Data
export interface CreateCompanyData extends BaseCompanyData {}

// Update Company Data
export interface UpdateCompanyData extends Partial<BaseCompanyData> {
  status?: CompanyStatus;
}

// Company Query Parameters
export interface CompanyQueryParams extends QueryOptions {
  search?: string;
  status?: CompanyStatus;
  hasOwner?: boolean;
  departmentCount?: number;
}

export interface CompanyMemberQueryParams extends QueryOptions {
  search?: string;
}


// Company Member Data
export interface CompanyMemberData {
  userId: string;
  roles: ROLE_ENUM[];
}

// Add Company Member Data
export interface AddCompanyMemberData {
  email: string;
  roles: ROLE_ENUM[];
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

// Company Statistics
export interface CompanyStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  totalInvites: number;
  activeInvites: number;
  totalTransactions?: number;
  departments: string[];
}

// Company with relations
export interface CompanyWithStats extends BaseCompanyData {
  id: string;
  ownerId: string;
  owner?: User | null;
  stats?: CompanyStats;
  createdAt: Date;
  updatedAt: Date;
}
