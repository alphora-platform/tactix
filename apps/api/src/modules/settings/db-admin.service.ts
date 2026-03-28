import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DbStats {
  players: number;
  matches: number;
  metaSnapshots: number;
  patchVersions: number;
}

export interface PurgeResult {
  deletedMatches: number;
  deletedSnapshots: number;
  deletedPatchVersions: number;
  deletedPatchPredictions: number;
}

@Injectable()
export class DbAdminService {
  private readonly logger = new Logger(DbAdminService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getStats(): Promise<DbStats> {
    const [players, matches, metaSnapshots, patchVersions] = await Promise.all([
      this.dataSource.query<[{ count: string }]>('SELECT COUNT(*)::int AS count FROM players'),
      this.dataSource.query<[{ count: string }]>('SELECT COUNT(*)::int AS count FROM matches'),
      this.dataSource.query<[{ count: string }]>(
        'SELECT COUNT(*)::int AS count FROM meta_snapshots'
      ),
      this.dataSource.query<[{ count: string }]>(
        'SELECT COUNT(*)::int AS count FROM patch_versions'
      ),
    ]);

    return {
      players: Number(players[0].count),
      matches: Number(matches[0].count),
      metaSnapshots: Number(metaSnapshots[0].count),
      patchVersions: Number(patchVersions[0].count),
    };
  }

  /**
   * Purges all match data and analytics for the old set.
   * Keeps the `players` table intact so crawled players carry over to Set 17.
   * Also resets `last_fetch_at` so all players get re-crawled in Set 17.
   *
   * Uses TRUNCATE CASCADE (instant) instead of DELETE to avoid row-by-row
   * scanning and RETURNING overhead that causes HTTP timeouts on large datasets.
   */
  async purgeMatchData(): Promise<PurgeResult> {
    this.logger.warn('[DbAdmin] Starting match data purge — players will be preserved');

    // Snapshot counts before truncation so we can report what was deleted
    const before = await this.getStats();

    const [snapshotCount, patchVersionCount, patchPredictionCount] = await Promise.all([
      this.dataSource.query<[{ count: string }]>('SELECT COUNT(*)::int AS count FROM meta_snapshots'),
      this.dataSource.query<[{ count: string }]>('SELECT COUNT(*)::int AS count FROM patch_versions'),
      this.dataSource.query<[{ count: string }]>('SELECT COUNT(*)::int AS count FROM patch_predictions'),
    ]);

    // TRUNCATE CASCADE: drops matches + all FK-dependent child tables instantly
    await this.dataSource.query(
      'TRUNCATE TABLE matches CASCADE'
    );

    await this.dataSource.query('TRUNCATE TABLE meta_snapshots');
    await this.dataSource.query('TRUNCATE TABLE patch_versions');
    await this.dataSource.query('TRUNCATE TABLE patch_predictions');

    // Reset player crawl state for the new set
    await this.dataSource.query(
      'UPDATE players SET last_fetch_at = NULL, wins = 0, losses = 0'
    );

    const result: PurgeResult = {
      deletedMatches: before.matches,
      deletedSnapshots: Number(snapshotCount[0].count),
      deletedPatchVersions: Number(patchVersionCount[0].count),
      deletedPatchPredictions: Number(patchPredictionCount[0].count),
    };

    this.logger.warn(
      `[DbAdmin] Purge complete — matches: ${result.deletedMatches}, ` +
        `snapshots: ${result.deletedSnapshots}, patchVersions: ${result.deletedPatchVersions}`
    );

    return result;
  }
}
