import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePatchPredictions1772150326704 implements MigrationInterface {
    name = 'CreatePatchPredictions1772150326704'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."patch_predictions_predicted_direction_enum" AS ENUM('up', 'down', 'neutral')`);
        await queryRunner.query(`CREATE TABLE "patch_predictions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patch" character varying(16) NOT NULL, "comp_id" character varying(32) NOT NULL, "predicted_direction" "public"."patch_predictions_predicted_direction_enum" NOT NULL, "predicted_score" double precision NOT NULL, "actual_winrate_before" double precision, "actual_winrate_after" double precision, "accuracy_score" integer, "evaluated_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91395311b10eb42f48fc1feba2e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8426eb0b5edba5d743280d8c23" ON "patch_predictions" ("patch") `);
        await queryRunner.query(`CREATE INDEX "IDX_8d9a7948e447edd0656fd3c8a6" ON "patch_predictions" ("comp_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8d9a7948e447edd0656fd3c8a6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8426eb0b5edba5d743280d8c23"`);
        await queryRunner.query(`DROP TABLE "patch_predictions"`);
        await queryRunner.query(`DROP TYPE "public"."patch_predictions_predicted_direction_enum"`);
    }

}
