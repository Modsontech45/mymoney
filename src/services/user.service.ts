// src/services/user.service.ts
import crypto from 'crypto';
import {
  FindManyOptions,
  FindOptionsWhere,
  ILike,
  In,
  Repository,
} from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Company } from '../models/Company';
import { Invite } from '../models/Invite';
import { User } from '../models/User';
import {
  AcceptInviteData,
  CreateCompanyInvite,
  CreateCompanyUserData,
  InviteQueryParams,
  InviteStatus,
  PaginatedResponse,
  ROLE_ENUM,
  UpdateCompanyUserData,
  UserQueryParams,
  UserStatus,
} from '../types';
import { CACHE_CONFIG, PAGINATION } from '../utils/constant';
import { NotFoundError, ValidationError } from '../utils/error';
import { generatePassword } from '../utils/helpers';
import { AuthService } from './auth.service';
import { CacheService } from './cache.service';
import { EmailService } from './email.service';
import { RBACService } from './rbac.service';

export class UserService {
  private userRepo: Repository<User>;
  private companyRepo: Repository<Company>;
  private inviteRepo: Repository<Invite>;
  private rbacService: RBACService;
  private authService: AuthService;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
    this.companyRepo = AppDataSource.getRepository(Company);
    this.inviteRepo = AppDataSource.getRepository(Invite);
    this.rbacService = new RBACService();
    this.authService = new AuthService();
  }

  private generateCacheKey(
    type: string,
    params: Record<string, unknown> = {}
  ): string {
    const keyParts = [type];
    if (params.id) keyParts.push(`${params.id}`);
    if (params.companyId) keyParts.push(`company:${params.companyId}`);
    if (params.page) keyParts.push(`page:${params.page}`);
    if (params.limit) keyParts.push(`limit:${params.limit}`);
    return `user:${keyParts.join(':')}`;
  }

  private async invalidateUserCaches(
    companyId: string,
    userId?: string
  ): Promise<void> {
    const patterns = [`user:list:company:${companyId}*`];
    if (userId) patterns.push(`user:detail:${userId}`);
    await Promise.all(
      patterns.map((pattern) => CacheService.deletePattern(pattern))
    );
  }

  private buildInviteQueryFilters(
    params: InviteQueryParams,
    companyId: string
  ): FindManyOptions<Invite> {
    const relations = ['company'];
    const order: any = {};
    const where: FindOptionsWhere<Invite>[] = [];
    const baseCondition: FindOptionsWhere<Invite> = { companyId };

    if (params.status) {
      baseCondition.status = params.status;
    } else if (!params.includeExpired) {
      baseCondition.status = In([InviteStatus.ACTIVE]);
    }

    if (params.role) baseCondition.roles = In([params.role]);

    // Date range filters
    if (params.dateFrom || params.dateTo) {
      const dateCondition: any = {};
      if (params.dateFrom) {
        dateCondition.createdAt = { $gte: params.dateFrom };
      }
      if (params.dateTo) {
        dateCondition.createdAt = {
          ...dateCondition.createdAt,
          $lte: params.dateTo,
        };
      }
      Object.assign(baseCondition, dateCondition);
    }

    // Search filter (OR across targetEmail, firstName, lastName)
    if (params.search) {
      where.push(
        { ...baseCondition, targetEmail: ILike(`%${params.search}%`) },
        { ...baseCondition, firstName: ILike(`%${params.search}%`) },
        { ...baseCondition, lastName: ILike(`%${params.search}%`) }
      );
    } else {
      where.push(baseCondition);
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

  async getAllInvites(
    params: InviteQueryParams,
    companyId: string
  ): Promise<PaginatedResponse<Invite>> {
    const queryOptions = this.buildInviteQueryFilters(params, companyId);
    const [invites, total] = await this.inviteRepo.findAndCount(queryOptions);
    const page = params.page || PAGINATION.defaultPage;
    const limit = Math.min(
      params.limit || PAGINATION.defaultLimit,
      PAGINATION.maxLimit
    );
    return {
      data: invites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  private buildQueryFilters(
    params: UserQueryParams,
    companyId: string
  ): FindManyOptions<User> {
    const relations = ['company'];
    const order: any = {};
    const where: FindOptionsWhere<User>[] = [];
    const baseCondition: FindOptionsWhere<User> = { companyId };

    if (params.status) {
      baseCondition.status = params.status;
    } else if (!params.includeInactive) {
      baseCondition.status = In([UserStatus.ACTIVE, UserStatus.PENDING]);
    }

    if (params.role) baseCondition.roles = In([params.role]);

    if (params.search) {
      where.push(
        { ...baseCondition, firstName: ILike(`%${params.search}%`) },
        { ...baseCondition, lastName: ILike(`%${params.search}%`) },
        { ...baseCondition, email: ILike(`%${params.search}%`) }
      );
    } else {
      where.push(baseCondition);
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

  async getUsers(
    params: UserQueryParams,
    companyId: string
  ): Promise<PaginatedResponse<User>> {
    const cacheKey = this.generateCacheKey('list', {
      companyId,
      page: params.page,
      limit: params.limit,
      filters: params,
    });
    return CacheService.withCache(
      cacheKey,
      async () => {
        const queryOptions = this.buildQueryFilters(params, companyId);
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

  async getUserById(id: string, companyId?: string): Promise<User> {
    const cacheKey = `user:detail:${id}`;
    return CacheService.withCache(
      cacheKey,
      async () => {
        const user = await this.userRepo.findOne({
          where: { id, companyId },
          relations: ['company'],
        });
        if (!user)
          throw new NotFoundError(
            'User not found' + companyId ? ' in this company.' : '.'
          );
        return user.toSafeObject();
      },
      true,
      CACHE_CONFIG.detail
    );
  }

  async createInvite(
    data: CreateCompanyInvite,
    companyId: string,
    userId: string
  ): Promise<Invite> {
    const existingUser = await this.userRepo.findOne({
      where: { email: data.email },
    });
    if (existingUser)
      throw new ValidationError('User already exists with this email');

    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) throw new ValidationError('Company not found');

    const existingInvite = await this.inviteRepo.findOne({
      where: {
        targetEmail: data.email,
        companyId,
        status: InviteStatus.ACTIVE,
      },
    });
    if (existingInvite)
      throw new ValidationError('Active invite already exists for this email');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + (company?.inviteExpiresAfter || 72 * 60 * 60 * 1000)
    );

    const invite = this.inviteRepo.create({
      targetEmail: data.email,
      roles: this.validateRoles(data.roles),
      companyId,
      company,
      token,
      invitedBy: userId,
      status: InviteStatus.ACTIVE,
      expiresAt,
    });

    const savedInvite = await this.inviteRepo.save(invite);
    await EmailService.sendInvitationEmail(
      data.email,
      company?.name || 'Company',
      token
    );
    await this.invalidateUserCaches(companyId);
    return savedInvite;
  }

  async createUser(
    data: CreateCompanyUserData & { joinedAt?: Date },
    companyId: string,
    userId: string,
    invited = false
  ): Promise<User> {
    const existingUser = await this.userRepo.findOne({
      where: { email: data.email },
    });
    if (existingUser)
      throw new ValidationError('User already exists with this email');

    const company = await this.companyRepo.findOne({
      where: { id: companyId },
    });
    if (!company) throw new ValidationError('Company not found');

    const roles = this.validateRoles(data.roles);
    const password = data.password ?? generatePassword('MFB', 12);

    const user = this.userRepo.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      profilePicture: data.profilePicture,
      roles,
      companyId,
      password,
      invitedBy: userId,
      company,
      isEmailVerified: invited,
      status: !!invited ? UserStatus.PENDING : UserStatus.ACTIVE, // Will be Active after email verification
      joinedAt: data.joinedAt || new Date(),
    });

    const savedUser = await this.userRepo.save(user);
    if (!invited)
      await this.authService.processEmail(
        savedUser.email,
        'verify',
        savedUser,
        true,
        password
      );
    await this.invalidateUserCaches(companyId);
    return savedUser.toSafeObject();
  }

  async updateUser(
    id: string,
    data: UpdateCompanyUserData,
    companyId: string
  ): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, companyId },
      relations: ['company'],
    });
    if (!user) throw new NotFoundError('User not found');

    const previousStatus = user.status;
    const previousRoles = [...user.roles];

    let roles = user.roles;
    if (data.roles) roles = this.validateRoles(data.roles);

    Object.assign(user, { ...data, roles });
    const updatedUser = await this.userRepo.save(user);

    if (data.status && data.status !== previousStatus) {
      try {
        if (
          data.status === UserStatus.ACTIVE &&
          previousStatus !== UserStatus.ACTIVE
        ) {
          await EmailService.sendAccountActivationEmail(updatedUser);
        } else if (data.status === UserStatus.SUSPENDED) {
          await EmailService.sendAccountSuspensionEmail(updatedUser);
        }
      } catch (err) {
        console.error('Failed to send status change email:', err);
      }
    }

    if (
      data.roles &&
      JSON.stringify(data.roles) !== JSON.stringify(previousRoles)
    ) {
      try {
        await EmailService.sendRoleUpdateEmail(
          updatedUser,
          previousRoles,
          data.roles
        );
      } catch (err) {
        console.error('Failed to send role change email:', err);
      }
    }

    await this.invalidateUserCaches(companyId, id);
    return this.getUserById(id, companyId);
  }

  async deleteUser(
    id: string,
    companyId: string
  ): Promise<{ message: string }> {
    const user = await this.getUserById(id, companyId);
    await this.userRepo.remove(user);
    return { message: 'User deleted successfully' };
  }

  async deleteInvite(
    id: string,
    companyId: string
  ): Promise<{ message: string }> {
    const invite = await this.inviteRepo.findOne({ where: { id, companyId } });
    if (!invite) throw new NotFoundError('Invite not found');
    await this.inviteRepo.softRemove(invite);
    return { message: 'Invite deleted successfully' };
  }

  async checkInviteToken(token: string) {
    const invite = await this.inviteRepo.findOne({
      where: { token },
      relations: ['company'],
    });
    if (!invite) throw new ValidationError('Invalid Invite');

    if (
      invite.status !== InviteStatus.ACTIVE ||
      new Date() > invite.expiresAt
    ) {
      invite.status = InviteStatus.EXPIRED;
      await this.inviteRepo.save(invite);
      throw new ValidationError(
        'Invite expired, contact admin of your company'
      );
    }

    return { valid: true, invite };
  }

  async acceptInvite(data: AcceptInviteData): Promise<User> {
    const { token, ...details } = data;
    const { valid, invite } = await this.checkInviteToken(token);
    if (!valid) throw new ValidationError('Invite Invalid');

    const savedUser = await this.createUser(
      {
        ...details,
        roles: invite.roles,
        email: invite.targetEmail,
        firstName: invite.firstName ?? details.firstName,
        lastName: invite.lastName ?? details.lastName,
        joinedAt: new Date(),
      },
      invite.companyId,
      invite.invitedBy,
      true
    );

    invite.status = InviteStatus.USED;
    await this.inviteRepo.save(invite);
    return savedUser;
  }

  private validateRoles(roles?: ROLE_ENUM[]): ROLE_ENUM[] {
    if (!roles || !roles.length) return [ROLE_ENUM.MEMBER];
    const validRoles = roles.filter((r) =>
      Object.values(ROLE_ENUM).includes(r)
    );
    return validRoles.length ? validRoles : [ROLE_ENUM.MEMBER];
  }
}
