import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('crawl_settings')
export class CrawlSettings {
  @PrimaryColumn()
  id!: number; // singleton row — always id = 1

  @Column({ name: 'crawl_mode', default: 'official' })
  crawlMode!: 'pbe' | 'official';

  @Column({ name: 'active_regions', type: 'simple-array' })
  activeRegions!: string[];

  @Column({ name: 'active_patch', nullable: true, type: 'varchar' })
  activePatch!: string | null;

  @Column({ name: 'is_enabled', default: true })
  isEnabled!: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
