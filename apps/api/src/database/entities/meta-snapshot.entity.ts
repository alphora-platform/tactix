import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('meta_snapshots')
@Index(['patch', 'snapshotTime'])
export class MetaSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'snapshot_time', type: 'timestamptz' })
  snapshotTime!: Date;

  @Column()
  @Index()
  patch!: string;

  @Column({ name: 'comp_id' })
  compId!: string;

  @Column({ name: 'comp_name', nullable: true })
  compName!: string;

  @Column({ name: 'trait_combo', type: 'text', array: true })
  traitCombo!: string[];

  @Column({ name: 'core_units', type: 'text', array: true, nullable: true })
  coreUnits!: string[];

  @Column({ name: 'play_rate', type: 'float' })
  playRate!: number;

  @Column({ type: 'float' })
  winrate!: number;

  @Column({ name: 'top4_rate', type: 'float' })
  top4Rate!: number;

  @Column({ name: 'avg_placement', type: 'float' })
  avgPlacement!: number;

  @Column({ name: 'sample_size', type: 'int' })
  sampleSize!: number;

  @Column({ nullable: true })
  region!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
