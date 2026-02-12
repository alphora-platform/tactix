import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Participant } from './participant.entity';

@Entity('participant_traits')
@Index(['matchId', 'puuid'])
export class ParticipantTrait {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'match_id' })
  matchId!: string;

  @Column()
  puuid!: string;

  @Column({ name: 'trait_name' })
  @Index()
  traitName!: string;

  @Column({ name: 'num_units', type: 'smallint' })
  numUnits!: number;

  @Column({ type: 'smallint' })
  style!: number; // 0-4

  @Column({ name: 'tier_current', type: 'smallint' })
  tierCurrent!: number;

  @Column({ name: 'tier_total', type: 'smallint' })
  tierTotal!: number;

  @ManyToOne(() => Participant, (p) => p.traits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant!: Participant;
}
