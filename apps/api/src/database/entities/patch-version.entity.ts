import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Tracks every distinct patch version seen in match data.
 *
 * Auto-synced by EtlService after each match is processed.
 * Exactly one row has `is_current = true` — the patch with the
 * most recent `last_seen_at` timestamp.
 *
 * Used by GET /analytics/patches to power the FE PatchSelector.
 */
@Entity('patch_versions')
export class PatchVersion {
  /** Short patch string, e.g. "16.5". Primary key. */
  @PrimaryColumn({ type: 'varchar', length: 16 })
  patch!: string;

  /** True for the single most recently active patch. */
  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent!: boolean;

  /** Timestamp when this patch was first seen in match data. */
  @Column({ name: 'first_seen_at', type: 'timestamptz' })
  firstSeenAt!: Date;

  /** Timestamp of the most recent match processed for this patch. */
  @UpdateDateColumn({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt!: Date;

  /** Total number of ranked matches processed for this patch. */
  @Column({ name: 'match_count', type: 'int', default: 0 })
  matchCount!: number;
}
