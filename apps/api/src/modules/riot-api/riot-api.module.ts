import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RateLimiterService } from './rate-limiter.service';
import { RiotApiClientService } from './riot-api-client.service';
import { RiotApiService } from './riot-api.service';

@Module({
  imports: [HttpModule],
  providers: [RateLimiterService, RiotApiClientService, RiotApiService],
  exports: [RiotApiService],
})
export class RiotApiModule {}
