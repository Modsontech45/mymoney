import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1755788998287 implements MigrationInterface {
    name = 'InitSchema1755788998287'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('income', 'expense', 'transfer')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "amount" numeric(15,2) NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "comment" text, "department" character varying, "action" character varying, "transactionDate" date NOT NULL, "isLocked" boolean NOT NULL DEFAULT false, "companyId" uuid NOT NULL, "currencyId" uuid NOT NULL, "createdBy" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "currencies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "symbol" character varying NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_9f8d0972aeeb5a2277e40332d29" UNIQUE ("code"), CONSTRAINT "PK_d528c54860c4182db13548e08c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."invites_roles_enum" AS ENUM('super_admin', 'admin', 'manager', 'member')`);
        await queryRunner.query(`CREATE TYPE "public"."invites_status_enum" AS ENUM('active', 'expired', 'deleted', 'used')`);
        await queryRunner.query(`CREATE TABLE "invites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyId" character varying NOT NULL, "invitedBy" character varying NOT NULL, "targetEmail" character varying NOT NULL, "firstName" character varying, "lastName" character varying, "roles" "public"."invites_roles_enum" array NOT NULL DEFAULT '{member}', "status" "public"."invites_status_enum" NOT NULL DEFAULT 'active', "token" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "company_id" uuid, CONSTRAINT "UQ_18a9a6c85f7cc6f42ebef3b3188" UNIQUE ("token"), CONSTRAINT "PK_aa52e96b44a714372f4dd31a0af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notices_type_enum" AS ENUM('text', 'pdf')`);
        await queryRunner.query(`CREATE TABLE "notices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "type" "public"."notices_type_enum" NOT NULL, "details" text, "pdfPath" character varying, "tags" text, "companyId" uuid NOT NULL, "createdBy" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3eb18c29da25d6935fcbe584237" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_plan_enum" AS ENUM('basic', 'premium', 'enterprise')`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan" "public"."subscriptions_plan_enum" NOT NULL, "name" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "maxTeamMembers" integer NOT NULL, "maxSaves" integer NOT NULL, "features" text, CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'pending', 'suspended')`);
        await queryRunner.query(`CREATE TYPE "public"."users_roles_enum" AS ENUM('super_admin', 'admin', 'manager', 'member')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "serialNumber" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying DEFAULT '', "email" character varying NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "password" character varying, "googleId" character varying, "isEmailVerified" boolean NOT NULL DEFAULT false, "isOnboarding" boolean NOT NULL DEFAULT true, "phoneNumber" character varying, "profilePicture" character varying, "lastLogin" TIMESTAMP WITH TIME ZONE, "loginAttempts" integer NOT NULL DEFAULT '0', "lockUntil" TIMESTAMP WITH TIME ZONE, "roles" "public"."users_roles_enum" array NOT NULL DEFAULT '{member}', "companyId" uuid, "invitedBy" character varying, "joinedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_86e5daa8b8821a4ab0fedca2f44" UNIQUE ("serialNumber"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."companies_status_enum" AS ENUM('active', 'inactive', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "isCompanyInit" boolean NOT NULL DEFAULT false, "status" "public"."companies_status_enum" NOT NULL DEFAULT 'active', "departments" text, "ownerId" uuid, "inviteExpiresAfter" integer DEFAULT '259200000', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "defaultCurrencyId" uuid, "subscriptionId" uuid, CONSTRAINT "UQ_6dcdcbb7d72f64602307ec4ab39" UNIQUE ("ownerId"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_c5c4bc0ef04ce5729481c60b559" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_89de751d3265e411a089b8e407f" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invites" ADD CONSTRAINT "FK_767f1a9880aab5cdaa0634121ab" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notices" ADD CONSTRAINT "FK_33f403278a251b841b61fb7459e" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_6f9395c9037632a31107c8a9e58" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_6dcdcbb7d72f64602307ec4ab39" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_7248a50f11f3bd95f7f539732f0" FOREIGN KEY ("defaultCurrencyId") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "companies" ADD CONSTRAINT "FK_34cb9a62a32ace705b0d1cc249a" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_34cb9a62a32ace705b0d1cc249a"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_7248a50f11f3bd95f7f539732f0"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP CONSTRAINT "FK_6dcdcbb7d72f64602307ec4ab39"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_6f9395c9037632a31107c8a9e58"`);
        await queryRunner.query(`ALTER TABLE "notices" DROP CONSTRAINT "FK_33f403278a251b841b61fb7459e"`);
        await queryRunner.query(`ALTER TABLE "invites" DROP CONSTRAINT "FK_767f1a9880aab5cdaa0634121ab"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_89de751d3265e411a089b8e407f"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_c5c4bc0ef04ce5729481c60b559"`);
        await queryRunner.query(`DROP TABLE "companies"`);
        await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_roles_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_plan_enum"`);
        await queryRunner.query(`DROP TABLE "notices"`);
        await queryRunner.query(`DROP TYPE "public"."notices_type_enum"`);
        await queryRunner.query(`DROP TABLE "invites"`);
        await queryRunner.query(`DROP TYPE "public"."invites_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."invites_roles_enum"`);
        await queryRunner.query(`DROP TABLE "currencies"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    }

}
