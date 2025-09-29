// src/types/rbac.types.ts

// Role enum for type safety
export enum ROLE_ENUM {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
}

// Resource enum for permissions
export enum RESOURCE_ENUM {
  TRANSACTION = 'transaction',
  COMPANY = 'company',
  USER = 'user',
  NOTICE = 'notice',
  ANALYTICS = 'analytics',
  ROLES = 'roles',
  ALL = '*',
}

// Action enum for permissions
export enum ACTION_ENUM {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  CREATE = 'create',
  UPDATE = 'update',
  ALL = '*',
}

// Permission interface
export interface Permission {
  name: string;
  resource: RESOURCE_ENUM;
  action: ACTION_ENUM;
  description?: string;
}

// Role interface
export interface RoleDefinition {
  name: ROLE_ENUM;
  description: string;
  permissions: string[];
}

// Type for permission strings
export type PermissionString = `${RESOURCE_ENUM}:${ACTION_ENUM}`;

// User role context
export interface UserRoleContext {
  userId: string;
  role: ROLE_ENUM;
  companyId: string;
}
