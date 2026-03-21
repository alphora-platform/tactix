import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers20260321000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
        "email"         VARCHAR(255) NOT NULL,
        "username"      VARCHAR(100) NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
