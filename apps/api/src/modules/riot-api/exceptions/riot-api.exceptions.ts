import { HttpException, HttpStatus } from '@nestjs/common';

export class RiotApiNotFoundException extends HttpException {
  constructor(url: string) {
    super(`Riot API resource not found: ${url}`, HttpStatus.NOT_FOUND);
  }
}

export class RiotApiRateLimitException extends HttpException {
  public readonly retryAfterSeconds: number;

  constructor(retryAfter: number) {
    super(`Riot API rate limit exceeded. Retry after ${retryAfter}s`, HttpStatus.TOO_MANY_REQUESTS);
    this.retryAfterSeconds = retryAfter;
  }
}

export class RiotApiServiceUnavailableException extends HttpException {
  constructor() {
    super('Riot API service is temporarily unavailable', HttpStatus.SERVICE_UNAVAILABLE);
  }
}
