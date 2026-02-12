<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

# Project: Tactix - TFT Analytics Platform

## Overview

Tactix là nền tảng phân tích TFT (Teamfight Tactics) cung cấp data-driven insights cho cộng đồng gaming. Mục tiêu là xây dựng hệ sinh thái công cụ hoàn chỉnh trước khi Set 17: Cosmos ra mắt (15/04/2026).

Chi tiết đầy đủ xem file `ROADMAP.md`

## Tech Stack

- **Runtime:** Node.js + TypeScript (strict mode)
- **Backend:** NestJS (monorepo with npm + Webpack)
- **Database:** PostgreSQL + TypeORM
- **Cache/Queue:** Redis + BullMQ
- **Frontend:** React + TailwindCSS
- **Charts:** Recharts
- **Deploy:** Docker (dev: hot-reload, prod: multi-stage build)
- **Package Manager:** npm

## Project Structure

```
tactix/
├── apps/
│   ├── backend/          # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── riot-api/        # Riot API integration & rate limiting
│   │   │   │   ├── data-collector/  # Match data collection service
│   │   │   │   ├── analytics/       # Meta Radar, Comp Analyzer
│   │   │   │   ├── tracker/         # Personal Performance Tracker
│   │   │   │   └── alerts/          # Discord/Telegram alert system
│   │   │   ├── common/              # Shared guards, pipes, interceptors
│   │   │   └── database/            # TypeORM entities, migrations, seeds
│   │   └── test/
│   └── frontend/         # React dashboard
│       └── src/
│           ├── pages/               # Meta Overview, Comp Detail, My Stats, Trends, Regions
│           └── components/
├── libs/                 # Shared libraries (if needed)
├── docker/               # Dockerfiles & docker-compose
├── ROADMAP.md            # Full project roadmap (converted from docx)
└── AGENTS.md             # This file
```

## Coding Conventions

- Sử dụng TypeScript strict mode cho toàn bộ codebase
- NestJS modules nên tách biệt theo domain (riot-api, data-collector, analytics, etc.)
- Đặt tên file: `kebab-case` (e.g., `data-collector.service.ts`)
- Đặt tên class: `PascalCase` (e.g., `DataCollectorService`)
- Sử dụng dependency injection của NestJS, tránh import trực tiếp giữa các module
- Viết unit tests cho business logic quan trọng (ETL, comp detection, rate limiting)
- Database migrations phải reversible
- Environment variables qua `.env` files, validate bằng `@nestjs/config` + Joi/Zod

## Key Domain Concepts

- **Match Data:** Dữ liệu trận đấu từ Riot API (units, items, traits, augments, placement)
- **Comp (Composition):** Tổ hợp units + traits mà player sử dụng trong 1 trận
- **Meta Radar:** Hệ thống phát hiện comp mạnh/yếu dựa trên winrate + play rate + trend
- **Tier Classification:** Xếp hạng comp thành S/A/B/C dựa trên composite score
- **Placement:** Thứ hạng kết thúc trận (1-8), metric chính để đánh giá hiệu quả
- **Augment:** Power-up chọn tại stage 2-1, 3-2, 4-2 trong mỗi trận

## Riot API Notes

- **Rate Limits:** Dev key: 20 req/s, 100 req/2min. Production key: cao hơn sau khi được approve
- **Routing:** League endpoints dùng platform routing (na1, euw1, kr). Match endpoints dùng regional routing (americas, europe, asia)
- **PBE Region:** `pbe1.api.riotgames.com` — sẽ dùng từ Phase 4
- **Policy:** KHÔNG được cung cấp thông tin in-game real-time. Chỉ phân tích post-match data
- **Static Data:** Community Dragon (`raw.communitydragon.org`) cho unit stats chi tiết, Data Dragon (`ddragon.leagueoflegends.com`) cho metadata cơ bản

## Current Phase & Status

**Phase 1: Core Infrastructure (01/02 - 21/02)**

| Task                                     | Deadline | Status |
| ---------------------------------------- | -------- | ------ |
| Riot API key + project repo + DB setup   | 07/02    | ☐      |
| Data Collector v1: single region         | 10/02    | ☐      |
| Rate limiter + multi-region expansion    | 14/02    | ☐      |
| Production API Key đăng ký               | 14/02    | ☐      |
| Cron scheduler: auto-collect mỗi 30 phút | 16/02    | ☐      |
| ETL pipeline: raw → structured tables    | 18/02    | ☐      |
| Materialized views + health check        | 20/02    | ☐      |
| 50K+ matches/day flowing ổn định         | 21/02    | ☐      |

## Database Schema (Core Tables)

```
players (puuid, region, tier, lp, updated_at)
matches (match_id, game_version, queue_id, game_datetime, game_length)
participants (match_id, puuid, placement, level, gold_left, damage_dealt, time_eliminated)
participant_units (match_id, puuid, character_id, tier, items[], rarity)
participant_traits (match_id, puuid, trait_name, num_units, tier_current, tier_total)
participant_augments (match_id, puuid, augment_name, augment_index)
meta_snapshots (snapshot_time, patch, comp_id, play_rate, winrate, avg_placement, sample_size)
```

## Common Commands

```bash
# Development
npm install                          # Install dependencies
nx serve backend                      # Start backend dev server
nx serve frontend                     # Start frontend dev server
nx run-many -t serve                  # Start all apps

# Database
nx run backend:migration:generate     # Generate new migration
nx run backend:migration:run          # Run pending migrations

# Testing
nx test backend                       # Run backend tests
nx test frontend                      # Run frontend tests
nx run-many -t test                   # Test all

# Build & Deploy
nx build backend                      # Build for production
nx build frontend                     # Build for production
docker compose -f docker/docker-compose.dev.yml up   # Dev environment
docker compose -f docker/docker-compose.prod.yml up  # Prod environment

# Linting
nx lint backend
nx lint frontend
```
