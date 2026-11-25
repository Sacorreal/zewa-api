import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminClientsInit1795643121399 implements MigrationInterface {
  name = 'AdminClientsInit1795643121399';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "actor_user_id" uuid, "tenant_id" uuid, "action" character varying(64) NOT NULL, "entity_type" character varying(64) NOT NULL, "entity_id" character varying(64), "previous_values" jsonb, "new_values" jsonb, "ip_address" character varying(64), "user_agent" character varying(512), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_489c43bce08ce9e013179157ae" ON "audit_logs"  ("entity_type", "entity_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_898d14750b88319b89b1ab66cd" ON "audit_logs"  ("tenant_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_status" AS ENUM('PENDING_ACTIVATION', 'ACTIVE', 'DISABLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."platform_role" AS ENUM('SUPERADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(254) NOT NULL, "password_hash" character varying(255), "status" "public"."user_status" NOT NULL DEFAULT 'PENDING_ACTIVATION', "platform_role" "public"."platform_role", "failed_login_attempts" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenant_status" AS ENUM('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" uuid NOT NULL, "name" character varying(150) NOT NULL, "tax_id" character varying(30) NOT NULL, "logo_key" text, "status" "public"."tenant_status" NOT NULL DEFAULT 'PENDING_ACTIVATION', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "activated_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid NOT NULL, CONSTRAINT "UQ_tenants_tax_id" UNIQUE ("tax_id"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c59559e7872bc9726adef4669f" ON "tenants"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1dba291f7611c0f2388055c40b" ON "tenants"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."auth_scope" AS ENUM('global', 'account', 'tenant')`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "family_id" uuid NOT NULL, "scope" "public"."auth_scope" NOT NULL, "tenant_id" uuid, "refresh_token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_id" uuid, "ip_address" character varying(64), "user_agent" character varying(512), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_auth_sessions_refresh_token_hash" UNIQUE ("refresh_token_hash"), CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_50ccaa6440288a06f0ba693ccc" ON "auth_sessions"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c9278e30a7d85fc2977283c4d2" ON "auth_sessions"  ("family_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."membership_role_name" AS ENUM('ADMINISTRADOR')`,
    );
    await queryRunner.query(
      `CREATE TABLE "membership_roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "membership_id" uuid NOT NULL, "role" "public"."membership_role_name" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_membership_roles_membership_role" UNIQUE ("membership_id", "role"), CONSTRAINT "PK_29085525c53a6d0b695d8e0f6ec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."membership_status" AS ENUM('PENDING', 'ACTIVE', 'REVOKED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "memberships" ("tenant_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "status" "public"."membership_status" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "activated_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_memberships_user_tenant" UNIQUE ("user_id", "tenant_id"), CONSTRAINT "PK_25d28bd932097a9e90495ede7b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a9c14741084d57ac0ec0cb52af" ON "memberships"  ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invitation_delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invitations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "membership_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "accepted_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "delivery_status" "public"."invitation_delivery_status" NOT NULL DEFAULT 'PENDING', "last_sent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_invitations_token_hash" UNIQUE ("token_hash"), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_39772d84b4df08bd411860b0fb" ON "invitations"  ("membership_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "FK_362ad28591b5e679733c37b1151" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_5dc49263cfc54258d6fa9282873" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" ADD CONSTRAINT "FK_cee7bc65abd4c38c856f1361fd6" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" ADD CONSTRAINT "FK_7c1e2fdfed4f6838e0c05ae5051" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" ADD CONSTRAINT "FK_a9c14741084d57ac0ec0cb52af3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_fecdffec754fa4d5cea98709776" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_39772d84b4df08bd411860b0fb1" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    // La auditoría es de solo inserción: ningún usuario de la aplicación puede alterarla.
    await queryRunner.query(
      `CREATE FUNCTION "prevent_audit_log_changes"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_logs es inmutable: % no está permitido', TG_OP; END; $$`,
    );
    await queryRunner.query(
      `CREATE TRIGGER "audit_logs_immutable" BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION "prevent_audit_log_changes"()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER "audit_logs_immutable" ON "audit_logs"`,
    );
    await queryRunner.query(`DROP FUNCTION "prevent_audit_log_changes"()`);
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_39772d84b4df08bd411860b0fb1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_fecdffec754fa4d5cea98709776"`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" DROP CONSTRAINT "FK_a9c14741084d57ac0ec0cb52af3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "memberships" DROP CONSTRAINT "FK_7c1e2fdfed4f6838e0c05ae5051"`,
    );
    await queryRunner.query(
      `ALTER TABLE "membership_roles" DROP CONSTRAINT "FK_cee7bc65abd4c38c856f1361fd6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_5dc49263cfc54258d6fa9282873"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "FK_362ad28591b5e679733c37b1151"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_39772d84b4df08bd411860b0fb"`,
    );
    await queryRunner.query(`DROP TABLE "invitations"`);
    await queryRunner.query(`DROP TYPE "public"."invitation_delivery_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a9c14741084d57ac0ec0cb52af"`,
    );
    await queryRunner.query(`DROP TABLE "memberships"`);
    await queryRunner.query(`DROP TYPE "public"."membership_status"`);
    await queryRunner.query(`DROP TABLE "membership_roles"`);
    await queryRunner.query(`DROP TYPE "public"."membership_role_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c9278e30a7d85fc2977283c4d2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_50ccaa6440288a06f0ba693ccc"`,
    );
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."auth_scope"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1dba291f7611c0f2388055c40b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c59559e7872bc9726adef4669f"`,
    );
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TYPE "public"."tenant_status"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."platform_role"`);
    await queryRunner.query(`DROP TYPE "public"."user_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_898d14750b88319b89b1ab66cd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_489c43bce08ce9e013179157ae"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
