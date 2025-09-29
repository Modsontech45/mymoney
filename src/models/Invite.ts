import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InviteStatus, ROLE_ENUM } from '../types';
import { Company } from './Company';

@Entity('invites')
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, (company) => company.invites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column()
  companyId: string;

  @Column()
  invitedBy: string;

  @Column()
  targetEmail: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({
    type: 'enum',
    enum: ROLE_ENUM,
    array: true,
    default: [ROLE_ENUM.MEMBER],
  })
  roles: ROLE_ENUM[];

  @Column({ type: 'enum', enum: InviteStatus, default: InviteStatus.ACTIVE })
  status: InviteStatus;

  @Column({ unique: true })
  token: string;

  @Column('timestamptz')
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
