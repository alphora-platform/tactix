import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Match } from './match.entity';
import { ParticipantAugment } from './participant-augment.entity';
import { ParticipantTrait } from './participant-trait.entity';
import { ParticipantUnit } from './participant-unit.entity';

@Entity('participants')
@Index('UQ_participant_match_puuid', ['matchId', 'puuid'], { unique: true })
@Index('IDX_participant_puuid_match', ['puuid', 'matchId'])
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'match_id' })
  matchId!: string;

  @Column()
  @Index()
  puuid!: string;

  @Column({ type: 'smallint' })
  placement!: number;

  @Column({ type: 'smallint' })
  level!: number;

  @Column({ name: 'gold_left', type: 'int' })
  goldLeft!: number;

  @Column({ name: 'last_round', type: 'int', nullable: true })
  lastRound!: number;

  @Column({ name: 'time_eliminated', type: 'float' })
  timeEliminated!: number;

  @Column({ name: 'total_damage_to_players', type: 'int', default: 0 })
  totalDamageToPlayers!: number;

  @Column({ name: 'players_eliminated', type: 'smallint', default: 0 })
  playersEliminated!: number;

  @ManyToOne(() => Match, (m) => m.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match!: Match;

  @OneToMany(() => ParticipantUnit, (u) => u.participant, { cascade: true })
  units!: ParticipantUnit[];

  @OneToMany(() => ParticipantTrait, (t) => t.participant, { cascade: true })
  traits!: ParticipantTrait[];

  @OneToMany(() => ParticipantAugment, (a) => a.participant, { cascade: true })
  augments!: ParticipantAugment[];
}
