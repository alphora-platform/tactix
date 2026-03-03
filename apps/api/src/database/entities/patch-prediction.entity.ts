import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('patch_predictions')
export class PatchPrediction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 16 })
  patch!: string;

  @Index()
  @Column({ name: 'comp_id', type: 'varchar', length: 32 })
  compId!: string;

  @Column({ name: 'predicted_direction', type: 'enum', enum: ['up', 'down', 'neutral'] })
  predictedDirection!: 'up' | 'down' | 'neutral';

  @Column({ name: 'predicted_score', type: 'float' })
  predictedScore!: number;

  @Column({ name: 'actual_winrate_before', type: 'float', nullable: true })
  actualWinrateBefore!: number | null;

  @Column({ name: 'actual_winrate_after', type: 'float', nullable: true })
  actualWinrateAfter!: number | null;

  @Column({ name: 'accuracy_score', type: 'int', nullable: true })
  accuracyScore!: number | null;

  @Column({ name: 'evaluated_at', type: 'timestamp', nullable: true })
  evaluatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
