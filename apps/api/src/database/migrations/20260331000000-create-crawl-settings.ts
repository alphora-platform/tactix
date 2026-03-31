import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrawlSettings20260331000000 implements MigrationInterface {
  name = 'CreateCrawlSettings20260331000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crawl_settings" (
        "id"              integer         NOT NULL,
        "crawl_mode"      varchar         NOT NULL DEFAULT 'official',
        "active_regions"  varchar         NOT NULL,
        "active_patch"    varchar,
        "is_enabled"      boolean         NOT NULL DEFAULT true,
        "updated_at"      timestamptz     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crawl_settings" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "crawl_settings" ("id", "crawl_mode", "active_regions", "is_enabled")
      VALUES (1, 'official', 'NA,EUW,KR', true)
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crawl_settings"`);
  }
}
