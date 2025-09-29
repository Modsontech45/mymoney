import { NextFunction, Request, Response } from 'express';
import { RBACService } from '../services/rbac.service';
import { ACTION_ENUM, RESOURCE_ENUM, ROLE_ENUM } from '../types/rbac.types';

const rbacService = new RBACService();

// Permission-based authorization with multiple permissions support
export const authorize = (
  resource: RESOURCE_ENUM | string,
  action: ACTION_ENUM | string | (ACTION_ENUM | string)[]
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    try {
      const actions = Array.isArray(action) ? action : [action];

      // Check if user has ANY of the required permissions
      const hasPermission = await rbacService.hasAnyPermission(
        req.user.id,
        resource,
        actions
      );

      if (!hasPermission) {
        const permissions = actions.map((a) => `${resource}:${a}`);
        return res.status(403).json({
          status: 'error',
          message: `Insufficient permissions. Required one of: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Authorization error' });
    }
  };
};

// Enhanced permission check requiring ALL permissions
export const authorizeAll = (
  resource: RESOURCE_ENUM | string,
  actions: (ACTION_ENUM | string)[]
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    try {
      const hasAllPermissions = await rbacService.hasAllPermissions(
        req.user.id,
        resource,
        actions
      );

      if (!hasAllPermissions) {
        const permissions = actions.map((a) => `${resource}:${a}`);
        return res.status(403).json({
          status: 'error',
          message: `Insufficient permissions. Required all: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Authorization error' });
    }
  };
};

// Role-based authorization - user must have ANY of the specified roles
export const requireAnyRole = (...roleNames: ROLE_ENUM[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    try {
      const hasAnyRole = await rbacService.hasAnyRole(req.user.id, roleNames);

      if (!hasAnyRole) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied. Required one of these roles: ${roleNames.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Authorization error' });
    }
  };
};

// Single role check
export const requireRole = (roleName: ROLE_ENUM) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    try {
      const hasRole = await rbacService.hasRole(req.user.id, roleName);

      if (!hasRole) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied. Required role: ${roleName}`,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Authorization error' });
    }
  };
};

// Hierarchical role check - checks if user has specified role or higher
export const requireMinimumRole = (minimumRole: ROLE_ENUM) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    try {
      const hasMinimumRole = await rbacService.hasMinimumRole(
        req.user.id,
        minimumRole
      );

      if (!hasMinimumRole) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied. Minimum required role: ${minimumRole}`,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Authorization error' });
    }
  };
};

// Company ownership check
export const requireCompanyOwnership = (companyKey: string = 'companyId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    const companyId =
      req.params[companyKey] || req.body[companyKey] || req.query[companyKey];

    if (!companyId) {
      return res.status(400).json({
        status: 'error',
        message: 'Company ID is required',
      });
    }

    try {
      const belongsToCompany = await rbacService.belongsToCompany(
        req.user.id,
        companyId
      );

      if (!belongsToCompany) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only access your own company data.',
        });
      }

      next();
    } catch (error) {
      console.error('Company ownership check error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Company ownership check failed' });
    }
  };
};

// Enhanced resource ownership check
export const requireResourceOwnership = (
  resourceModel: string,
  resourceIdParam: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    const resourceId = req.params[resourceIdParam];

    if (!resourceId) {
      return res.status(400).json({
        status: 'error',
        message: `${resourceModel} ID is required`,
      });
    }

    try {
      const ownsResource = await rbacService.ownsResource(
        req.user.id,
        resourceModel,
        resourceId
      );

      if (!ownsResource) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied. You can only access your own ${resourceModel.toLowerCase()} resources.`,
        });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Resource ownership check failed' });
    }
  };
};

// Conditional authorization - check ownership OR permission
export const requireOwnershipOrPermission = (
  resourceModel: string,
  resource: RESOURCE_ENUM | string,
  action: ACTION_ENUM | string,
  resourceIdParam: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    const resourceId = req.params[resourceIdParam];

    try {
      // First check if user owns the resource
      if (resourceId) {
        const ownsResource = await rbacService.ownsResource(
          req.user.id,
          resourceModel,
          resourceId
        );

        if (ownsResource) {
          return next();
        }
      }

      // If not owner, check permission
      const hasPermission = await rbacService.hasPermission(
        req.user.id,
        resource,
        action
      );

      if (!hasPermission) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied. Must own resource or have ${resource}:${action} permission.`,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Authorization error' });
    }
  };
};

// Super admin bypass - allows super admin to access anything
export const allowSuperAdmin = (middleware: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    try {
      // Check if user is super admin
      const isSuperAdmin = await rbacService.hasRole(
        req.user.id,
        ROLE_ENUM.SUPER_ADMIN
      );

      if (isSuperAdmin) {
        return next();
      }

      // If not super admin, apply the original middleware
      return middleware(req, res, next);
    } catch (error) {
      console.error('Authorization error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Authorization error' });
    }
  };
};

// Permission check with company context
export const authorizeInCompany = (
  resource: RESOURCE_ENUM | string,
  action: ACTION_ENUM | string | (ACTION_ENUM | string)[],
  companyIdParam: string = 'companyId'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Authentication required' });
    }

    const companyId = req.params[companyIdParam] || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({
        status: 'error',
        message: 'Company ID is required',
      });
    }

    try {
      const actions = Array.isArray(action) ? action : [action];

      // Check if user has permission in the specific company
      const hasPermission = await rbacService.hasPermissionInCompany(
        req.user.id,
        resource,
        actions[0], // For simplicity, check first action with company context
        companyId
      );

      if (!hasPermission) {
        const permissions = actions.map((a) => `${resource}:${a}`);
        return res.status(403).json({
          status: 'error',
          message: `Insufficient permissions for this company. Required: ${permissions.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res
        .status(500)
        .json({ status: 'error', message: 'Authorization error' });
    }
  };
};
