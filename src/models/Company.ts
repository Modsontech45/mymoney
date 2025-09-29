import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyStatus } from '../types';
import { Currency } from './Currency';
import { Invite } from './Invite';
import { Notice } from './Notice';
import { Subscription } from './Subscription';
import { Transaction } from './Transaction';
import { User } from './User';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isCompanyInit: boolean;

  @Column({ type: 'enum', enum: CompanyStatus, default: CompanyStatus.ACTIVE })
  status: CompanyStatus;

  @Column('simple-json', { nullable: true })
  departments: string[];

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'ownerId' })
  owner: User | null;

  @Column({ unique: true, nullable: true })
  ownerId: string;

  @Column({ nullable: true, default: 259200000 })
  inviteExpiresAfter: number; // invite expiration in seconds, default: 3 days

  @ManyToOne(() => Currency, { eager: true })
  defaultCurrency: Currency;

  @RelationId((company: Company) => company.defaultCurrency)
  currencyId: string;

  @OneToMany(() => User, (user) => user.company, {
    cascade: true,
  })
  users: User[];

  @OneToMany(() => Transaction, (transaction) => transaction.company)
  transactions: Transaction[];

  @OneToMany(() => Notice, (notice) => notice.company)
  notices: Notice[];

  @OneToMany(() => Invite, (invite) => invite.company)
  invites: Invite[];

  @ManyToOne(() => Subscription, (subscription) => subscription.companies)
  subscription: Subscription;

  @RelationId((company: Company) => company.subscription)
  subscriptionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
