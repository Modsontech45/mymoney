// src/services/rbac.service.ts
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Permission } from '../models/Permission';
import { Role } from '../models/Role';
import { User } from '../models/User';

import { ACTION_ENUM, RESOURCE_ENUM, ROLE_ENUM } from '../types';
import { NotFoundError } from '../utils/error';
import {
  APP_PERMISSIONS,
  APP_ROLES,
  getRoleHierarchyLevel,
  getRolePermissions,
} from '../utils/rbac.constant';

export class RBACService {
  private readonly userRepo: Repository<User>;
  private readonly roleRepo: Repository<Role>;
  private readonly permissionRepo: Repository<Permission>;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
    this.roleRepo = AppDataSource.getRepository(Role);
    this.permissionRepo = AppDataSource.getRepository(Permission);
  }

  // Check if user has specific permission
  async hasPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles', 'companyId'],
    });

    if (!user || !user.roles) return false;

    return this.checkUserPermission(user.roles, resource, action);
  }

  // Check if user has ANY of the specified permissions
  async hasAnyPermission(
    userId: string,
    resource: string,
    actions: string[]
  ): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles', 'companyId'],
    });

    if (!user) return false;

    return actions.some((action) =>
      this.checkUserPermission(user.roles, resource, action)
    );
  }

  // Check if user has ALL of the specified permissions
  async hasAllPermissions(
    userId: string,
    resource: string,
    actions: string[]
  ): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles', 'companyId'],
    });

    if (!user) return false;

    return actions.every((action) =>
      this.checkUserPermission(user.roles, resource, action)
    );
  }

  // Helper method to check permission for a user object
  private checkUserPermission(
    roles: ROLE_ENUM[],
    resource: string,
    action: string
  ): boolean {
    // Check if user has the specific permission
    for (const role of roles) {
      const rolePermissions = getRolePermissions(role);

      const exactPermission = `${resource}:${action}`;
      if (rolePermissions.includes(exactPermission)) {
        return true;
      }

      // Check for wildcard permissions
      const resourceWildcard = `${resource}:*`;
      const actionWildcard = `*:${action}`;
      const fullWildcard = '*:*';

      return rolePermissions.some(
        (permission) =>
          permission === resourceWildcard ||
          permission === actionWildcard ||
          permission === fullWildcard
      );
    }

    return false;
  }

  // Check if user has specific role
  async hasRole(userId: string, roleName: ROLE_ENUM): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) return false;

    return user.roles.some((role) => role === roleName);
  }

  // Check if user has ANY of the specified roles
  async hasAnyRole(userId: string, roleNames: ROLE_ENUM[]): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) return false;

    const userRoleNames = user.roles.map((role) => role);
    return roleNames.some((roleName) => userRoleNames.includes(roleName));
  }

  // Check if user has ALL of the specified roles
  async hasAllRoles(userId: string, roleNames: ROLE_ENUM[]): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) return false;

    const userRoleNames = user.roles.map((role) => role);
    return roleNames.every((roleName) => userRoleNames.includes(roleName));
  }

  // Check if user has minimum role (hierarchical)
  async hasMinimumRole(
    userId: string,
    minimumRole: ROLE_ENUM
  ): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) return false;

    const minimumLevel = getRoleHierarchyLevel(minimumRole);

    // Check if user has any role with equal or higher privilege
    return user.roles.some((role) => {
      const userLevel = getRoleHierarchyLevel(role);
      return userLevel >= minimumLevel;
    });
  }

  // Check if user owns a specific resource
  async ownsResource(
    userId: string,
    resourceModel: string,
    resourceId: string
  ): Promise<boolean> {
    try {
      // This is a generic implementation - you might need to customize based on your models
      const repository = AppDataSource.getRepository(resourceModel);

      // Try different common ownership field names
      const ownershipFields = ['userId', 'ownerId', 'createdBy', 'authorId'];

      for (const field of ownershipFields) {
        try {
          const resource = await repository.findOne({
            where: {
              id: resourceId,
              [field]: userId,
            },
          });

          if (resource) return true;
        } catch {
          // Continue to next field if this one doesn't exist
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error(
        `Error checking resource ownership for ${resourceModel}:`,
        error
      );
      return false;
    }
  }

  // Get user permissions with formatted strings
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) return [];

    const permissions = new Set<string>();

    for (const role of user.roles) {
      const rolePerms = getRolePermissions(role);
      rolePerms.forEach((perm) => permissions.add(perm));
    }

    return Array.from(permissions);
  }

  // Get user roles
  async getUserRoles(userId: string): Promise<ROLE_ENUM[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) return [];

    return user.roles;
  }

  // Assign role to user
  async assignRole(userId: string, roleName: ROLE_ENUM): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) {
      throw new NotFoundError('User  not found');
    }

    // Check if user already has this role
    if (!user.roles.some((r) => r === roleName)) {
      user.roles.push(roleName);
      await this.userRepo.save(user);
    }
  }

  // Assign multiple roles to user
  async assignRoles(userId: string, roleNames: ROLE_ENUM[]): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Add only new roles
    for (const role of roleNames) {
      if (!user.roles.some((r) => r === role)) {
        user.roles.push(role);
      }
    }

    await this.userRepo.save(user);
  }

  // Remove role from user
  async removeRole(userId: string, roleName: ROLE_ENUM): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.roles = user.roles.filter((role) => role !== roleName);
    await this.userRepo.save(user);
  }

  // Remove multiple roles from user
  async removeRoles(userId: string, roleNames: ROLE_ENUM[]): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'roles'],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.roles = user.roles.filter((role) => !roleNames.includes(role));
    await this.userRepo.save(user);
  }
  // Get all available roles
  getAllRoles(): ROLE_ENUM[] {
    return Object.values(ROLE_ENUM);
  }

  // Get role definition
  getRoleDefinition(role: ROLE_ENUM) {
    return APP_ROLES.find((r) => r.name === role);
  }

  // Get all available permissions
  getAllPermissions(): string[] {
    return APP_PERMISSIONS.map((p) => p.name);
  }

  // Check if user belongs to company
  async belongsToCompany(userId: string, companyId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'companyId'],
    });

    return user?.companyId === companyId;
  }

  // Utility method to check if user is super admin
  async isSuperAdmin(userId: string): Promise<boolean> {
    return await this.hasRole(userId, ROLE_ENUM.SUPER_ADMIN);
  }

  // Enhanced permission check with company context
  async hasPermissionInCompany(
    userId: string,
    resource: RESOURCE_ENUM | string,
    action: ACTION_ENUM | string,
    companyId: string
  ): Promise<boolean> {
    // First check if user belongs to the company
    const belongsToCompany = await this.belongsToCompany(userId, companyId);
    if (!belongsToCompany) return false;

    // Then check permission
    return this.hasPermission(userId, resource, action);
  }
}
