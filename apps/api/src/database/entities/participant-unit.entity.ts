import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Participant } from './participant.entity';

@Entity('participant_units')
@Index(['matchId', 'puuid'])
export class ParticipantUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'match_id' })
  matchId!: string;

  @Column()
  puuid!: string;

  @Column({ name: 'character_id' })
  @Index()
  characterId!: string;

  @Column({ type: 'smallint' })
  tier!: number; // Star level 1/2/3

  @Column({ type: 'smallint' })
  rarity!: number; // 0=1cost ... 4=5cost

  @Column({ type: 'text', array: true, default: '{}' })
  items!: string[];

  @ManyToOne(() => Participant, (p) => p.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant!: Participant;
}
