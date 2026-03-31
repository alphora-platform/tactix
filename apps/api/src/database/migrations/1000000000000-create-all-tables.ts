import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllTables1000000000000 implements MigrationInterface {
  name = 'CreateAllTables1000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── patch_predictions enum ─────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."patch_predictions_predicted_direction_enum" AS ENUM('up', 'down', 'neutral')`
    );

    // ── players ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "players" (
        "puuid"           varchar         NOT NULL,
        "region"          varchar         NOT NULL,
        "summoner_name"   varchar,
        "tier"            varchar,
        "lp"              integer,
        "wins"            integer         NOT NULL DEFAULT 0,
        "losses"          integer         NOT NULL DEFAULT 0,
        "updated_at"      timestamptz     NOT NULL DEFAULT now(),
        "last_fetch_at"   timestamptz,
        CONSTRAINT "PK_players" PRIMARY KEY ("puuid")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_players_region_tier" ON "players" ("region", "tier")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_players_region" ON "players" ("region")`
    );

    // ── matches ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "matches" (
        "match_id"        varchar         NOT NULL,
        "game_version"    varchar         NOT NULL,
        "queue_id"        integer         NOT NULL,
        "game_datetime"   timestamptz     NOT NULL,
        "game_length"     float           NOT NULL,
        "tft_set_number"  integer         NOT NULL,
        "patch"           varchar,
        "region"          varchar,
        "created_at"      timestamptz     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_matches" PRIMARY KEY ("match_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_matches_version_datetime" ON "matches" ("game_version", "game_datetime")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_matches_patch_region" ON "matches" ("patch", "region")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_matches_game_version" ON "matches" ("game_version")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_matches_game_datetime" ON "matches" ("game_datetime")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_matches_tft_set_number" ON "matches" ("tft_set_number")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_matches_patch" ON "matches" ("patch")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_matches_region" ON "matches" ("region")`
    );

    // ── participants ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "participants" (
        "id"                        uuid            NOT NULL DEFAULT gen_random_uuid(),
        "match_id"                  varchar         NOT NULL,
        "puuid"                     varchar         NOT NULL,
        "placement"                 smallint        NOT NULL,
        "level"                     smallint        NOT NULL,
        "gold_left"                 integer         NOT NULL,
        "last_round"                integer,
        "time_eliminated"           float           NOT NULL,
        "total_damage_to_players"   integer         NOT NULL DEFAULT 0,
        "players_eliminated"        smallint        NOT NULL DEFAULT 0,
        CONSTRAINT "PK_participants" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_participant_match_puuid" UNIQUE ("match_id", "puuid"),
        CONSTRAINT "FK_participants_match" FOREIGN KEY ("match_id") REFERENCES "matches" ("match_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_puuid_match" ON "participants" ("puuid", "match_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participants_puuid" ON "participants" ("puuid")`
    );

    // ── participant_units ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "participant_units" (
        "id"              uuid            NOT NULL DEFAULT gen_random_uuid(),
        "match_id"        varchar         NOT NULL,
        "puuid"           varchar         NOT NULL,
        "character_id"    varchar         NOT NULL,
        "tier"            smallint        NOT NULL,
        "rarity"          smallint        NOT NULL,
        "items"           text[]          NOT NULL DEFAULT '{}',
        "participant_id"  uuid,
        CONSTRAINT "PK_participant_units" PRIMARY KEY ("id"),
        CONSTRAINT "FK_participant_units_participant" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_units_match_puuid" ON "participant_units" ("match_id", "puuid")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_units_character_id" ON "participant_units" ("character_id")`
    );

    // ── participant_traits ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "participant_traits" (
        "id"              uuid            NOT NULL DEFAULT gen_random_uuid(),
        "match_id"        varchar         NOT NULL,
        "puuid"           varchar         NOT NULL,
        "trait_name"      varchar         NOT NULL,
        "num_units"       smallint        NOT NULL,
        "style"           smallint        NOT NULL,
        "tier_current"    smallint        NOT NULL,
        "tier_total"      smallint        NOT NULL,
        "participant_id"  uuid,
        CONSTRAINT "PK_participant_traits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_participant_traits_participant" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_traits_match_puuid" ON "participant_traits" ("match_id", "puuid")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_traits_trait_name" ON "participant_traits" ("trait_name")`
    );

    // ── participant_augments ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "participant_augments" (
        "id"              uuid            NOT NULL DEFAULT gen_random_uuid(),
        "match_id"        varchar         NOT NULL,
        "puuid"           varchar         NOT NULL,
        "augment_name"    varchar         NOT NULL,
        "augment_index"   smallint        NOT NULL,
        "participant_id"  uuid,
        CONSTRAINT "PK_participant_augments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_participant_augments_participant" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_augments_match_puuid" ON "participant_augments" ("match_id", "puuid")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_augments_augment_name" ON "participant_augments" ("augment_name")`
    );

    // ── meta_snapshots ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meta_snapshots" (
        "id"            uuid            NOT NULL DEFAULT gen_random_uuid(),
        "snapshot_time" timestamptz     NOT NULL,
        "patch"         varchar         NOT NULL,
        "comp_id"       varchar         NOT NULL,
        "comp_name"     varchar,
        "trait_combo"   text[]          NOT NULL,
        "core_units"    text[],
        "play_rate"     float           NOT NULL,
        "winrate"       float           NOT NULL,
        "top4_rate"     float           NOT NULL,
        "avg_placement" float           NOT NULL,
        "sample_size"   integer         NOT NULL,
        "region"        varchar,
        "created_at"    timestamptz     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_snapshots" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_meta_snapshots_patch_time" ON "meta_snapshots" ("patch", "snapshot_time")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_meta_snapshots_patch" ON "meta_snapshots" ("patch")`
    );

    // ── patch_versions ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patch_versions" (
        "patch"         varchar(16)     NOT NULL,
        "is_current"    boolean         NOT NULL DEFAULT false,
        "first_seen_at" timestamptz     NOT NULL,
        "last_seen_at"  timestamptz     NOT NULL DEFAULT now(),
        "match_count"   integer         NOT NULL DEFAULT 0,
        CONSTRAINT "PK_patch_versions" PRIMARY KEY ("patch")
      )
    `);

    // ── crawl_settings ─────────────────────────────────────────────────────────
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

    // ── patch_predictions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patch_predictions" (
        "id"                       uuid            NOT NULL DEFAULT gen_random_uuid(),
        "patch"                    varchar(16)     NOT NULL,
        "comp_id"                  varchar(32)     NOT NULL,
        "predicted_direction"      "public"."patch_predictions_predicted_direction_enum" NOT NULL,
        "predicted_score"          double precision NOT NULL,
        "actual_winrate_before"    double precision,
        "actual_winrate_after"     double precision,
        "accuracy_score"           integer,
        "evaluated_at"             TIMESTAMP,
        "created_at"               TIMESTAMP       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patch_predictions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_patch_predictions_patch" ON "patch_predictions" ("patch")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_patch_predictions_comp_id" ON "patch_predictions" ("comp_id")`
    );

    // ── users ──────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
        "email"         VARCHAR(255)    NOT NULL,
        "username"      VARCHAR(100)    NOT NULL,
        "password_hash" VARCHAR(255)    NOT NULL,
        "created_at"    TIMESTAMP       NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patch_predictions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crawl_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patch_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meta_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "participant_augments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "participant_traits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "participant_units"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "matches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "players"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."patch_predictions_predicted_direction_enum"`
    );
  }
}
