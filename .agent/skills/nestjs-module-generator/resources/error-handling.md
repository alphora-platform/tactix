# Error Handling Patterns

## Custom Exception Hierarchy

```typescript
// common/exceptions/base.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class TactixException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string
  ) {
    super({ message, code }, status);
  }
}
```

Domain-specific exceptions extend the base:

```typescript
// modules/riot-api/exceptions/riot-api.exceptions.ts
export class RiotApiRateLimitException extends TactixException {
  constructor(retryAfter: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfter}s`,
      HttpStatus.TOO_MANY_REQUESTS,
      'RIOT_RATE_LIMIT'
    );
  }
}

export class RiotApiNotFoundException extends TactixException {
  constructor(resource: string) {
    super(`Not found: ${resource}`, HttpStatus.NOT_FOUND, 'RIOT_NOT_FOUND');
  }
}
```

## Service-level error handling

```typescript
// Always wrap external calls
async fetchMatchDetail(matchId: string) {
  try {
    const response = await this.riotApiService.getMatch(matchId);
    return this.parseMatchResponse(response);
  } catch (error) {
    if (error instanceof RiotApiRateLimitException) {
      this.logger.warn(`Rate limited: ${matchId}`);
      throw error;
    }
    if (error instanceof RiotApiNotFoundException) {
      this.logger.warn(`Match not found: ${matchId}`);
      return null;
    }
    this.logger.error(`Failed: ${matchId}: ${error.message}`, error.stack);
    throw new TactixException(`Failed to fetch match: ${error.message}`);
  }
}
```

## Database transactions

```typescript
async saveMatchWithParticipants(match: Match, participants: Participant[]) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await queryRunner.manager.save(Match, match);
    await queryRunner.manager.save(Participant, participants);
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw new TactixException(`DB error: ${error.message}`);
  } finally {
    await queryRunner.release();
  }
}
```

## Global exception filter

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `HTTP ${status}: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json({
      success: false,
      error: {
        statusCode: status,
        message:
          typeof message === 'string' ? message : (message as any).message,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

## Logging standards

```typescript
private readonly logger = new Logger(MyService.name);

this.logger.log('Normal operation');           // INFO
this.logger.warn('Something unexpected');       // WARN
this.logger.error('Failed', error.stack);       // ERROR — always include stack
this.logger.debug('Detailed debug info');       // DEBUG

// Always include context:
this.logger.log(`Collecting region=${region}, tier=${tier}`);
```
