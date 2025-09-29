// src/services/company.service.ts
import {
  FindManyOptions,
  FindOptionsWhere,
  ILike,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Company } from '../models/Company';
import { Invite } from '../models/Invite';
import { User } from '../models/User';
import { InviteStatus, PaginatedResponse, UserStatus } from '../types';
import {
  AddCompanyMemberData,
  CompanyMemberQueryParams,
  CompanyQueryParams,
  CompanyStats,
  CompanyWithStats,
  CreateCompanyData,
  UpdateCompanyData,
} from '../types/company.types';
import { CACHE_CONFIG, PAGINATION } from '../utils/constant';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/error';
import { CacheService } from './cache.service';
import { EmailService } from './email.service';
import { UserService } from './user.service';

export class CompanyService {
  private companyRepo: Repository<Company>;
  private userRepo: Repository<User>;
  private inviteRepo: Repository<Invite>;
  private userService: UserService;

  constructor() {
    this.companyRepo = AppDataSource.getRepository(Company);
    this.userRepo = AppDataSource.getRepository(User);
    this.inviteRepo = AppDataSource.getRepository(Invite);
    this.userService = new UserService();
  }

  private generateCacheKey(
    type: string,
    params: Record<string, unknown> = {}
  ): string {
    const keyParts = [type];
    if (params.id) keyParts.push(`${params.id}`);
    if (params.userId) keyParts.push(`${params.userId}`);
    if (params.page) keyParts.push(`page:${params.page}`);
    if (params.limit) keyParts.push(`limit:${params.limit}`);
    return `company:${keyParts.join(':')}`;
  }

  private async invalidateCompanyCaches(companyId?: string): Promise<void> {
    const patterns = ['company:list:*'];
    if (companyId) {
      patterns.push(
        `company:detail:${companyId}`,
        `company:stats:${companyId}`,
        `company:members:${companyId}*`,
        `company:member:${companyId}*`
      );
    }
    await Promise.all(
      patterns.map((pattern) => CacheService.deletePattern(pattern))
    ).then((res) => console.log(res));
  }

  private buildQueryFilters(
    params: CompanyQueryParams
  ): FindManyOptions<Company> {
    const relations = ['owner', 'defaultCurrency', 'subscription'];
    const order: any = {};
    const where: FindOptionsWhere<Company> = {};

    if (params.search) {
      where.name = ILike(`%${params.search}%`);
    }

    if (params.status !== undefined) {
      where.status = params.status;
    }

    if (params.hasOwner !== undefined) {
      if (params.hasOwner) {
        // Has owner - ownerId is not null
        where.ownerId = Not(IsNull());
      } else {
        // No owner - ownerId is null
        where.ownerId = IsNull();
      }
    }

    order[params.sortBy || 'createdAt'] = params.sortOrder || 'DESC';

    return {
      where,
      relations,
      order,
      skip:
        ((params.page || PAGINATION.defaultPage) - 1) *
        (params.limit || PAGINATION.defaultLimit),
      take: Math.min(
        params.limit || PAGINATION.defaultLimit,
        PAGINATION.maxLimit
      ),
    };
  }

  async getCompanies(
    params: CompanyQueryParams
  ): Promise<PaginatedResponse<Company>> {
    const cacheKey = this.generateCacheKey('list', {
      page: params.page,
      limit: params.limit,
      filters: params,
    });

    return CacheService.withCache(
      cacheKey,
      async () => {
        const queryOptions = this.buildQueryFilters(params);
        const [companies, total] =
          await this.companyRepo.findAndCount(queryOptions);

        const page = params.page || PAGINATION.defaultPage;
        const limit = Math.min(
          params.limit || PAGINATION.defaultLimit,
          PAGINATION.maxLimit
        );

        return {
          data: companies,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        };
      },
      true,
      CACHE_CONFIG.list
    );
  }

  async getCompanyById(id: string): Promise<Company> {
    const cacheKey = `company:detail:${id}`;

    return CacheService.withCache(
      cacheKey,
      async () => {
        const company = await this.companyRepo.findOne({
          where: { id },
          relations: ['owner', 'defaultCurrency'],
        });

        if (!company) {
          throw new NotFoundError('Company not found');
        }

        return company;
      },
      true,
      CACHE_CONFIG.detail
    );
  }

  async getCompanyWithStats(id: string): Promise<CompanyWithStats> {
    const cacheKey = `company:stats:${id}`;

    return CacheService.withCache(
      cacheKey,
      async () => {
        const company = await this.getCompanyById(id);
        const stats = await this.getCompanyStats(id);
        console.log(company, stats);
        return {
          ...company,
          stats,
        };
      },
      true,
      CACHE_CONFIG.detail
    );
  }

  async getCompanyStats(companyId: string): Promise<CompanyStats> {
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      totalInvites,
      activeInvites,
      company,
    ] = await Promise.all([
      this.userRepo.count({ where: { companyId } }),
      this.userRepo.count({ where: { companyId, status: UserStatus.ACTIVE } }),
      this.userRepo.count({ where: { companyId, status: UserStatus.PENDING } }),
      this.userRepo.count({
        where: { companyId, status: UserStatus.SUSPENDED },
      }),
      this.inviteRepo.count({ where: { companyId } }),
      this.inviteRepo.count({
        where: { companyId, status: InviteStatus.ACTIVE },
      }),
      this.companyRepo.findOne({ where: { id: companyId } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      totalInvites,
      activeInvites,
      departments: company?.departments || [],
    };
  }

  async createCompany(data: CreateCompanyData): Promise<Company> {
    // Validate owner exists if provided
    if (data.ownerId) {
      await this.userService.getUserById(data.ownerId);
    }

    const company = this.companyRepo.create({
      ...data,
      inviteExpiresAfter: data.inviteExpiresAfter ?? 259200000, // 3 days default
    });

    const savedCompany = await this.companyRepo.save(company);
    await this.invalidateCompanyCaches();

    return this.getCompanyById(savedCompany.id);
  }

  async updateCompany(id: string, data: UpdateCompanyData): Promise<Company> {
    const company = await this.getCompanyById(id);

    // Validate owner exists if being updated
    if (data.ownerId) {
      await this.userService.getUserById(data.ownerId);
    }

    Object.assign(company, data);
    await this.companyRepo.save(company);
    await this.invalidateCompanyCaches(id);

    return this.getCompanyById(id);
  }

  async deleteCompany(id: string): Promise<{ message: string }> {
    const company = await this.getCompanyById(id);

    // Check if company has users except owner
    const userCount = await this.userRepo.count({
      where: { companyId: id, id: Not(company.ownerId) },
    });
    console.log({ userCount });
    if (userCount > 0) {
      throw new ValidationError('Cannot delete company with existing users');
    }

    await this.companyRepo.softRemove(company);
    await this.userService.deleteUser(company.ownerId, company.id);
    await this.invalidateCompanyCaches(id);

    return { message: 'Company deleted successfully' };
  }

  async getCompanyMembers(
    companyId: string,
    params: CompanyMemberQueryParams
  ): Promise<PaginatedResponse<User>> {
    const cacheKey = this.generateCacheKey('members', {
      companyId,
      page: params.page,
      limit: params.limit,
      search: params.search,
    });

    return CacheService.withCache(
      cacheKey,
      async () => {
        // Verify company exists
        await this.getCompanyById(companyId);

        const queryOptions: FindManyOptions<User> = {
          where: { companyId },
          relations: ['company'],
          order: { [params.sortBy || 'createdAt']: params.sortOrder || 'DESC' },
          skip:
            ((params.page || PAGINATION.defaultPage) - 1) *
            (params.limit || PAGINATION.defaultLimit),
          take: Math.min(
            params.limit || PAGINATION.defaultLimit,
            PAGINATION.maxLimit
          ),
        };

        if (params.search) {
          queryOptions.where = [
            { companyId, firstName: ILike(`%${params.search}%`) },
            { companyId, lastName: ILike(`%${params.search}%`) },
            { companyId, email: ILike(`%${params.search}%`) },
          ];
        }

        const [users, total] = await this.userRepo.findAndCount(queryOptions);

        const page = params.page || PAGINATION.defaultPage;
        const limit = Math.min(
          params.limit || PAGINATION.defaultLimit,
          PAGINATION.maxLimit
        );

        return {
          data: users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        };
      },
      true,
      CACHE_CONFIG.list
    );
  }

  async getCompanySingleMember(
    companyId: string,
    userId: string
  ): Promise<User> {
    // Verify company exists
    await this.getCompanyById(companyId);
    return this.userService.getUserById(userId, companyId);
  }

  async addCompanyMember(
    companyId: string,
    userId: string,
    data: AddCompanyMemberData
  ): Promise<User> {
    // Verify company exists
    await this.getCompanyById(companyId);

    // Check if user already exists in the company
    const existingUser = await this.userRepo.findOne({
      where: { email: data.email, companyId },
    });

    if (existingUser) {
      throw new ValidationError('User is already a member of this company');
    }

    // Use the existing user service to create the user
    const createdUser = await this.userService.createUser(
      {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        roles: data.roles,
      },
      companyId,
      userId
    );

    await this.invalidateCompanyCaches(companyId);
    return createdUser;
  }

  async removeCompanyMember(
    companyId: string,
    userId: string,
    currentUserId: string
  ): Promise<{ message: string }> {
    // Verify company exists
    const company = await this.getCompanyById(companyId);

    // Prevent self-removal
    if (userId === currentUserId) {
      throw new ValidationError('Cannot remove yourself from the company');
    }

    // Prevent removing company owner
    if (company.ownerId === userId) {
      throw new ValidationError('Cannot remove the company owner');
    }

    // Verify user exists and belongs to the company
    const user = await this.userService.getUserById(userId, companyId);

    await this.userService.deleteUser(user.id, companyId);
    await this.invalidateCompanyCaches(companyId);

    // Send notification email
    try {
      await EmailService.sendMemberRemovalEmail(user, company.name);
    } catch (error) {
      console.error('Failed to send member removal email:', error);
    }

    return { message: 'Member removed successfully' };
  }

  async validateUserCompanyAccess(
    userId: string,
    companyId: string
  ): Promise<boolean> {
    const user = await this.userService.getUserById(userId, companyId);
    return !!user;
  }

  async transferOwnership(
    companyId: string,
    newOwnerId: string,
    userId: string
  ): Promise<Company> {
    const company = await this.getCompanyById(companyId);
    console.log({
      companyId,
      newOwnerId,
      userId,
    });
    // Verify current user is the owner
    if (company.ownerId !== userId) {
      throw new ForbiddenError('Only the company owner can transfer ownership');
    }

    // Verify current user is not the new  owner
    if (company.ownerId === newOwnerId) {
      throw new ValidationError('New owner needs to be a different user');
    }

    // Verify new owner exists and belongs to the company
    const newOwner = await this.userService.getUserById(newOwnerId, companyId);
    const previousOwner = await this.userService.getUserById(userId, companyId);
    console.log({ newOwner });
    company.ownerId = newOwnerId;
    company.owner = newOwner;
    await this.companyRepo.save(company);
    await this.invalidateCompanyCaches(companyId);

    // Send notification emails
    try {
      await Promise.all([
        EmailService.sendOwnershipTransferEmail(newOwner, company.name, 'new'),
        EmailService.sendOwnershipTransferEmail(
          previousOwner,
          company.name,
          'previous'
        ),
      ]);
    } catch (error) {
      console.error('Failed to send ownership transfer emails:', error);
    }

    return this.getCompanyById(companyId);
  }
}
