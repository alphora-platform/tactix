import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  MATERIALIZED_VIEW_DEFINITIONS,
  MaterializedViewDefinition,
} from './materialized-view.definitions';

/**
 * Refreshes all analytics materialized views.
 *
 * Uses `REFRESH MATERIALIZED VIEW CONCURRENTLY` so the views remain readable
 * by the dashboard while the refresh is in progress. This requires each view
 * to have at least one unique index — handled automatically by
 * MaterializedViewSyncService on boot.
 *
 * The list of views to refresh is driven by MATERIALIZED_VIEW_DEFINITIONS
 * (same source of truth as the sync service), so adding a new view only
 * requires an entry in materialized-view.definitions.ts.
 *
 * Typical call path:
 *   CollectorSchedulerService (cron) → view-refresh queue
 *     → ViewRefreshProcessor → ViewRefreshService.refreshAll()
 */
@Injectable()
export class ViewRefreshService {
  private readonly logger = new Logger(ViewRefreshService.name);

  /** Derived from definitions — order matters if views depend on each other. */
  private static readonly VIEWS = MATERIALIZED_VIEW_DEFINITIONS.map(
    (d: MaterializedViewDefinition) => d.name
  );

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  /**
   * Refreshes all materialized views sequentially.
   *
   * Uses CONCURRENTLY so in-flight reads are not blocked during the refresh.
   * Logs the wall-clock duration per view for monitoring / alerting.
   *
   * @throws If any single view refresh fails (the error propagates to the BullMQ
   *         worker, which applies the configured retry/backoff policy).
   */
  async refreshAll(): Promise<void> {
    this.logger.log('[ViewRefresh] Starting full materialized-view refresh');
    const start = Date.now();

    for (const view of ViewRefreshService.VIEWS) {
      await this.refreshOne(view);
    }

    const totalMs = Date.now() - start;
    this.logger.log(`[ViewRefresh] All views refreshed in ${totalMs} ms`);
  }

  /**
   * Refreshes a single materialized view and logs its duration.
   */
  private async refreshOne(view: string): Promise<void> {
    const t0 = Date.now();
    this.logger.debug(`[ViewRefresh] Refreshing ${view}…`);

    await this.dataSource.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);

    const elapsed = Date.now() - t0;
    this.logger.log(`[ViewRefresh] ${view} refreshed in ${elapsed} ms`);
  }
}
