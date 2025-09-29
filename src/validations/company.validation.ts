// src/validations/company.validation.ts
import Joi from 'joi';
import { CompanyStatus } from '../types/company.types';
import { ROLE_ENUM } from '../types/rbac.types';

// Base company fields
const baseCompanyFields = {
  name: Joi.string().min(2).max(100).messages({
    'string.base': 'Company name must be a string',
    'string.min': 'Company name must be at least 2 characters',
    'string.max': 'Company name cannot exceed 100 characters',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description cannot exceed 500 characters',
  }),
  departments: Joi.array()
    .items(Joi.string().min(1).max(50))
    .max(20)
    .optional()
    .messages({
      'array.base': 'Departments must be an array',
      'array.max': 'Cannot have more than 20 departments',
      'string.min': 'Department name cannot be empty',
      'string.max': 'Department name cannot exceed 50 characters',
    }),

  inviteExpiresAfter: Joi.number()
    .integer()
    .min(3600000) // 1 hour minimum
    .max(2592000000) // 30 days maximum
    .optional()
    .messages({
      'number.base': 'Invite expiration must be a number',
      'number.integer': 'Invite expiration must be an integer',
      'number.min': 'Invite expiration must be at least 1 hour',
      'number.max': 'Invite expiration cannot exceed 30 days',
    }),
  currencyId: Joi.string().uuid().optional().messages({
    'string.uuid': 'Currency ID must be a valid UUID',
  }),
};

const rolesValidator = Joi.array()
  .items(Joi.string().valid(...Object.values(ROLE_ENUM)))
  .min(1)
  .required()
  .messages({
    'array.min': 'At least one role must be assigned',
    'any.required': 'Roles are required',
    'any.only': `Role must be one of: ${Object.values(ROLE_ENUM).join(', ')}`,
  });

// Create Company Schema
export const createCompanySchema = Joi.object({
  name: baseCompanyFields.name.required().messages({
    'any.required': 'Company name is required',
  }),
  description: baseCompanyFields.description,
  departments: baseCompanyFields.departments,
  inviteExpiresAfter: baseCompanyFields.inviteExpiresAfter.default(259200000), // 3 days
  currencyId: baseCompanyFields.currencyId,
  ownerId: Joi.string().uuid().optional().messages({
    'string.uuid': 'Owner ID must be a valid UUID',
  }),
});

// Update Company Schema
export const updateCompanySchema = Joi.object({
  ...baseCompanyFields,
  status: Joi.string()
    .valid(...Object.values(CompanyStatus))
    .optional()
    .messages({
      'any.only': `Status must be one of: ${Object.values(CompanyStatus).join(', ')}`,
    }),
});

// Add Company Member Schema
export const addCompanyMemberSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  roles: rolesValidator,
  firstName: Joi.string().optional().messages({
    'string.base': 'First name must be a string',
  }),
  lastName: Joi.string().optional().messages({
    'string.base': 'Last name must be a string',
  }),
  phoneNumber: Joi.string().optional().messages({
    'string.base': 'Phone number must be a string',
  }),
});

// Company Query Schema
export const companyQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  search: Joi.string().trim().min(1).max(255).optional().messages({
    'string.base': 'Search must be a string',
    'string.min': 'Search must not be empty',
    'string.max': 'Search cannot exceed 255 characters',
  }),
  status: Joi.string()
    .valid(...Object.values(CompanyStatus))
    .optional()
    .messages({
      'any.only': `Status must be one of: ${Object.values(CompanyStatus).join(', ')}`,
    }),

  hasOwner: Joi.boolean().optional().messages({
    'boolean.base': 'hasOwner must be a boolean',
  }),
  sortBy: Joi.string()
    .valid('name', 'createdAt', 'updatedAt', 'status', 'userCount')
    .optional()
    .messages({
      'any.only':
        'Sort by must be one of: name, createdAt, updatedAt, status, userCount',
    }),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional().messages({
    'any.only': 'Sort order must be either ASC or DESC',
  }),
});

// UUID parameter validation
export const companyUuidParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.uuid': 'Company ID must be a valid UUID',
    'any.required': 'Company ID is required',
  }),
});

// Member  validation
export const companyMemberParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.uuid': 'Company ID must be a valid UUID',
    'any.required': 'Company ID is required',
  }),
  userId: Joi.string().uuid().required().messages({
    'string.uuid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required',
  }),
});

// Transfer Ownership Schema
export const transferOwnershipSchema = Joi.object({
  newOwnerId: Joi.string().uuid().required().messages({
    'string.uuid': 'New owner ID must be a valid UUID',
    'any.required': 'New owner ID is required',
  }),
});

// Company Members Query Schema
export const companyMembersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  search: Joi.string().trim().min(1).max(255).optional().messages({
    'string.base': 'Search must be a string',
    'string.min': 'Search must not be empty',
    'string.max': 'Search cannot exceed 255 characters',
  }),
  sortBy: Joi.string()
    .valid('name', 'createdAt', 'updatedAt', 'status', 'userCount')
    .optional()
    .messages({
      'any.only':
        'Sort by must be one of: name, createdAt, updatedAt, status, userCount',
    }),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional().messages({
    'any.only': 'Sort order must be either ASC or DESC',
  }),
});
