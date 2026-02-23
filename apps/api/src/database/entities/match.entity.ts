import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn } from 'typeorm';
import { Participant } from './participant.entity';

@Entity('matches')
@Index(['gameVersion', 'gameDatetime'])
@Index(['patch', 'region'])
export class Match {
  @PrimaryColumn({ name: 'match_id' })
  matchId!: string;

  @Column({ name: 'game_version' })
  @Index()
  gameVersion!: string;

  @Column({ name: 'queue_id', type: 'int' })
  queueId!: number;

  @Column({ name: 'game_datetime', type: 'timestamptz' })
  @Index()
  gameDatetime!: Date;

  @Column({ name: 'game_length', type: 'float' })
  gameLength!: number;

  @Column({ name: 'tft_set_number', type: 'int' })
  @Index()
  tftSetNumber!: number;

  /**
   * Short patch string extracted from game_version, e.g. "14.3".
   * Populated by EtlService.processMatch() — null for matches written
   * before ETL was introduced.
   */
  @Column({ nullable: true })
  @Index()
  patch!: string;

  /**
   * Region where the match was played (NA, EUW, KR, …).
   * Nullable because early-collected matches predate this column.
   */
  @Column({ nullable: true })
  @Index()
  region!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Participant, (p) => p.match, { cascade: true })
  participants!: Participant[];
}
