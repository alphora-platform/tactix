# Tactix — UI Redesign: Friendly Names + Visual Assets

**Priority: High** | Bổ sung vào Phase 3 | Deadline: song song với Task 2–4

---

## Vấn đề hiện tại (từ screenshot)

| Vấn đề                             | Chi tiết                                                               |
| ---------------------------------- | ---------------------------------------------------------------------- |
| ❌ Raw API keys hiển thị trực tiếp | `TFT16_AatroxUnique TFT16_DarkinWeapon` thay vì `Darkin Weapon Aatrox` |
| ❌ Không có hình ảnh               | Chỉ có text thuần, không có champion icon / trait icon                 |
| ❌ Comp không nhận diện được       | User không biết đây là comp gì                                         |
| ❌ Win rate hiển thị quá thấp      | 0.3% — vì đang tính trên tổng game, không phải per-comp                |
| ❌ Trend chart không đọc được      | Bar quá nhỏ, label bị cắt                                              |
| ❌ Duplicate comps                 | Cùng comp xuất hiện nhiều lần với tier khác nhau                       |

---

## Kiến trúc giải pháp

```
Community Dragon JSON  →  Backend Metadata Service  →  Redis Cache
                                    ↓
                          Tên thân thiện + Image URLs
                                    ↓
                          Frontend GameAssetService  →  Components
```

---

## Task R1 — Backend: Metadata Service (Friendly Names + Image URLs)

**Deadline: ưu tiên làm trước | Module: `backend/metadata` | Skills: `nestjs-module-generator`, `riot-api-integration`**

```
Bạn đang làm việc trên Tactix backend (NestJS + TypeScript strict mode).
Repo: alphora-platform/tactix | Path: apps/backend/src/modules/metadata/

Context: Hiện tại các comp/trait/unit name đang hiển thị dưới dạng raw API key
như "TFT16_AatroxUnique", "TFT16_DarkinWeapon". Cần build Metadata Service để:
  1. Resolve raw API names → friendly display names
  2. Cung cấp image URLs từ Community Dragon

Source data: Community Dragon JSON (không cần API key, không rate limit)
  Champions: https://raw.communitydragon.org/latest/cdragon/tft/en_us.json
  Asset base: https://raw.communitydragon.org/latest/game/

Tasks:

1. Tạo `metadata` module (API Module pattern + Worker):
   Files: metadata.module.ts, metadata.service.ts, metadata.controller.ts
   Register trong AppModule

2. Tạo `GameDataLoaderService` (metadata/game-data-loader.service.ts):

   Method `loadFromCommunityDragon(): Promise<TftGameData>`
   → Fetch: https://raw.communitydragon.org/latest/cdragon/tft/en_us.json
   → Parse ra:
     champions: { [apiName: string]: { name: string, cost: number, traits: string[], tileIcon: string, squareIcon: string } }
     traits:    { [apiName: string]: { name: string, icon: string, description: string } }
     items:     { [apiName: string]: { name: string, icon: string, description: string } }
     augments:  { [apiName: string]: { name: string, icon: string, tier: 'silver'|'gold'|'prismatic' } }

   Asset URL pattern từ Community Dragon:
     JSON field icon path: "/lol-game-data/assets/ASSETS/..."
     → Convert to URL: https://raw.communitydragon.org/latest/game/assets/...
     → Lowercase toàn bộ path sau "game/"
     Example: "/lol-game-data/assets/ASSETS/Characters/TFT16_Aatrox/HUD/TFT16_Aatrox_Square.TFT_set16.png"
     → https://raw.communitydragon.org/latest/game/assets/characters/tft16_aatrox/hud/tft16_aatrox_square.tft_set16.png

   Method `convertAssetPath(rawPath: string): string`
   → Nhận "/lol-game-data/assets/ASSETS/..."
   → Return full URL theo pattern trên

3. Tạo `MetadataCacheService` (metadata/metadata-cache.service.ts):
   → Lưu parsed data vào Redis: key "metadata:gamedata", TTL 6h
   → Method `get(): Promise<TftGameData | null>`
   → Method `set(data: TftGameData): Promise<void>`
   → Method `getOrLoad(): Promise<TftGameData>` — cache-first, fallback load

4. Tạo `FriendlyNameService` (metadata/friendly-name.service.ts):

   Method `resolveTraitName(apiName: string): string`
   → Input:  "TFT16_AatroxUnique" | "TFT16_Brawler" | "Set16_Bruiser"
   → Strip prefix patterns: TFT16_, TFT17_, Set16_, Set17_
   → Lookup trong metadata.traits → return trait.name nếu có
   → Fallback: titleCase(stripped) → "Aatrox Unique" → "Darkin Weapon"

   Method `resolveChampionName(apiName: string): string`
   → Input: "TFT16_Aatrox"
   → Lookup trong metadata.champions → return champion.name "Aatrox"
   → Fallback: strip prefix + titleCase

   Method `resolveCompLabel(traitApiNames: string[]): string`
   → Nhận array: ["TFT16_AatroxUnique", "TFT16_Brawler"]
   → Map mỗi trait → friendly name
   → Return 2 primary traits joined: "Darkin Weapon Brawler"
   → Sort by: trait với nhiều units nhất đứng đầu

   Method `resolveItemName(apiName: string): string`
   → Lookup metadata.items → return item.name

   Method `resolveAugmentName(apiName: string): string`
   → Lookup metadata.augments → return augment.name

5. Tạo `AssetUrlService` (metadata/asset-url.service.ts):

   Method `getChampionSquare(apiName: string): string`
   → Return URL ảnh square (48x48) từ champion data
   → Fallback: https://raw.communitydragon.org/latest/game/assets/ux/tft/tft_missing.png

   Method `getChampionTile(apiName: string): string`
   → Return URL tile (full art) từ champion data

   Method `getTraitIcon(apiName: string): string`
   → Return URL trait icon

   Method `getItemIcon(apiName: string): string`
   → Return URL item icon

   Method `getAugmentIcon(apiName: string): string`
   → Return URL augment icon

6. Expose endpoints:
   GET /metadata/champions     → full champion list với names + URLs
   GET /metadata/traits        → full trait list với names + icons
   GET /metadata/items         → full item list
   GET /metadata/augments      → full augment list
   POST /metadata/refresh      → force reload từ Community Dragon (admin)

7. Schedule auto-refresh: @Cron('0 0 */6 * * *') — mỗi 6h load lại metadata

8. QUAN TRỌNG: Integrate vào existing analytics endpoints:
   Trong MetaStatsService.getTopComps(): trước khi return, với mỗi comp:
   → Thêm field: comp_label = FriendlyNameService.resolveCompLabel(trait_names)
   → Thêm field: trait_icons = trait_names.map(t => AssetUrlService.getTraitIcon(t))
   Tương tự cho CompAnalyzerService, TierClassificationService.

Follow: .agent/skills/nestjs-module-generator/SKILL.md
        .agent/skills/riot-api-integration/SKILL.md (Community Dragon patterns)
```

---

## Task R2 — Frontend: Asset Hook + Image Components

**Deadline: sau Task R1 | Path: apps/frontend/src/ | Skills: `fe-custom-hooks`, `frontend-design`**

````
Bạn đang làm việc trên Tactix frontend (React + TypeScript + TailwindCSS).
Repo: alphora-platform/tactix | Path: apps/frontend/src/

Context: Backend đã expose /metadata/* endpoints. Frontend đang hiển thị
raw API names như "TFT16_Brawler". Cần build asset layer để resolve names + images.

Tasks:

1. API service (src/lib/api/metadata.api.ts):
   export const getChampions = () => apiClient.get('/metadata/champions').then(r => r.data)
   export const getTraits    = () => apiClient.get('/metadata/traits').then(r => r.data)
   export const getItems     = () => apiClient.get('/metadata/items').then(r => r.data)
   export const getAugments  = () => apiClient.get('/metadata/augments').then(r => r.data)

2. React Query hooks (src/lib/hooks/useMetadata.ts):
   - useChampions() → staleTime: Infinity (metadata không thay đổi trong session)
   - useTraits()
   - useItems()
   - useAugments()

   Preload tất cả 4 hooks ở AppLayout level (prefetchQuery) để có sẵn trong cache.

3. Utility functions (src/lib/utils/gameAssets.ts):

   export function getTraitName(apiName: string, traits: TraitMetadata): string
   → Lookup traits map → return displayName || formatRawName(apiName)

   export function formatRawName(apiName: string): string
   → Strip: TFT16_, TFT17_, Set16_, Set17_, TFT_
   → CamelCase split: "DarkinWeapon" → "Darkin Weapon"
   → Return cleaned string

   export function getTraitIconUrl(apiName: string, traits: TraitMetadata): string
   export function getChampionSquareUrl(apiName: string, champions: ChampionMetadata): string
   export function getItemIconUrl(apiName: string, items: ItemMetadata): string

   export function getCostColor(cost: number): string
   → 1-cost: '#808080' | 2-cost: '#11a849' | 3-cost: '#207ac7'
   → 4-cost: '#b44be1' | 5-cost: '#e9a617'

4. Reusable Image Components (src/components/game/):

   TraitIcon.tsx:
   → Props: apiName, size?: 'sm'|'md'|'lg' (default md = 24px)
   → Hiển thị icon với fallback placeholder nếu load lỗi
   → Tooltip: trait friendly name
   → onError: replace src với fallback grey placeholder
   ```tsx
   <img
     src={traitIconUrl}
     alt={traitName}
     className={cn("rounded", sizeClass)}
     onError={(e) => { e.currentTarget.src = FALLBACK_ICON }}
     title={traitName}
   />
````

ChampionSquare.tsx:
→ Props: apiName, size?, showCost?: boolean, showStars?: number
→ Hexagonal clip hoặc rounded square
→ Cost border color theo getCostColor()
→ Star rating nếu showStars > 0: ⭐⭐⭐ ở dưới
→ Tooltip: champion name

ItemIcon.tsx:
→ Props: apiName, size?
→ Square icon với rounded corners
→ Tooltip: item friendly name

AugmentIcon.tsx:
→ Props: apiName, tier?: 'silver'|'gold'|'prismatic'
→ Border glow theo tier: silver=grey, gold=yellow, prismatic=rainbow gradient
→ Tooltip: augment name

CompTraitRow.tsx:
→ Props: traitApiNames: string[] (2–4 traits)
→ Hiển thị: [TraitIcon] [TraitIcon] + "Primary Trait / Secondary Trait"
→ Layout: icon icons bên trái, text label bên phải

5. Fallback handling strategy:
   → Tất cả img đều có onError handler
   → Fallback URL: /assets/placeholder-[type].png (tự tạo placeholder tối giản)
   → Nếu metadata chưa load: hiển thị skeleton pulse animation

Follow: skills/reactjs/fe-custom-hooks/SKILL.md, /mnt/skills/public/frontend-design/SKILL.md

```

---

## Task R3 — UI Redesign: Meta Overview Page
**Deadline: song song với Task R2 | Path: apps/frontend/src/routes/meta/ | Skills: `frontend-design`**

```

Bạn đang làm việc trên Tactix frontend.
Repo: alphora-platform/tactix | Path: apps/frontend/src/routes/meta/index.tsx

Context: Screenshot hiện tại (xem mô tả vấn đề) cần redesign hoàn toàn.
Tham khảo UX của metatft.com — tier cards với champion icons, trait icons rõ ràng.

Design direction: Dark gaming aesthetic, thông tin dense nhưng scannable.
Primary inspiration: metatft.com nhưng với màu sắc brand của Tactix (gold/blue accent).

--- PHẦN 1: FIX DỮ LIỆU ---

Vấn đề win rate 0.3%: Đây là play rate (số games / tổng games), không phải win rate thật.
Backend đã có win_rate đúng (games với placement=1 / games của comp đó).
→ Kiểm tra API response: dùng `win_rate` field thay vì `play_rate`
→ Hiển thị win rate ≥ 40% là bình thường với top comps

Vấn đề duplicate comps: Cùng trait combo xuất hiện nhiều lần.
→ Dedup bằng comp_id trước khi render
→ Nếu duplicate: giữ bản có sample_size cao nhất

--- PHẦN 2: REDESIGN COMP CARD ---

Thay thế hoàn toàn CompCard component:

```tsx
// CompCard mới — layout:
// ┌─────────────────────────────────────────────┐
// │ [A] [TraitIcon][TraitIcon] Darkin Brawler ↑ │
// │                                             │
// │ [ChampIcon][ChampIcon][ChampIcon][ChampIcon] │
// │                                             │
// │  Win 54.2%  │  Top4 72%  │  Avg 2.8  │ 847 │
// └─────────────────────────────────────────────┘
```

Props nhận vào: comp_id, tier, comp_label, trait_icons (URLs),
core_units (champion apiNames), win_rate, top4_rate,
avg_placement, sample_size, trend_direction

Champion icons row:
→ Hiển thị tối đa 6 champion icons (hexagonal clip, 32px)
→ Sort by cost DESC (5-cost đầu tiên)
→ Cost border color theo rarity
→ Nếu > 6: hiển thị "+N" badge

Stats row:
→ Win Rate: màu theo giá trị (≥55% = green, 45–55% = yellow, <45% = red)
→ Trend arrow: ↑ (green) nếu RISING, ↓ (red) nếu FALLING
→ Sample size: "847 games" — thêm badge nhỏ màu muted

Hover state:
→ Card lift (translateY -2px) + subtle border glow
→ Background nhạt hơn một chút

Click: navigate to /meta/:comp_id

--- PHẦN 3: REDESIGN TIER SECTION ---

Thay thế TierSection layout từ dạng bảng sang dạng cards grid:

Tier header:

```
┌────────────────────────────────────────────────┐
│ S TIER   ━━━━━━━━━━━━━━━━━━  0 comps this patch│
└────────────────────────────────────────────────┘
```

→ S tier: gold header | A: blue | B: grey | C: muted

Grid: masonry-like, responsive
→ Desktop: 3 columns
→ Tablet: 2 columns  
→ Mobile: 1 column

--- PHẦN 4: FILTER BAR ---

Filter bar ở top (sticky):

```
[🔍 Search comp...] [Patch: Latest ▼] [Region: All ▼] [Time: 24h ▼]
                                                    [↕ Sort by: Win Rate ▼]
```

→ Search: filter comps theo trait name (fuzzy match)
→ Patch/Region: đã có
→ Sort options: Win Rate | Top 4 | Avg Placement | Play Count
→ Sticky khi scroll (position: sticky top-0, backdrop blur)

Follow: /mnt/skills/public/frontend-design/SKILL.md

```

---

## Task R4 — UI Redesign: Comp Detail Page
**Deadline: sau Task R3 | Path: apps/frontend/src/routes/meta/$compId.tsx | Skills: `frontend-design`**

```

Bạn đang làm việc trên Tactix frontend.
Repo: alphora-platform/tactix | Path: apps/frontend/src/routes/meta/$compId.tsx

Context: Redesign Comp Detail page với game assets thật.
Reference: metatft.com/comps/[comp] — cách layout items, augments, units.

--- SECTION A: HERO HEADER ---

```
┌────────────────────────────────────────────────────────────────┐
│ ← Back    [TraitIcon] Darkin Weapon Brawler         [A TIER]  │
│                                                                │
│  Win 54.2% ↑   Top4 71.8%   Avg 2.41   847 games             │
│  ▓▓▓▓▓▓▓▓░░░░░░  Trend: RISING last 24h                       │
└────────────────────────────────────────────────────────────────┘
```

--- SECTION B: CHAMPIONS BOARD ---

Hiển thị như một "board" game thật — hex grid hoặc linear row:

```
 [Aatrox ★★★]  [Warwick ★★]  [Darius ★★]  [Mordekaiser ★★]
   5-cost            3-cost        2-cost         3-cost
  CORE              CORE           FLEX           FLEX

 Best items: [BT icon] [IE icon] [LW icon]
```

Mỗi champion card:
→ Square portrait (48px) với cost color border
→ Tên + star tier
→ Badge: "CORE" (gold) hoặc "FLEX" (grey) tùy unit_priority
→ Best items cho unit này: 3 item icons dưới portrait

--- SECTION C: AUGMENT PATHS (3 stages) ---

```
Stage 2-1              Stage 3-2              Stage 4-2
─────────────          ─────────────          ─────────────
[Icon] Augment A 68%   [Icon] Augment D 71%   [Icon] Augment G 74%
[Icon] Augment B 61%   [Icon] Augment E 65%   [Icon] Augment H 69%
[Icon] Augment C 58%   [Icon] Augment F 59%   [Icon] Augment I 62%
```

→ AugmentIcon component với tier glow
→ Win rate % bên phải
→ Hover tooltip: augment description

--- SECTION D: TREND CHART (Recharts) ---

Line chart: win_rate qua các windows 6h → 12h → 24h → 3d → 7d
→ Single line, smooth curve
→ Area fill với gradient opacity
→ Annotations: min/max points
→ X-axis: time labels, Y-axis: win rate %

--- SECTION E: ITEMS BREAKDOWN (per carry) ---

Accordion: click vào unit → expand item combos

```
▼ Aatrox (5-cost, Core)
  Combo 1: [BT][IE][LW]     54.2% WR  (124 games)  ████████░░
  Combo 2: [BT][IE][GS]     51.8% WR  (89 games)   ███████░░░
  Combo 3: [SB][IE][LW]     49.3% WR  (67 games)   ██████░░░░
```

Follow: /mnt/skills/public/frontend-design/SKILL.md

```

---

## Task R5 — UI Redesign: Trends Page
**Deadline: sau Task R3 | Path: apps/frontend/src/routes/trends/index.tsx | Skills: `frontend-design`**

```

Bạn đang làm việc trên Tactix frontend.
Repo: alphora-platform/tactix | Path: apps/frontend/src/routes/trends/index.tsx

Context: Trends page hiện tại (screenshot 2) cần fix 2 vấn đề chính:

1. Bar chart quá nhỏ, labels bị cắt ("TFT16_Astrox...")
2. Table names toàn raw API strings

--- FIX CHART ---

Thay BarChart hiện tại bằng horizontal bar chart tốt hơn:
→ Y-axis: comp label (friendly name, tối đa 20 chars + "...") — đủ rộng
→ X-axis: win rate % (0–100%, không phải 0–80 như hiện tại)
→ Bar width tối thiểu: 40px để thấy được
→ Color: gradient từ accent-blue đến accent-green
→ Tooltip đầy đủ: comp name + stats
→ Chart height: 400px (không cố định theo số items)

Thay bằng Recharts <BarChart layout="vertical">:

```tsx
<BarChart layout="vertical" data={topComps} height={500}>
  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
  <YAxis type="category" dataKey="comp_label" width={180} />
  <Bar dataKey="win_rate_pct" fill="url(#gradient)" radius={[0, 4, 4, 0]} />
</BarChart>
```

--- FIX TABLE ---

Table hiện tại: thêm columns và friendly names:
→ Cột Comp: [TraitIcon mini] + friendly comp_label (không phải raw API name)
→ Cột Tier: badge màu S/A/B/C (đã có)
→ Thêm cột Trend: ↑↓— với màu
→ Win % + Top4 % + Avg Place + Games (đã có)
→ Row hover: highlight subtle
→ Click row: navigate to comp detail

--- RISING / FALLING SECTION ---

Thêm section phía trên chart:

```
🔥 RISING (last 24h)          📉 FALLING (last 24h)
──────────────────            ──────────────────────
[Icon] Darkin Brawler +3.2%  [Icon] Gunslinger -2.8%
[Icon] Anima Squad  +2.1%    [Icon] Caretaker  -1.9%
[Icon] Portal       +1.8%    [Icon] Bastion    -1.5%
```

Follow: /mnt/skills/public/frontend-design/SKILL.md

```

---

## Summary — Thứ tự ưu tiên

```

NGAY LẬP TỨC (block mọi thứ khác):
Task R1: Backend Metadata Service ← unblock tất cả friendly names + images

SAU R1:
Task R2: Frontend Asset Hook + Image Components ← foundation cho UI
Task R3: Meta Overview Redesign ← page quan trọng nhất
Task R4: Comp Detail Redesign ← deepdive page
Task R5: Trends Redesign ← fix chart + table

SONG SONG với R3–R5:
Tasks 3, 4 gốc của Phase 3 (My Stats, Regions) — dùng components từ R2

```

---

## Checklist sau khi hoàn thành

- [ ] `TFT16_AatroxUnique` → hiển thị "Darkin Weapon" + icon
- [ ] `TFT16_Brawler` → hiển thị "Brawler" + icon
- [ ] Win rate hiển thị đúng (40–60% range, không phải 0.1–0.4%)
- [ ] Champion icons hiển thị trong comp cards
- [ ] Không có raw API names nào hiển thị ra UI
- [ ] Duplicate comps được dedup
- [ ] Trend arrows hoạt động đúng (↑↓—)
- [ ] Chart readable trên cả desktop lẫn mobile
```
