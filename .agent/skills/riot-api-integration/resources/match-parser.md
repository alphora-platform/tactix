# Match Parser

Parses raw Riot API match JSON into Tactix database entities.

## Parse flow

```
RiotMatchDetail → Match (1) + Participant (8) + Units + Traits + Augments
```

## Parser implementation

```typescript
@Injectable()
export class MatchParser {
  parseMatch(raw: RiotMatchDetail) {
    const { metadata, info } = raw;

    if (!metadata?.match_id || !info?.participants?.length) {
      throw new Error('Invalid match data');
    }

    // Skip non-ranked
    if (info.queue_id !== 1100) return null;

    const match = {
      matchId: metadata.match_id,
      gameVersion: this.extractPatch(info.game_version),
      queueId: info.queue_id,
      gameDatetime: new Date(info.game_datetime),
      gameLength: info.game_length,
      tftSetNumber: info.tft_set_number,
    };

    const participants = [];
    const units = [];
    const traits = [];
    const augments = [];

    for (const p of info.participants) {
      participants.push({
        matchId: metadata.match_id,
        puuid: p.puuid,
        placement: p.placement,
        level: p.level,
        goldLeft: p.gold_left,
        lastRound: p.last_round,
        timeEliminated: p.time_eliminated,
        totalDamageToPlayers: p.total_damage_to_players,
        playersEliminated: p.players_eliminated,
      });

      for (const u of p.units || []) {
        units.push({
          matchId: metadata.match_id,
          puuid: p.puuid,
          characterId: u.character_id,
          tier: u.tier,
          rarity: u.rarity,
          items: u.itemNames || [],
        });
      }

      for (const t of p.traits || []) {
        if (t.style > 0) {
          // Only active traits
          traits.push({
            matchId: metadata.match_id,
            puuid: p.puuid,
            traitName: t.name,
            numUnits: t.num_units,
            style: t.style,
            tierCurrent: t.tier_current,
            tierTotal: t.tier_total,
          });
        }
      }

      for (let i = 0; i < (p.augments || []).length; i++) {
        augments.push({
          matchId: metadata.match_id,
          puuid: p.puuid,
          augmentName: p.augments[i],
          augmentIndex: i,
        });
      }
    }

    return { match, participants, units, traits, augments };
  }

  // "Version 14.3.610.1234" → "14.3"
  private extractPatch(v: string): string {
    return v?.match(/(\d+\.\d+)/)?.[1] ?? 'unknown';
  }
}
```

## Incremental fetch pattern

Only fetch new matches per player:

```typescript
async collectPlayerMatches(puuid: string, region: Region) {
  // Get last known match time
  const lastMatch = await this.participantRepo.findOne({
    where: { puuid },
    order: { match: { gameDatetime: 'DESC' } },
    relations: ['match'],
  });

  const startTime = lastMatch
    ? Math.floor(lastMatch.match.gameDatetime.getTime() / 1000) + 1
    : undefined;

  const matchIds = await this.riotApi.getMatchIdsByPuuid(region, puuid, 20, startTime);

  // Filter already-collected
  const existing = await this.matchRepo
    .createQueryBuilder('m')
    .select('m.matchId')
    .where('m.matchId IN (:...ids)', { ids: matchIds.length ? matchIds : ['__none__'] })
    .getMany();

  const existingSet = new Set(existing.map((m) => m.matchId));
  return matchIds.filter((id) => !existingSet.has(id));
}
```

## Validation rules

```typescript
function validateParticipant(p) {
  return (
    !!p.puuid &&
    p.placement >= 1 &&
    p.placement <= 8 &&
    p.level >= 1 &&
    p.level <= 11
  );
}

function validateUnit(u) {
  return (
    !!u.characterId &&
    u.tier >= 1 &&
    u.tier <= 3 &&
    u.rarity >= 0 &&
    u.rarity <= 4
  );
}
```
