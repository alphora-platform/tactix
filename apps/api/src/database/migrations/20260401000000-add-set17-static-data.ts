import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSet17StaticData20260401000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "set17_champions" (
        "id" SERIAL PRIMARY KEY,
        "api_name" VARCHAR NOT NULL UNIQUE,
        "display_name" VARCHAR NOT NULL,
        "cost" INT NOT NULL,
        "traits" TEXT[] NOT NULL,
        "role" VARCHAR NOT NULL,
        "dmg_type" VARCHAR NOT NULL,
        "row_position" VARCHAR NOT NULL,
        "set_number" INT NOT NULL DEFAULT 17,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_set17_champions_cost" ON "set17_champions" ("cost")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_set17_champions_set_number" ON "set17_champions" ("set_number")`
    );

    await queryRunner.query(`
      CREATE TABLE "set17_traits" (
        "id" SERIAL PRIMARY KEY,
        "api_name" VARCHAR NOT NULL UNIQUE,
        "display_name" VARCHAR NOT NULL,
        "trait_type" VARCHAR NOT NULL,
        "breakpoints" INT[] NOT NULL,
        "description" TEXT NOT NULL,
        "set_number" INT NOT NULL DEFAULT 17,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_set17_traits_set_number" ON "set17_traits" ("set_number")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "set17_traits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "set17_champions"`);
  }
}
