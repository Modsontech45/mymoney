// src/routes/company.routes.ts
import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import {
  authenticate,
  requireFullAuthenticate,
} from '../middleware/auth.middleware';
import { generalRateLimit } from '../middleware/rateLimiter.middleware';
import {
  authorize,
  requireAnyRole,
  requireCompanyOwnership,
} from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { ROLE_ENUM } from '../types';
import {
  addCompanyMemberSchema,
  companyMembersQuerySchema,
  companyUuidParamSchema,
  transferOwnershipSchema,
  updateCompanySchema,
} from '../validations/company.validation';

const router = Router();
const companyController = new CompanyController();

// Bind controller methods to preserve 'this'
companyController.getCompanyById =
  companyController.getCompanyById.bind(companyController);
companyController.getCurrentCompany =
  companyController.getCurrentCompany.bind(companyController);
companyController.updateCompany =
  companyController.updateCompany.bind(companyController);
companyController.deleteCompany =
  companyController.deleteCompany.bind(companyController);
companyController.getCompanyMembers =
  companyController.getCompanyMembers.bind(companyController);
companyController.getCompanyMember =
  companyController.getCompanyMember.bind(companyController);
companyController.addCompanyMember =
  companyController.addCompanyMember.bind(companyController);
companyController.removeCompanyMember =
  companyController.removeCompanyMember.bind(companyController);
companyController.getCompanyStats =
  companyController.getCompanyStats.bind(companyController);
companyController.transferOwnership =
  companyController.transferOwnership.bind(companyController);

// Apply authentication to all routes
router.use(authenticate);
router.use(requireFullAuthenticate);

/**
 * @route   GET /api/companies/me
 * @desc    Get current user's company details
 * @access  Private (Any authenticated user)
 * @cache   10 minutes
 */
router.get('/me', generalRateLimit, companyController.getCurrentCompany);

/**
 * @route   GET /api/companies/:id
 * @desc    Get single company by ID
 * @access  Private (Company members, Admin, Super Admin)
 * @cache   10 minutes
 */
router.get(
  '/:id',
  requireCompanyOwnership('id'),
  generalRateLimit,
  validate(companyUuidParamSchema, 'params'),
  companyController.getCompanyById
);

/**
 * @route   PUT /api/companies/:id
 * @desc    Update company details
 * @access  Private (Admin, Super Admin)
 */
router.put(
  '/:id',
  requireAnyRole(ROLE_ENUM.ADMIN, ROLE_ENUM.SUPER_ADMIN),
  authorize('company', 'write'),
  requireCompanyOwnership('id'),
  generalRateLimit,
  validate(companyUuidParamSchema, 'params'),
  validate(updateCompanySchema),
  companyController.updateCompany
);

/**
 * @route   DELETE /api/companies/:id
 * @desc    Delete company
 * @access  Private (Super Admin only)
 */
router.delete(
  '/:id',
  requireCompanyOwnership('id'),
  requireAnyRole(ROLE_ENUM.SUPER_ADMIN),
  authorize('company', 'delete'),
  generalRateLimit,
  validate(companyUuidParamSchema, 'params'),
  companyController.deleteCompany
);

/**
 * @route   GET /api/companies/:id/stats
 * @desc    Get company statistics
 * @access  Private (Manager, Admin, Super Admin)
 * @cache   5 minutes
 */
router.get(
  '/:id/stats',
  requireCompanyOwnership('id'),
  requireAnyRole(ROLE_ENUM.MANAGER, ROLE_ENUM.ADMIN, ROLE_ENUM.SUPER_ADMIN),
  authorize('company', 'read'),
  generalRateLimit,
  validate(companyUuidParamSchema, 'params'),
  companyController.getCompanyStats
);

/**
 * @route   GET /api/companies/:id/members
 * @desc    List company members with pagination
 * @access  Private (Company members, Manager, Admin, Super Admin)
 * @cache   5 minutes
 */
router.get(
  '/:id/members',
  requireAnyRole(
    ROLE_ENUM.MEMBER,
    ROLE_ENUM.MANAGER,
    ROLE_ENUM.ADMIN,
    ROLE_ENUM.SUPER_ADMIN
  ),
  requireCompanyOwnership('id'),
  authorize('user', 'read'),
  generalRateLimit,
  validate(companyUuidParamSchema, 'params'),
  validate(companyMembersQuerySchema, 'query'),
  companyController.getCompanyMembers
);

/**
 * @route   POST /api/companies/:id/members
 * @desc    Add new member to company
 * @access  Private (Admin, Super Admin)
 */
router.post(
  '/:id/members',
  requireAnyRole(ROLE_ENUM.ADMIN, ROLE_ENUM.SUPER_ADMIN),
  requireCompanyOwnership('id'),
  authorize('user', 'write'),
  generalRateLimit,
  validate(companyUuidParamSchema, 'params'),
  validate(addCompanyMemberSchema),
  companyController.addCompanyMember
);

/**
 * @route   GET /api/companies/:id/members/:userId
 * @desc    GET single member from company
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/:id/members/:userId',
  requireAnyRole(ROLE_ENUM.ADMIN, ROLE_ENUM.SUPER_ADMIN),
  requireCompanyOwnership('id'),
  authorize('user', 'read'),
  generalRateLimit,
  validate(companyMembersQuerySchema, 'params'),
  companyController.getCompanyMember
);

/**
 * @route   DELETE /api/companies/:id/members/:userId
 * @desc    Remove member from company
 * @access  Private (Admin, Super Admin)
 */
router.delete(
  '/:id/members/:userId',
  requireAnyRole(ROLE_ENUM.ADMIN, ROLE_ENUM.SUPER_ADMIN),
  requireCompanyOwnership('id'),
  authorize('user', 'delete'),
  generalRateLimit,
  validate(companyMembersQuerySchema, 'params'),
  companyController.removeCompanyMember
);

/**
 * @route   POST /api/companies/:id/transfer-ownership
 * @desc    Transfer company ownership to another user
 * @access  Private (Company Owner only)
 */
router.post(
  '/:id/transfer-ownership',
  requireAnyRole(ROLE_ENUM.ADMIN, ROLE_ENUM.SUPER_ADMIN),
  requireCompanyOwnership('id'),
  authorize('company', 'write'),
  generalRateLimit,
  validate(companyUuidParamSchema, 'params'),
  validate(transferOwnershipSchema),
  companyController.transferOwnership
);

export default router;
