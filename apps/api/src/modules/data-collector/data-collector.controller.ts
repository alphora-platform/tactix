import { Controller, Logger, Post } from '@nestjs/common';
import {
  DataCollectorService,
  CollectionSummary,
  MatchCollectionSummary,
} from './data-collector.service';

@Controller('data-collector')
export class DataCollectorController {
  private readonly logger = new Logger(DataCollectorController.name);

  constructor(private readonly dataCollectorService: DataCollectorService) {}

  @Post('collect-players')
  async collectPlayers(): Promise<CollectionSummary> {
    this.logger.log('Manual player collection triggered');
    return this.dataCollectorService.collectPlayerLists();
  }

  @Post('collect-matches')
  async collectMatches(): Promise<MatchCollectionSummary> {
    this.logger.log('Manual match collection triggered');
    return this.dataCollectorService.collectMatches();
  }
}
