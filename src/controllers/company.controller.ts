// src/controllers/company.controller.ts
import { NextFunction, Request, Response } from 'express';
import { CompanyService } from '../services/company.service';
import {
  AddCompanyMemberData,
  UpdateCompanyData,
} from '../types/company.types';

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();
  }

  // GET /api/companies/:id - Get company details
  getCompanyById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user has access to this company
      // const hasAccess = await this.companyService.validateUserCompanyAccess(
      //   user.id,
      //   id
      // );

      // if (!hasAccess && user.companyId !== id) {
      //   return res
      //     .status(403)
      //     .json({ message: 'Access denied to this company' });
      // }

      const includeStats = req.query.includeStats === 'true';

      const company = includeStats
        ? await this.companyService.getCompanyWithStats(id)
        : await this.companyService.getCompanyById(id);

      res.json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/companies/me - Get current user's company
  getCurrentCompany = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { user } = req;

      if (!user || !user.companyId) {
        return res.status(404).json({ message: 'No company found for user' });
      }

      const includeStats = req.query.includeStats === 'true';

      const company = includeStats
        ? await this.companyService.getCompanyWithStats(user.companyId)
        : await this.companyService.getCompanyById(user.companyId);

      res.json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/companies/:id - Update company
  updateCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { user } = req;
      const updateData: UpdateCompanyData = req.body;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user has access to this company
      // const hasAccess = await this.companyService.validateUserCompanyAccess(
      //   user.id,
      //   id
      // );

      // if (!hasAccess && user.companyId !== id) {
      //   return res
      //     .status(403)
      //     .json({ message: 'Access denied to this company' });
      // }

      const updatedCompany = await this.companyService.updateCompany(
        id,
        updateData
      );

      res.json({
        success: true,
        data: updatedCompany,
        message: 'Company updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/companies/:id - Delete company (Super Admin only)
  deleteCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await this.companyService.deleteCompany(id);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/companies/:id/members/:userId - List company members
  getCompanyMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id, userId } = req.params;
      const { user } = req;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await this.companyService.getCompanySingleMember(
        id,
        userId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/companies/:id/members - List company members
  getCompanyMembers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user has access to this company
      // const hasAccess = await this.companyService.validateUserCompanyAccess(
      //   user.id,
      //   id
      // );

      // if (!hasAccess && user.companyId !== id) {
      //   return res
      //     .status(403)
      //     .json({ message: 'Access denied to this company' });
      // }

      const queryParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
      };

      const result = await this.companyService.getCompanyMembers(
        id,
        queryParams
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/companies/:id/members - Add company member
  addCompanyMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { user } = req;
      const memberData: AddCompanyMemberData = req.body;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user has access to this company
      const hasAccess = await this.companyService.validateUserCompanyAccess(
        user.id,
        id
      );

      if (!hasAccess && user.companyId !== id) {
        return res
          .status(403)
          .json({ message: 'Access denied to this company' });
      }

      const createdUser = await this.companyService.addCompanyMember(
        id,
        user.id,
        memberData
      );

      res.status(201).json({
        success: true,
        data: createdUser,
        message: 'Member added successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/companies/:id/members/:userId - Remove company member
  removeCompanyMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id, userId } = req.params;
      const { user } = req;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify user has access to this company
      const hasAccess = await this.companyService.validateUserCompanyAccess(
        user.id,
        id
      );

      if (!hasAccess && user.companyId !== id) {
        return res
          .status(403)
          .json({ message: 'Access denied to this company' });
      }

      const result = await this.companyService.removeCompanyMember(
        id,
        userId,
        user.id
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/companies/:id/stats - Get company statistics
  getCompanyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const stats = await this.companyService.getCompanyStats(id);
      // console.log({ stats });
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/companies/:id/transfer-ownership - Transfer company ownership
  transferOwnership = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { newOwnerId } = req.body;
      const { user } = req;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!newOwnerId) {
        return res.status(400).json({ message: 'New owner ID is required' });
      }

      const updatedCompany = await this.companyService.transferOwnership(
        id,
        newOwnerId,
        user.id
      );

      res.json({
        success: true,
        data: updatedCompany,
        message: 'Ownership transferred successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
