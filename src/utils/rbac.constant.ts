// src/utils/rbac.constants.ts
import {
  ACTION_ENUM,
  Permission,
  RESOURCE_ENUM,
  ROLE_ENUM,
  RoleDefinition,
} from '../types/rbac.types';

// Define all available permissions
export const APP_PERMISSIONS: Permission[] = [
  {
    name: 'transaction:read',
    resource: RESOURCE_ENUM.TRANSACTION,
    action: ACTION_ENUM.READ,
  },
  {
    name: 'transaction:write',
    resource: RESOURCE_ENUM.TRANSACTION,
    action: ACTION_ENUM.WRITE,
  },
  {
    name: 'transaction:delete',
    resource: RESOURCE_ENUM.TRANSACTION,
    action: ACTION_ENUM.DELETE,
  },
  {
    name: 'company:read',
    resource: RESOURCE_ENUM.COMPANY,
    action: ACTION_ENUM.READ,
  },
  {
    name: 'company:write',
    resource: RESOURCE_ENUM.COMPANY,
    action: ACTION_ENUM.WRITE,
  },
  { name: 'user:read', resource: RESOURCE_ENUM.USER, action: ACTION_ENUM.READ },
  {
    name: 'user:write',
    resource: RESOURCE_ENUM.USER,
    action: ACTION_ENUM.WRITE,
  },
  {
    name: 'user:delete',
    resource: RESOURCE_ENUM.USER,
    action: ACTION_ENUM.DELETE,
  },
  {
    name: 'notice:read',
    resource: RESOURCE_ENUM.NOTICE,
    action: ACTION_ENUM.READ,
  },
  {
    name: 'notice:write',
    resource: RESOURCE_ENUM.NOTICE,
    action: ACTION_ENUM.WRITE,
  },
  {
    name: 'analytics:read',
    resource: RESOURCE_ENUM.ANALYTICS,
    action: ACTION_ENUM.READ,
  },
  { name: '*:*', resource: RESOURCE_ENUM.ALL, action: ACTION_ENUM.ALL },
];

// Define role configurations
export const APP_ROLES: RoleDefinition[] = [
  {
    name: ROLE_ENUM.SUPER_ADMIN,
    description: 'Super Administrator with full system access',
    permissions: ['*:*'],
  },
  {
    name: ROLE_ENUM.ADMIN,
    description: 'Administrator with comprehensive management access',
    permissions: [
      'transaction:read',
      'transaction:write',
      'transaction:delete',
      'company:read',
      'company:write',
      'user:read',
      'user:write',
      'user:delete',
      'notice:read',
      'notice:write',
      'analytics:read',
    ],
  },
  {
    name: ROLE_ENUM.MANAGER,
    description: 'Manager with operational access',
    permissions: [
      'transaction:read',
      'transaction:write',
      'company:read',
      'user:read',
      'notice:read',
      'notice:write',
      'analytics:read',
    ],
  },
  {
    name: ROLE_ENUM.MEMBER,
    description: 'Basic member with read-only access',
    permissions: [
      'transaction:read',
      'company:read',
      'user:read',
      'notice:read',
    ],
  },
];

// Role hierarchy (lower index = lower privilege)
export const ROLE_HIERARCHY: ROLE_ENUM[] = [
  ROLE_ENUM.MEMBER,
  ROLE_ENUM.MANAGER,
  ROLE_ENUM.ADMIN,
  ROLE_ENUM.SUPER_ADMIN,
];

// Helper to get role permissions
export const getRolePermissions = (role: ROLE_ENUM): string[] => {
  const roleDefinition = APP_ROLES.find((r) => r.name === role);
  return roleDefinition?.permissions || [];
};

// Helper to check if permission exists
export const isValidPermission = (permission: string): boolean => {
  return APP_PERMISSIONS.some((p) => p.name === permission);
};

// Helper to get role hierarchy level
export const getRoleHierarchyLevel = (role: ROLE_ENUM): number => {
  return ROLE_HIERARCHY.indexOf(role);
};
