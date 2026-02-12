import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Participant } from './participant.entity';

@Entity('participant_augments')
@Index(['matchId', 'puuid'])
export class ParticipantAugment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'match_id' })
  matchId!: string;

  @Column()
  puuid!: string;

  @Column({ name: 'augment_name' })
  @Index()
  augmentName!: string;

  @Column({ name: 'augment_index', type: 'smallint' })
  augmentIndex!: number; // 0=2-1, 1=3-2, 2=4-2

  @ManyToOne(() => Participant, (p) => p.augments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant!: Participant;
}
