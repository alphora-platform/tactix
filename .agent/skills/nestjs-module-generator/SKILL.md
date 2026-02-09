---
name: nestjs-module-generator
description: Scaffolds new NestJS modules with consistent structure, naming conventions, and patterns for the Tactix TFT analytics backend. Use when creating modules, services, controllers, DTOs, entities, or tests. Also use when adding endpoints or refactoring existing module structure.
---

# NestJS Module Generator

Scaffolds NestJS modules following Tactix project conventions. Every module follows a consistent structure with proper separation of concerns, dependency injection, and testing.

## When to use this skill

- Creating a new backend module (e.g., riot-api, data-collector, analytics, tracker, alerts)
- Adding a new service, controller, or DTO to an existing module
- Refactoring module structure or fixing circular dependencies
- Unsure about naming conventions or file organization

## Decision tree

```
What are you building?
├── New module from scratch
│   ├── Has HTTP endpoints? → API Module pattern
│   ├── Processes background jobs? → Worker Module pattern
│   ├── Runs on a schedule? → Scheduled Module pattern
│   └── Shared utility? → Shared Module pattern
├── Adding to existing module
│   ├── New endpoint → Add controller method + DTO
│   ├── New business logic → Add service method
│   └── New data model → Add entity (use database-typeorm skill)
└── Fixing issues
    ├── Circular dependency → Extract shared logic into new module
    └── Fat controller → Move logic to service
```

## Module structure

Every module follows this layout inside `apps/backend/src/modules/`:

```
<module-name>/
├── <module-name>.module.ts
├── <module-name>.service.ts
├── <module-name>.controller.ts     # Only for API modules
├── dto/
│   ├── create-<entity>.dto.ts
│   ├── update-<entity>.dto.ts
│   └── <entity>-query.dto.ts
├── entities/
│   └── <entity>.entity.ts
├── interfaces/
│   └── <module-name>.interfaces.ts
├── constants/
│   └── <module-name>.constants.ts
├── exceptions/
│   └── <module-name>.exceptions.ts
└── __tests__/
    ├── <module-name>.service.spec.ts
    └── <module-name>.controller.spec.ts
```

## Naming conventions

| Item       | Convention                              | Example                                         |
| ---------- | --------------------------------------- | ----------------------------------------------- |
| Files      | `kebab-case`                            | `data-collector.service.ts`                     |
| Classes    | `PascalCase`                            | `DataCollectorService`                          |
| Methods    | `camelCase`                             | `fetchMatchHistory()`                           |
| DB tables  | `snake_case` plural                     | `participant_units`                             |
| DB columns | `snake_case` in DB, `camelCase` in code | `@Column({ name: 'game_version' }) gameVersion` |
| Constants  | `UPPER_SNAKE_CASE`                      | `MAX_RETRY_COUNT`                               |
| DTOs       | `PascalCase` + purpose                  | `CreateMatchDto`                                |

## How to scaffold each module type

### API Module (has HTTP endpoints)

```typescript
// <name>.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [NameController],
  providers: [NameService],
  exports: [NameService],
})
export class NameModule {}
```

```typescript
// <name>.controller.ts — thin, delegates to service
@Controller('<name>')
export class NameController {
  constructor(private readonly nameService: NameService) {}

  @Get()
  findAll(@Query() query: QueryDto) {
    return this.nameService.findAll(query);
  }
}
```

```typescript
// <name>.service.ts — all business logic here
@Injectable()
export class NameService {
  private readonly logger = new Logger(NameService.name);

  constructor(
    @InjectRepository(Entity)
    private readonly repo: Repository<Entity>
  ) {}
}
```

### Worker Module (processes background jobs)

No controller. Uses BullMQ processor instead. See the `bullmq-queue` skill for full patterns.

```typescript
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.TASK }),
    TypeOrmModule.forFeature([Entity]),
  ],
  providers: [NameService, NameProcessor],
  exports: [NameService],
})
export class NameModule {}
```

### Scheduled Module (cron-based)

Uses `@nestjs/schedule`. The scheduler enqueues jobs — it does not do heavy work itself.

```typescript
@Module({
  imports: [ScheduleModule.forRoot(), DataCollectorModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
```

### Shared Module (cross-cutting utility)

No controller, no queue. Exported for other modules to import.

```typescript
@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate })],
})
export class AppConfigModule {}
```

## DTOs with validation

Always validate incoming data:

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEntityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}
```

## Tests

```typescript
describe('NameService', () => {
  let service: NameService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NameService,
        { provide: getRepositoryToken(Entity), useValue: mockRepository },
      ],
    }).compile();

    service = module.get(NameService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Register in AppModule

After creating a module, add it to `app.module.ts`:

```typescript
import { NameModule } from './modules/<name>/<name>.module';

@Module({
  imports: [, /* existing */ NameModule],
})
export class AppModule {}
```

## Tactix modules map

| Module           | Type         | Phase | Dependencies              |
| ---------------- | ------------ | ----- | ------------------------- |
| `riot-api`       | Shared       | 1     | HttpModule, ConfigModule  |
| `data-collector` | Worker       | 1     | riot-api, BullMQ, TypeORM |
| `scheduler`      | Scheduled    | 1     | data-collector            |
| `analytics`      | API + Worker | 2     | TypeORM                   |
| `tracker`        | API          | 2     | TypeORM, riot-api         |
| `alerts`         | Worker       | 2     | ConfigModule              |
| `patch-analyzer` | API + Worker | 3     | riot-api, analytics       |
| `health`         | API          | 1     | All modules               |

## Anti-patterns to avoid

- **Fat controllers** — Never put business logic in controllers
- **Circular dependencies** — Extract shared logic into a third module
- **Direct cross-module repo access** — Import the other module's service, not its repository
- **Hardcoded values** — Use ConfigService for environment-dependent values
- **Missing error handling** — Wrap external calls in try-catch with logging
- **Synchronous heavy work** — Use BullMQ for anything >1s

## Additional resources

See `examples/` for complete reference implementations of each module type.
See `resources/error-handling.md` for standard error handling and custom exception patterns.
