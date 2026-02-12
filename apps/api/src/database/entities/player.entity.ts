import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('players')
@Index(['region', 'tier'])
export class Player {
  @PrimaryColumn()
  puuid!: string;

  @Column()
  @Index()
  region!: string;

  @Column({ name: 'summoner_name', nullable: true })
  summonerName!: string;

  @Column({ nullable: true })
  tier!: string;

  @Column({ type: 'int', nullable: true })
  lp!: number;

  @Column({ type: 'int', default: 0 })
  wins!: number;

  @Column({ type: 'int', default: 0 })
  losses!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'last_fetch_at', type: 'timestamptz', nullable: true })
  lastFetchAt!: Date;
}
