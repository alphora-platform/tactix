import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../../database/entities/match.entity';
import { Player } from '../../database/entities/player.entity';

@Injectable()
export class RawDataService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>
  ) {}

  async getPlayerBySummonerName(name: string): Promise<Player> {
    const player = await this.playerRepo.findOne({
      where: { summonerName: name },
    });

    if (!player) {
      throw new NotFoundException(`Player with summoner name ${name} not found`);
    }

    return player;
  }

  async getPlayerByPuuid(puuid: string): Promise<Player> {
    const player = await this.playerRepo.findOne({
      where: { puuid },
    });

    if (!player) {
      throw new NotFoundException(`Player with puuid ${puuid} not found`);
    }

    return player;
  }

  async getMatchById(matchId: string): Promise<Match> {
    const match = await this.matchRepo.findOne({
      where: { matchId },
      relations: [
        'participants',
        'participants.units',
        'participants.traits',
        'participants.augments',
      ],
    });

    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }

    return match;
  }
}
