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
   */
  async purgeMatchData(): Promise<PurgeResult> {
    this.logger.warn('[DbAdmin] Starting match data purge — players will be preserved');

    const result = await this.dataSource.transaction(async (manager) => {
      // matches CASCADE → participants → participant_units/traits/augments
      const { affected: deletedMatches } = await manager.query(
        'DELETE FROM matches RETURNING match_id'
      );

      const { affected: deletedSnapshots } = await manager.query(
        'DELETE FROM meta_snapshots RETURNING id'
      );

      const { affected: deletedPatchVersions } = await manager.query(
        'DELETE FROM patch_versions RETURNING patch'
      );

      const { affected: deletedPatchPredictions } = await manager.query(
        'DELETE FROM patch_predictions RETURNING id'
      );

      // Reset last_fetch_at so all players get re-crawled in the new set
      await manager.query('UPDATE players SET last_fetch_at = NULL, wins = 0, losses = 0');

      return {
        deletedMatches: deletedMatches ?? 0,
        deletedSnapshots: deletedSnapshots ?? 0,
        deletedPatchVersions: deletedPatchVersions ?? 0,
        deletedPatchPredictions: deletedPatchPredictions ?? 0,
      };
    });

    this.logger.warn(
      `[DbAdmin] Purge complete — matches: ${result.deletedMatches}, ` +
        `snapshots: ${result.deletedSnapshots}, patchVersions: ${result.deletedPatchVersions}`
    );

    return result;
  }
}
