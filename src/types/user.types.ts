import { QueryOptions } from './app.type';
import { ROLE_ENUM } from './rbac.types';

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending', // for invites
  SUSPENDED = 'suspended', // for locks by admins
}

export enum InviteStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
  USED = 'used', // optional, if you want to track used invites
}

// Base User Data
export interface BaseUserData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePicture?: string;
}

// Create User Data (for company members)
export interface CreateCompanyUserData extends Partial<BaseUserData> {
  roles: ROLE_ENUM[];
  status?: UserStatus;
  email: string;
  password?: string;
}

export interface UpdateCompanyUserData
  extends Partial<Omit<CreateCompanyUserData, 'email'>> {}

export interface CreateCompanyInvite {
  email: string;
  roles: ROLE_ENUM[];
}

export interface UpdateUserData extends Partial<Omit<BaseUserData, 'email'>> {}

export interface AcceptInviteData extends Omit<BaseUserData, 'email'> {
  token: string;
  password: string;
}
// User Query Parameters
export interface UserQueryParams extends QueryOptions {
  search?: string;
  status?: UserStatus;
  role?: ROLE_ENUM;
  includeInactive?: boolean;
}

export interface InviteQueryParams extends QueryOptions {
  search?: string;
  status?: InviteStatus;
  role?: ROLE_ENUM;

  includeExpired?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ChangePasswordDto {
  password: string;
  confirmPassword: string;
}
