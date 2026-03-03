import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import {
  MATERIALIZED_VIEW_DEFINITIONS,
  MaterializedViewDefinition,
} from './materialized-view.definitions';

/**
 * MaterializedViewSyncService — the "synchronize: true" for materialized views.
 *
 * On every application boot it compares each view's SQL body (via MD5 checksum
 * stored in a dedicated `_mv_checksums` table) against the definition in
 * `materialized-view.definitions.ts` and:
 *
 *   - Creates the view + indexes if it does not exist yet.
 *   - Drops and recreates the view + indexes if the SQL body has changed.
 *   - Skips the view if the checksum matches (fast path).
 *
 * This removes the need to write migration files for view changes —
 * just update the SQL in definitions.ts and restart the app.
 *
 * The checksum table (`_mv_checksums`) is created automatically on first boot.
 */
@Injectable()
export class MaterializedViewSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MaterializedViewSyncService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureChecksumTable();
    await this.syncAll();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Creates the checksum tracking table if it does not exist.
   * This table stores one row per materialized view with its SQL MD5.
   */
  private async ensureChecksumTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS _mv_checksums (
        view_name   TEXT PRIMARY KEY,
        checksum    TEXT NOT NULL,
        synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  /** Iterates over all view definitions and syncs each one. */
  private async syncAll(): Promise<void> {
    this.logger.log('[MVSync] Starting materialized view sync…');

    for (const def of MATERIALIZED_VIEW_DEFINITIONS) {
      try {
        await this.syncOne(def);
      } catch (err) {
        // Log but don't crash the whole app boot — the view might work on retry.
        this.logger.error(`[MVSync] Failed to sync view "${def.name}": ${(err as Error).message}`);
      }
    }

    this.logger.log('[MVSync] Materialized view sync complete.');
  }

  private async syncOne(def: MaterializedViewDefinition): Promise<void> {
    const newChecksum = this.md5(def.sql);
    const storedChecksum = await this.getStoredChecksum(def.name);
    const viewExists = await this.viewExists(def.name);

    if (viewExists && storedChecksum === newChecksum) {
      this.logger.debug(`[MVSync] "${def.name}" is up-to-date — skipping.`);
      return;
    }

    if (viewExists) {
      this.logger.log(
        `[MVSync] "${def.name}" SQL changed (stored: ${storedChecksum?.slice(
          0,
          8
        )}, new: ${newChecksum.slice(0, 8)}) — recreating.`
      );
      await this.dropView(def.name);
    } else {
      this.logger.log(`[MVSync] "${def.name}" not found — creating.`);
    }

    await this.createView(def);
    await this.upsertChecksum(def.name, newChecksum);
    this.logger.log(`[MVSync] "${def.name}" synced successfully.`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async viewExists(viewName: string): Promise<boolean> {
    const rows = await this.dataSource.query<{ count: string }[]>(
      `
      SELECT COUNT(*) AS count
      FROM pg_matviews
      WHERE matviewname = $1
    `,
      [viewName]
    );
    return parseInt(rows[0].count, 10) > 0;
  }

  private async getStoredChecksum(viewName: string): Promise<string | null> {
    const rows = await this.dataSource.query<{ checksum: string }[]>(
      `SELECT checksum FROM _mv_checksums WHERE view_name = $1`,
      [viewName]
    );
    return rows.length > 0 ? rows[0].checksum : null;
  }

  private async dropView(viewName: string): Promise<void> {
    await this.dataSource.query(`DROP MATERIALIZED VIEW IF EXISTS ${viewName} CASCADE`);
    await this.dataSource.query(`DELETE FROM _mv_checksums WHERE view_name = $1`, [viewName]);
  }

  private async createView(def: MaterializedViewDefinition): Promise<void> {
    // Create the view
    await this.dataSource.query(`CREATE MATERIALIZED VIEW ${def.name} AS ${def.sql}`);

    // Create unique index (required for REFRESH CONCURRENTLY)
    await this.dataSource.query(`
      CREATE UNIQUE INDEX ${def.uniqueIndex.name}
        ON ${def.name} (${def.uniqueIndex.columns})
    `);

    // Create any additional supporting indexes
    for (const idx of def.indexes ?? []) {
      await this.dataSource.query(`
        CREATE INDEX ${idx.name}
          ON ${def.name} (${idx.columns})
      `);
    }
  }

  private async upsertChecksum(viewName: string, checksum: string): Promise<void> {
    await this.dataSource.query(
      `
      INSERT INTO _mv_checksums (view_name, checksum, synced_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (view_name) DO UPDATE
        SET checksum  = EXCLUDED.checksum,
            synced_at = NOW()
    `,
      [viewName, checksum]
    );
  }

  /** MD5 of the SQL body (normalised: trimmed & collapsed whitespace). */
  private md5(sql: string): string {
    const normalised = sql.replace(/\s+/g, ' ').trim();
    return crypto.createHash('md5').update(normalised).digest('hex');
  }
}
