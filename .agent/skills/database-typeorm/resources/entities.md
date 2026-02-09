# Entity Definitions

All TypeORM entities for Tactix. See the ER diagram at the bottom.

## Player

```typescript
@Entity('players')
@Index(['region', 'tier'])
export class Player {
  @PrimaryColumn() puuid: string;
  @Column() @Index() region: string;
  @Column({ name: 'summoner_name', nullable: true }) summonerName: string;
  @Column({ nullable: true }) tier: string;
  @Column({ type: 'int', nullable: true }) lp: number;
  @Column({ type: 'int', default: 0 }) wins: number;
  @Column({ type: 'int', default: 0 }) losses: number;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @Column({ name: 'last_fetch_at', type: 'timestamptz', nullable: true })
  lastFetchAt: Date;
}
```

## Match

```typescript
@Entity('matches')
@Index(['gameVersion', 'gameDatetime'])
export class Match {
  @PrimaryColumn({ name: 'match_id' }) matchId: string;
  @Column({ name: 'game_version' }) @Index() gameVersion: string;
  @Column({ name: 'queue_id', type: 'int' }) queueId: number;
  @Column({ name: 'game_datetime', type: 'timestamptz' })
  @Index()
  gameDatetime: Date;
  @Column({ name: 'game_length', type: 'float' }) gameLength: number;
  @Column({ name: 'tft_set_number', type: 'int' })
  @Index()
  tftSetNumber: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @OneToMany(() => Participant, (p) => p.match, { cascade: true })
  participants: Participant[];
}
```

## Participant

```typescript
@Entity('participants')
@Index(['matchId', 'puuid'], { unique: true })
@Index(['puuid', 'matchId'])
export class Participant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'match_id' }) matchId: string;
  @Column() @Index() puuid: string;
  @Column({ type: 'smallint' }) placement: number;
  @Column({ type: 'smallint' }) level: number;
  @Column({ name: 'gold_left', type: 'int' }) goldLeft: number;
  @Column({ name: 'last_round', type: 'int', nullable: true })
  lastRound: number;
  @Column({ name: 'time_eliminated', type: 'float' }) timeEliminated: number;
  @Column({ name: 'total_damage_to_players', type: 'int', default: 0 })
  totalDamageToPlayers: number;
  @Column({ name: 'players_eliminated', type: 'smallint', default: 0 })
  playersEliminated: number;
  @ManyToOne(() => Match, (m) => m.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;
  @OneToMany(() => ParticipantUnit, (u) => u.participant, { cascade: true })
  units: ParticipantUnit[];
  @OneToMany(() => ParticipantTrait, (t) => t.participant, { cascade: true })
  traits: ParticipantTrait[];
  @OneToMany(() => ParticipantAugment, (a) => a.participant, { cascade: true })
  augments: ParticipantAugment[];
}
```

## ParticipantUnit

```typescript
@Entity('participant_units')
@Index(['matchId', 'puuid'])
export class ParticipantUnit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'match_id' }) matchId: string;
  @Column() puuid: string;
  @Column({ name: 'character_id' }) @Index() characterId: string;
  @Column({ type: 'smallint' }) tier: number; // Star level 1/2/3
  @Column({ type: 'smallint' }) rarity: number; // 0=1cost ... 4=5cost
  @Column({ type: 'text', array: true, default: '{}' }) items: string[];
  @ManyToOne(() => Participant, (p) => p.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;
}
```

## ParticipantTrait

```typescript
@Entity('participant_traits')
@Index(['matchId', 'puuid'])
export class ParticipantTrait {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'match_id' }) matchId: string;
  @Column() puuid: string;
  @Column({ name: 'trait_name' }) @Index() traitName: string;
  @Column({ name: 'num_units', type: 'smallint' }) numUnits: number;
  @Column({ type: 'smallint' }) style: number; // 0-4
  @Column({ name: 'tier_current', type: 'smallint' }) tierCurrent: number;
  @Column({ name: 'tier_total', type: 'smallint' }) tierTotal: number;
  @ManyToOne(() => Participant, (p) => p.traits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;
}
```

## ParticipantAugment

```typescript
@Entity('participant_augments')
@Index(['matchId', 'puuid'])
export class ParticipantAugment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'match_id' }) matchId: string;
  @Column() puuid: string;
  @Column({ name: 'augment_name' }) @Index() augmentName: string;
  @Column({ name: 'augment_index', type: 'smallint' }) augmentIndex: number; // 0=2-1, 1=3-2, 2=4-2
  @ManyToOne(() => Participant, (p) => p.augments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;
}
```

## MetaSnapshot

```typescript
@Entity('meta_snapshots')
@Index(['patch', 'snapshotTime'])
export class MetaSnapshot {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'snapshot_time', type: 'timestamptz' }) snapshotTime: Date;
  @Column() @Index() patch: string;
  @Column({ name: 'comp_id' }) compId: string;
  @Column({ name: 'comp_name', nullable: true }) compName: string;
  @Column({ name: 'trait_combo', type: 'text', array: true })
  traitCombo: string[];
  @Column({ name: 'core_units', type: 'text', array: true, nullable: true })
  coreUnits: string[];
  @Column({ name: 'play_rate', type: 'float' }) playRate: number;
  @Column({ type: 'float' }) winrate: number;
  @Column({ name: 'top4_rate', type: 'float' }) top4Rate: number;
  @Column({ name: 'avg_placement', type: 'float' }) avgPlacement: number;
  @Column({ name: 'sample_size', type: 'int' }) sampleSize: number;
  @Column({ nullable: true }) region: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
```

## ER Diagram

```
players ──┐                matches ──── participants ──┬── participant_units
(puuid)   │ (puuid ref)    (match_id)   (match_id +   │   (character_id, items)
          └────────────────────────────── puuid)       ├── participant_traits
                                                       │   (trait_name, style)
                                                       └── participant_augments
                                                           (augment_name, index)

meta_snapshots (pre-computed, refreshed periodically)
```

## Data volume estimates

| Table                | Rows/day | Notes                   |
| -------------------- | -------- | ----------------------- |
| matches              | ~50K     | 50K target from roadmap |
| participants         | ~400K    | 8 per match             |
| participant_units    | ~3.2M    | ~8 units × 8 players    |
| participant_traits   | ~1.6M    | ~4 active × 8 players   |
| participant_augments | ~1.2M    | 3 × 8 × 50K             |
| meta_snapshots       | ~12K     | ~500/hour refresh       |
