import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryColumn } from 'typeorm';
import { Participant } from './participant.entity';

@Entity('matches')
@Index(['gameVersion', 'gameDatetime'])
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Participant, (p) => p.match, { cascade: true })
  participants!: Participant[];
}
