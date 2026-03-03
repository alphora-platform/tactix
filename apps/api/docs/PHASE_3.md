# Tactix — Phase 3: Dashboard + Polish

**Tuần 7–9 (15/03 → 31/03)** | Mục tiêu: Frontend đẹp, Patch Diff Analyzer, stress test sẵn sàng cho PBE

---

## Deliverables & Thứ tự thực hiện

| #   | Deliverable                                 | Deadline | Khu vực    | Skills                                                            |
| --- | ------------------------------------------- | -------- | ---------- | ----------------------------------------------------------------- |
| 1   | Frontend setup + shared layout + API client | 17/03    | `frontend` | `fe-project-setup`, `fe-api-client`, `infra-tailwind-config`      |
| 2   | Page: Meta Overview + Comp Detail           | 20/03    | `frontend` | `fe-custom-hooks`, `fe-type-patterns`                             |
| 3   | Page: My Stats (Personal Tracker)           | 23/03    | `frontend` | `fe-state-management`, `fe-custom-hooks`                          |
| 4   | Page: Trends + Regions                      | 25/03    | `frontend` | `fe-custom-hooks`, `fe-type-patterns`                             |
| 5   | Patch Diff Analyzer — Backend module        | 27/03    | `backend`  | `nestjs-module-generator`, `riot-api-integration`, `bullmq-queue` |
| 6   | Mobile responsive toàn bộ                   | 28/03    | `frontend` | `infra-tailwind-config`                                           |
| 7   | Stress test 3x volume + PBE readiness       | 30/03    | `backend`  | `bullmq-queue`, `database-typeorm`                                |
| 8   | Full system documentation                   | 31/03    | `docs`     | —                                                                 |

---

## Task 1 — Frontend Setup: Project + Layout + API Client

**Deadline: 17/03 | Khu vực: `frontend` | Skills: `fe-project-setup`, `fe-api-client`, `infra-tailwind-config`**

```
Bạn đang làm việc trên Tactix TFT analytics platform.
Repo: alphora-platform/tactix | Path: apps/frontend/

Context: Backend Phase 1 + 2 hoàn chỉnh với các endpoints:
  GET /analytics/meta?patch=&region=&limit=
  GET /analytics/tier-list?patch=
  GET /analytics/trend/:compId?patch=&timeWindow=
  GET /analytics/comp/:compId?patch=
  GET /analytics/regions?patch=&regions=
  GET /tracker/:puuid/placements?patch=
  GET /tracker/:puuid/proficiency?patch=
  GET /tracker/:puuid/recent?limit=
  GET /tracker/:puuid/tilt
  GET /tracker/:puuid/report/weekly

Goal: Bootstrap toàn bộ frontend app với layout, routing, API client chuẩn.

Tech stack:
  React 19 + Vite + TypeScript strict mode
  TanStack Router (file-based routing)
  TanStack Query (server state)
  Recharts (charts & data viz)
  TailwindCSS (styling — KHÔNG dùng Ant Design, thiên về dark gaming aesthetic)
  Zustand (client state — lưu puuid người dùng, patch đang chọn)
  Axios (HTTP client)

Tasks:
1. Khởi tạo project theo /fe-project-setup, nhưng KHÔNG cài Ant Design.
   Thay bằng Headless UI hoặc Radix UI cho các primitive components.

2. Tailwind config (theo /infra-tailwind-config) với gaming dark theme:
   colors:
     bg-primary: #0d0f14     (main background)
     bg-card: #161a23        (card surface)
     bg-elevated: #1e2433    (elevated surface)
     accent-gold: #c89b3c    (TFT gold — highlights, S tier)
     accent-blue: #4fc3f7    (links, info, trend up)
     accent-red: #ef5350     (danger, trend down)
     accent-green: #66bb6a   (success, rising)
     text-primary: #e0e0e0
     text-secondary: #9e9e9e
     border: #2a3040

3. Tạo API client theo /fe-api-client:
   baseURL: import.meta.env.VITE_API_URL (default: http://localhost:3001)
   Không có auth — public API
   Tạo các API service files:
     src/lib/api/analytics.api.ts  → meta, tier-list, trend, comp detail, regions
     src/lib/api/tracker.api.ts    → placements, proficiency, recent, tilt, weekly report

4. Type definitions (theo /fe-type-patterns) tại src/lib/types/:
   analytics.types.ts:
     CompStatDto, TierListDto, TrendDto, CompDetailDto, RegionalMetaDto
   tracker.types.ts:
     PlacementDistributionDto, CompProficiencyDto, TiltReportDto, WeaknessReportDto

5. Shared layout: src/components/layout/AppLayout.tsx
   - Sidebar navigation (collapse-able trên mobile):
     Meta Overview (/) | Comp Detail | My Stats | Trends | Regions
   - Header: logo "TACTIX", patch selector (dropdown), region filter global
   - Zustand store: useSettingsStore { puuid, selectedPatch, selectedRegion, setPuuid, ... }

6. Routes (TanStack Router file-based):
   src/routes/
     __root.tsx          → AppLayout wrapper
     index.tsx           → redirect to /meta
     meta/index.tsx      → Meta Overview page
     meta/$compId.tsx    → Comp Detail page
     stats/index.tsx     → My Stats page (prompt PUUID nếu chưa set)
     trends/index.tsx    → Trends page
     regions/index.tsx   → Regions page

Follow: skills/reactjs/fe-project-setup/SKILL.md, skills/reactjs/fe-api-client/SKILL.md,
        skills/infra/infra-tailwind-config/SKILL.md
```

---

## Task 2 — Page: Meta Overview + Comp Detail

**Deadline: 20/03 | Khu vực: `frontend` | Skills: `fe-custom-hooks`, `fe-type-patterns`**

```
Bạn đang làm việc trên Tactix frontend.
Repo: alphora-platform/tactix | Path: apps/frontend/src/

Context: Task 1 hoàn chỉnh. Layout, API client, types đã có.
Goal: Build 2 trang quan trọng nhất — Meta Overview (tier list) và Comp Detail.

--- PAGE 1: META OVERVIEW (src/routes/meta/index.tsx) ---

Layout: Dark card grid với tier sections S / A / B / C

1. Custom hooks (src/lib/hooks/useMetaData.ts):
   - useTierList(patch?: string, region?: string)
     → useQuery key: ['tier-list', patch, region]
     → GET /analytics/tier-list?patch=&region=
     → staleTime: 5 * 60 * 1000 (5 phút)
   - useMetaStats(patch?: string, region?: string)
     → GET /analytics/meta?patch=&region=&limit=50

2. Component: CompCard (src/components/meta/CompCard.tsx)
   Hiển thị mỗi comp trong tier list dạng card:
   - Comp label (trait names)
   - Winrate (% với màu: >55% green, 50-55% yellow, <50% red)
   - Top4 rate
   - Avg placement
   - Sample size (badge nhỏ)
   - Trend arrow: ↑ xanh nếu RISING, ↓ đỏ nếu FALLING, — nếu STABLE
   - Tier badge (S/A/B/C) với màu: S=accent-gold, A=accent-blue, B=gray, C=muted
   - Click → navigate to /meta/:compId

3. Component: TierSection (src/components/meta/TierSection.tsx)
   - Header: "S TIER" với separator line có màu tier
   - Grid: responsive 1→2→3→4 columns
   - CompCard cho mỗi comp trong tier

4. Meta Overview page:
   - Filter bar: PatchSelector + RegionSelector + TimeWindowSelector (6h/12h/24h/7d)
   - 4 TierSection (S, A, B, C)
   - Loading skeleton (shimmer effect, 12 cards)
   - Empty state nếu không có data

--- PAGE 2: COMP DETAIL (src/routes/meta/$compId.tsx) ---

1. Custom hooks (src/lib/hooks/useCompDetail.ts):
   - useCompDetail(compId: string, patch?: string)
     → GET /analytics/comp/:compId?patch=
   - useCompTrend(compId: string, patch?: string)
     → GET /analytics/trend/:compId?patch=&timeWindow=24h

2. Sections cần build:

   Section A — Header:
   - Comp label lớn, tier badge, trending status
   - 4 stat pills: Win Rate | Top 4 | Avg Placement | Sample Size

   Section B — Best Items (Recharts BarChart):
   - Cho từng carry unit: top 3 item combos với win_rate bars
   - Tooltip: combo name + win_rate + sample_size
   - Dùng: <BarChart> từ recharts

   Section C — Augment Paths (3 column grid):
   - Stage 2-1 / 3-2 / 4-2
   - Mỗi stage: top 3 augments với badge top4_rate

   Section D — Level Timing + Unit Priority:
   - Level distribution: horizontal bar chart
   - Unit priority: ordered list với badge "CORE" / "FLEX"

   Section E — Trend Chart (Recharts LineChart):
   - Line: win_rate theo các time windows 6h/12h/24h/3d/7d
   - Second line: top4_rate
   - Dùng: <LineChart> với <ResponsiveContainer>

Follow: skills/reactjs/fe-custom-hooks/SKILL.md, skills/reactjs/fe-type-patterns/SKILL.md
```

---

## Task 3 — Page: My Stats (Personal Tracker)

**Deadline: 23/03 | Khu vực: `frontend` | Skills: `fe-state-management`, `fe-custom-hooks`**

```
Bạn đang làm việc trên Tactix frontend.
Repo: alphora-platform/tactix | Path: apps/frontend/src/

Context: Task 1 + 2 hoàn chỉnh. Layout và API client đã có.
Goal: Build My Stats page — personal performance dashboard.

1. PUUID Entry Flow:
   - Nếu chưa có puuid trong useSettingsStore:
     → Hiển thị modal/prompt: "Enter your Riot PUUID to track your stats"
     → Link hướng dẫn cách lấy PUUID (riotgames.com/riot-id)
     → Lưu vào Zustand + localStorage

2. Custom hooks (src/lib/hooks/useTrackerData.ts):
   - usePlacementData(puuid: string, patch?: string)
     → GET /tracker/:puuid/placements?patch=
   - useCompProficiency(puuid: string, patch?: string)
     → GET /tracker/:puuid/proficiency?patch=
   - useRecentGames(puuid: string, limit = 20)
     → GET /tracker/:puuid/recent?limit=
   - useTiltReport(puuid: string)
     → GET /tracker/:puuid/tilt
   - useWeeklyReport(puuid: string)
     → GET /tracker/:puuid/report/weekly

3. Sections cần build:

   Section A — Overview Cards (4 stat boxes):
   - Overall avg placement | Win rate | Top 4 rate | Games this patch

   Section B — Placement Distribution (Recharts BarChart):
   - X-axis: placement 1–8
   - Y-axis: count
   - Color: 1-4 green gradient, 5-8 red gradient
   - Tooltip: count + percentage

   Section C — Recent Games Table:
   - Columns: Date | Comp | Placement | Game Length
   - Placement cell: màu theo value (1=gold, 2-3=silver, 4=bronze, 5-8=red dim)
   - Sortable by date (default: newest first)
   - Pagination: 10 per page

   Section D — Comp Proficiency (Recharts horizontal BarChart):
   - Mỗi bar = 1 comp, giá trị = proficiency_score
   - Dương (xanh) = better than average | Âm (đỏ) = worse than average
   - Chỉ hiện comps có >= 5 games
   - Tooltip: comp + score + games played

   Section E — Tilt Detection Card:
   - Badge: "TILT DETECTED ⚠️" nếu tilt_detected = true, "ON TRACK ✓" nếu false
   - Late night degradation: hiện nếu late_night_degradation đáng kể
   - Chart nhỏ: sliding avg placement 20 games gần nhất (LineChart)

   Section F — Weekly Weakness Report:
   - Accordion/collapsible
   - 3 weakness cards: type badge + description + suggestion
   - Generated at timestamp

Follow: skills/reactjs/fe-state-management/SKILL.md, skills/reactjs/fe-custom-hooks/SKILL.md
```

---

## Task 4 — Page: Trends + Regions

**Deadline: 25/03 | Khu vực: `frontend` | Skills: `fe-custom-hooks`, `fe-type-patterns`**

```
Bạn đang làm việc trên Tactix frontend.
Repo: alphora-platform/tactix | Path: apps/frontend/src/

Context: Tasks 1–3 hoàn chỉnh.
Goal: Build 2 trang data visualization còn lại — Trends và Regions.

--- PAGE 1: TRENDS (src/routes/trends/index.tsx) ---

Mục đích: Track sự thay đổi winrate/playrate của comp theo thời gian.

1. Custom hooks (src/lib/hooks/useTrendData.ts):
   - useMultiCompTrend(compIds: string[], patch: string, timeWindow: string)
     → Multiple useQuery calls với Promise.all
   - useRisingComps(patch: string)
     → GET /analytics/meta?patch= → filter trend_direction === 'RISING'

2. Sections:

   Section A — Rising & Falling Summary:
   - 2 columns: RISING (top 5 comps trending up) | FALLING (top 5 trending down)
   - Mỗi item: comp label + winrate delta (với arrow icon)

   Section B — Multi-Comp Trend Chart (Recharts LineChart):
   - Multi-line chart: mỗi comp = 1 line với màu khác nhau
   - X-axis: time windows [6h, 12h, 24h, 3d, 7d]
   - Y-axis: win_rate (%)
   - Comp selector: checkbox list để chọn tối đa 5 comps
   - Legend interactive: click để hide/show line

   Section C — Tier Movement:
   - Bảng: comp | prev tier | current tier | delta
   - Chỉ hiện comps đã đổi tier (RISING = tier tăng, FALLING = tier giảm)
   - Badge delta: S→A ↓, B→A ↑, etc.

--- PAGE 2: REGIONS (src/routes/regions/index.tsx) ---

Mục đích: So sánh meta giữa các region.

1. Custom hooks (src/lib/hooks/useRegionData.ts):
   - useRegionalMeta(patch: string, regions: string[])
     → GET /analytics/regions?patch=&regions=KR,EUW,NA,EUNE,BR,JP,OCE,TR
   - useRegionalExclusive(patch: string)
     → GET /analytics/regions/exclusive?patch=
   - useRegionComparison(patch: string, regionA: string, regionB: string)
     → GET /analytics/regions/compare?patch=&regionA=&regionB=

2. Sections:

   Section A — Region Heatmap:
   - Grid: rows = comps (top 20), columns = regions (8)
   - Cell value = win_rate, color gradient: low (dark red) → high (bright green)
   - Sticky header row (region names) và sticky first column (comp names)
   - Hover tooltip: exact win_rate + sample_size per cell
   - Implement với CSS Grid + inline styles (không có recharts heatmap native)

   Section B — Region-Exclusive Picks:
   - Cards cho comps mạnh ở 1 region nhưng yếu ở các region khác
   - "🔥 KR EXCLUSIVE" badge + comp label
   - strong_win_rate vs others_avg comparison bar

   Section C — Head-to-Head Comparison:
   - Region A selector | vs | Region B selector
   - Bar chart: side-by-side bars mỗi comp, màu A vs B
   - Meta similarity score: progress bar (0% = hoàn toàn khác, 100% = giống nhau)

Follow: skills/reactjs/fe-custom-hooks/SKILL.md, skills/reactjs/fe-type-patterns/SKILL.md
```

---

## Task 5 — Patch Diff Analyzer: Backend Module

**Deadline: 27/03 | Khu vực: `backend` | Skills: `nestjs-module-generator`, `riot-api-integration`, `bullmq-queue`**

```
Bạn đang làm việc trên Tactix backend (NestJS + TypeScript strict mode).
Repo: alphora-platform/tactix | Path: apps/backend/src/modules/patch-analyzer/

Context: Phase 1 + 2 hoàn chỉnh. alerts module đã có patch-drop detection cơ bản.
Goal: Build Patch Diff Analyzer — "secret weapon" khi patch mới drop.

Tasks:

1. Tạo module `patch-analyzer` (API + Worker pattern):
   Files: patch-analyzer.module.ts, patch-analyzer.service.ts, patch-analyzer.controller.ts
   Register queue: 'patch-analysis'
   Register trong AppModule

2. Tạo `PatchNotesParserService` (patch-analyzer/patch-notes-parser.service.ts):

   - Method `fetchPatchNotes(patchVersion: string): Promise<PatchNotesRaw>`
     → Scrape từ: https://www.leagueoflegends.com/en-us/news/game-updates/tft-patch-{version}-notes/
       (ví dụ: tft-patch-14-3-notes)
     → Dùng axios để fetch HTML, parse bằng regex/string manipulation (không cần cheerio nếu phức tạp)
     → Extract sections: units, items, traits, augments
     → Mỗi change: { entityName, entityType, changeType: 'buff'|'nerf'|'adjust', details: string[] }

   - Method `parseDelta(raw: string): ChangeEntry[]`
     → Nhận diện pattern: "+X" → buff, "-X" → nerf, "changed" → adjust
     → Return: { field, before?, after?, direction: 'up'|'down'|'neutral' }

3. Tạo `ImpactScoringService` (patch-analyzer/impact-scoring.service.ts):

   - Method `scoreChanges(changes: ChangeEntry[], currentMeta: CompStatDto[]): ImpactScore[]`
     Scoring logic:
     → Với mỗi change entry, tìm comps trong meta có chứa entity đó
     → base_score = abs(numeric_change / original_value) × 100 (% change)
       Nếu không có numeric: buff=+15, nerf=-15, adjust=±7
     → impact = base_score × comp_presence_weight × meta_tier_weight
       comp_presence_weight = sample_size / total_games (popularity)
       meta_tier_weight: S=2.0, A=1.5, B=1.0, C=0.7
     → Aggregate per comp: sum of all impacts affecting this comp

   - Method `getPredictions(patch: string): PredictionDto`
     → Fetch current meta từ MetaStatsService
     → Fetch patch notes từ PatchNotesParserService
     → Score changes
     → Return:
       { patch, winners: CompImpactDto[], losers: CompImpactDto[],
         changes_breakdown: ChangeEntry[], generated_at, confidence: 'low'|'medium'|'high' }
       winners = top 5 comps với positive total impact
       losers = top 5 comps với negative total impact
       confidence: 'high' nếu sample_size >= 1000, 'medium' >= 200, 'low' otherwise

4. Tạo `AccuracyTrackingService` (patch-analyzer/accuracy-tracking.service.ts):

   - Entity: PatchPrediction (patch, comp_id, predicted_direction, predicted_score,
                               actual_winrate_before, actual_winrate_after, accuracy_score, evaluated_at)
   - Method `recordPrediction(prediction: PredictionDto): Promise<void>` — gọi khi patch drop
   - Method `evaluatePrediction(patch: string): Promise<void>` — gọi 48h sau patch
     → Compare predicted direction vs actual winrate delta
     → accuracy_score: +1 nếu direction đúng, 0 nếu sai
   - Method `getHistoricalAccuracy(): Promise<AccuracyReport>`
     → Tổng hợp accuracy theo patch, overall correct%

5. BullMQ processor `PatchAnalysisProcessor`:
   Job 'analyze-patch': triggered khi alerts/patch-drop.processor.ts detect patch mới
   → Fetch patch notes → score impacts → record predictions → gửi Discord alert với winners/losers

6. Expose endpoints:
   GET /patch-analyzer/predictions?patch=         → current patch predictions
   GET /patch-analyzer/accuracy                    → historical accuracy
   GET /patch-analyzer/changes?patch=             → raw change breakdown

Follow: .agent/skills/nestjs-module-generator/SKILL.md (API + Worker pattern)
        .agent/skills/riot-api-integration/SKILL.md (HTTP fetching patterns)
        .agent/skills/bullmq-queue/SKILL.md (processor, flow jobs)
```

---

## Task 6 — Mobile Responsive

**Deadline: 28/03 | Khu vực: `frontend` | Skills: `infra-tailwind-config`**

```
Bạn đang làm việc trên Tactix frontend.
Repo: alphora-platform/tactix | Path: apps/frontend/src/

Context: Tasks 1–4 hoàn chỉnh. Tất cả 5 pages đã render trên desktop.
Goal: Đảm bảo app dùng được thoải mái trên điện thoại giữa các game.

Breakpoint strategy (Tailwind):
  mobile:  < 640px  → sm:
  tablet:  640–1024px → md:
  desktop: > 1024px → lg:

Tasks per component:

1. AppLayout (Sidebar):
   - Mobile: sidebar collapse thành bottom navigation bar (5 icons)
   - Tablet: sidebar collapse thành icon-only sidebar (hover = tooltip label)
   - Desktop: full sidebar với labels

2. Meta Overview (CompCard grid):
   - mobile: 1 column, card compact (hide sample size)
   - tablet: 2 columns
   - desktop: 3-4 columns

3. Comp Detail:
   - mobile: sections stack vertically, charts chiều cao giảm xuống 200px
   - Recharts: ResponsiveContainer width="100%" luôn luôn
   - Best Items: horizontal scroll trên mobile thay vì grid

4. My Stats:
   - Recent Games Table: trên mobile ẩn cột Game Length, chỉ giữ Date/Comp/Placement
   - Proficiency chart: chiều cao 250px trên mobile (đủ xem top 5 comps)
   - Tilt card + Weekly report: full width stack

5. Trends:
   - Multi-comp chart: trên mobile chỉ cho chọn tối đa 3 comps
   - Rising/Falling: stack vertically thay vì 2 columns

6. Regions:
   - Heatmap: horizontal scroll wrapper, min-width: 800px (không thể shrink)
   - Region comparison: stack A/B selectors vertically

7. Header:
   - Patch selector + Region filter collapse vào icon button → bottom sheet on mobile

Validation: Test trên Chrome DevTools responsive mode: iPhone 14 (390px), iPad (768px), Desktop (1440px).

Follow: skills/infra/infra-tailwind-config/SKILL.md
```

---

## Task 7 — Stress Test 3x Volume + PBE Readiness

**Deadline: 30/03 | Khu vực: `backend` | Skills: `bullmq-queue`, `database-typeorm`**

```
Bạn đang làm việc trên Tactix backend.
Repo: alphora-platform/tactix | Path: apps/backend/

Context: Toàn bộ Phase 1 + 2 backend hoàn chỉnh. PBE mở ~01/04.
Goal: Đảm bảo hệ thống chịu được 3x load thông thường và sẵn sàng switch sang PBE.

Tasks:

1. Load test script (scripts/load-test.ts):
   - Simulate 3x normal volume: 150,000+ matches trong 24h (vs 50K thông thường)
   - Dùng BullMQ flow để inject test jobs:
     → Add 10,000 fake match-collection jobs với mock matchIds
     → Measure: jobs/second throughput, queue lag, error rate
   - Concurrency test: tăng ETL concurrency từ 5 → 15, đo throughput delta
   - Target: queue lag < 5 phút ở 3x load

2. Comp Detection stress test (scripts/test-comp-detection.ts):
   - Load Set 17 trait names từ Community Dragon (mock nếu chưa available):
     https://raw.communitydragon.org/latest/cdragon/tft/en_us.json
   - Tạo 100 fake participants với random Set 17 trait combos
   - Verify CompDetectionService.identifyComp() returns consistent comp_id
   - Verify KHÔNG có hardcoded trait names (search codebase cho "Set16_" strings)
   - If found: throw error và list các files cần fix

3. PBE endpoint setup:
   - Thêm 'PBE' vào SUPPORTED_REGIONS constant trong riot-api constants
   - PBE platform URL: pbe1.api.riotgames.com
   - PBE regional URL: americas.api.riotgames.com (PBE dùng americas routing)
   - Thêm env var: PBE_MODE=false (khi set true → thêm PBE vào collection regions)
   - Verify rate limiter hoạt động với PBE (cùng limits với live)

4. Set 17 data pre-load (scripts/preload-set17-metadata.ts):
   - Fetch từ Data Dragon: https://ddragon.leagueoflegends.com/cdn/versions.json
     → Lấy latest version
     → Fetch: /cdn/{version}/data/en_US/tft-champion.json
     → Fetch: /cdn/{version}/data/en_US/tft-item.json
   - Cache metadata trong Redis key: "metadata:champions", "metadata:items"
   - TTL: 24h
   - Log: bao nhiêu champions/items được load

5. Alert system end-to-end test:
   - Inject mock patch version change vào Redis (simulate patch drop)
   - Verify: patch-drop.processor.ts fires → Discord webhook được gọi → message đến
   - Inject mock comp với win_rate tăng 5% → meta-shift alert fires
   - Verify alert timing: < 35 phút sau khi data change (1 cron cycle)

6. Database performance check:
   - Run EXPLAIN ANALYZE trên top 5 queries chậm nhất (pg_stat_statements)
   - Check materialized view refresh time với 3x data volume
   - Target: REFRESH MATERIALIZED VIEW CONCURRENTLY < 30 giây
   - Add indexes nếu cần (document lý do)

7. Monitoring checklist (document kết quả vào STRESS_TEST_RESULTS.md):
   - [ ] Queue throughput đạt target tại 3x load
   - [ ] Comp Detection hoạt động với trait names mới
   - [ ] PBE endpoint cấu hình đúng
   - [ ] Set 17 metadata pre-load thành công
   - [ ] Alert system fire đúng trong < 35 phút
   - [ ] DB queries < 100ms ở P95

Follow: .agent/skills/bullmq-queue/SKILL.md (resources/monitoring.md)
        .agent/skills/database-typeorm/SKILL.md (performance tips, indexes)
```

---

## Task 8 — Full System Documentation

**Deadline: 31/03 | Khu vực: `docs`**

```
Bạn đang làm việc trên Tactix.
Repo: alphora-platform/tactix | Path: docs/ và root README.md

Context: Phase 1 + 2 + 3 hoàn chỉnh. Set 17 PBE mở trong 2 ngày.
Goal: Document toàn bộ hệ thống để có thể debug nhanh trong Phase 4 PBE Blitz.

Tạo các file sau:

1. README.md (root — cập nhật):
   - Quick start: docker-compose up → app chạy
   - Architecture diagram (text-based ASCII)
   - Links đến docs chi tiết

2. docs/ARCHITECTURE.md:
   - System overview: data flow từ Riot API → ETL → DB → Analytics → Frontend
   - Module dependency map
   - Queue topology: tên queues, priorities, processors
   - Database schema: tóm tắt các tables và materialized views
   - Caching strategy: Redis keys và TTLs

3. docs/OPERATIONS.md (quan trọng nhất cho PBE Blitz):
   - Cách switch sang PBE: set PBE_MODE=true → restart
   - Cách force refresh materialized views thủ công
   - Cách check queue health: /health/pipeline endpoint
   - Cách retry failed jobs: Bull Board URL
   - Cách invalidate tier-list cache: Redis CLI command
   - Common errors và cách fix:
     - "Rate limit exceeded" → check rate-limiter Redis keys
     - "Queue backlogged" → tăng concurrency hoặc add worker instance
     - "Materialized view stale" → REFRESH MATERIALIZED VIEW CONCURRENTLY mv_comp_stats

4. docs/API_REFERENCE.md:
   - Tất cả public endpoints với request/response examples
   - Query parameters và default values
   - Error response format

5. docs/PBE_CHECKLIST.md (Phase 4 game plan):
   - Day 1 launch sequence (01/04)
   - Monitoring commands để chạy mỗi giờ trong ngày đầu
   - Threshold alerts cần watch: error rate, queue lag, DB size
   - Rollback plan nếu có vấn đề

Format: Markdown. Viết cho một developer (bản thân) đọc lúc 2AM khi có incident.
Ưu tiên: ngắn gọn, actionable, copy-paste ready commands.
```

---

## Summary — Dependency graph Phase 3

```
Task 1: Frontend Setup          (17/03)
    ↓
Task 2: Meta Overview + Detail  (20/03)  ← cần Task 1
Task 3: My Stats                (23/03)  ← cần Task 1
Task 4: Trends + Regions        (25/03)  ← cần Task 1

Task 5: Patch Diff Analyzer     (27/03)  ← independent (backend)
Task 6: Mobile Responsive       (28/03)  ← cần Tasks 2, 3, 4
Task 7: Stress Test + PBE Prep  (30/03)  ← independent (backend)
Task 8: Documentation           (31/03)  ← cần tất cả
```

---

## KPI check Phase 3

| Metric              | Target                          | Deadline |
| ------------------- | ------------------------------- | -------- |
| Dashboard v1        | 5 pages deployed on Vercel      | 25/03    |
| Patch Diff Analyzer | Parser + impact scoring working | 27/03    |
| Mobile responsive   | Usable trên iPhone 14           | 28/03    |
| Stress test         | 3x volume + PBE endpoint ready  | 30/03    |
| Documentation       | Full system docs complete       | 31/03    |
