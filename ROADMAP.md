**FULL-TIME TOOL BUILDING ROADMAP**

**CHIẾM LỢI THẾ SET 17**

**BẰNG CÔNG CỤ DATA**

---

---

**Set 17: Cosmos** \| Launch: 15/04/2026

Thời gian: **01/02 → 15/04/2026 (10.5 tuần)**

Chiến lược: **100% full-time xây dựng tool hỗ trợ, không grind Set 16**

Tài liệu cập nhật 01/02/2026 \| Phiên bản 2.0

**1. CHIẾ N LƯỢC TỔNG QUAN**

+-----------------------------------------------------------------------+
| **⚡ THAY ĐỔI QUAN TRỌNG SO VỚI BẢN TRƯỚC** |
| |
| Giữa Set 16 không còn giải đấu phù hợp để qualify. Toàn bộ con đường |
| chuyên nghiệp sẽ bắt đầu từ Set 17 (15/04/2026). Từ giờ đến đó, 100% |
| thời gian dành cho việc xây dựng hệ sinh thái công cụ để có lợi thế |
| tối đa khi Set 17 drop. |
+-----------------------------------------------------------------------+

**Tư duy cốt lõi**

Khi Set 17 ra mắt, mọi người đều bắt đầu từ 0 về game knowledge. Nhưng
bạn sẽ không bắt đầu từ 0 về công cụ. Trong khi người khác mò mẫm bằng
cảm tính, bạn sẽ có:

- **Data pipeline** thu thập và phân tích match data từ Challenger/GM
  trong vài giờ đầu tiên

- **Meta Radar** tự động phát hiện comp mạnh, comp đang rise, và comp
  bắy nhanh hơn bất kỳ site nào

- **PBE Scanner** sẵn sàng chạy từ ngày PBE mở (\~01/04), cho bạn 2
  tuần head-start

- **Personal Tracker** tự động nhận diện điểm yếu của bản thân để cải
  thiện tập trung

- **Patch Diff Analyzer** tự động phân tích patch notes và dự đoán
  meta shift

**Timeline tổng quan**

---

**PHASE** **THỜI GIAN** **MỤC TIÊU**

**1** **01/02 -- Core Infrastructure: Riot API pipeline,
21/02** database, data collector chạy ổn định

**2** **22/02 -- Analytics Engine: Meta Radar, Personal
14/03** Tracker, Comp Analyzer, Alert System

**3** **15/03 -- Dashboard + Polish: Frontend, Patch Diff
31/03** Analyzer, stress test toàn hệ thống

**4** **01/04 -- PBE Blitz: Deploy toàn bộ tools lên PBE,
15/04** crack meta, tạo Day-1 Playbook

---

**2. PHASE 1: CORE INFRASTRUCTURE**

**Tuần 1--3 (01/02 -- 21/02)** \| Mục tiêu: Data pipeline chạy ổn định,
thu thập được match data

**2.1 Riot API Setup & Data Collector**

Mọi thứ bắt đầu từ việc lấy được data. Đây là nền tảng của toàn bộ hệ
thống.

**Tuần 1: Setup & First Data**

- Đăng ký Riot Developer Account, lấy Development API Key

- Setup project repo (monorepo: backend + frontend)

- Setup PostgreSQL database (Supabase hoặc self-hosted)

- Viết Data Collector Service v1:

```{=html}
<!-- -->
```

- Fetch Challenger/GM/Master player lists từ 4 region (NA, EUW, KR,
  OCE/SEA)

- Fetch match history cho từng player (20 matches gần nhất)

- Fetch match detail và parse: units, items, traits, augments,
  placement

- Upsert vào database với dedup logic

+-----------------------------------------------------------------------+
| **RIOT API ENDPOINTS CẦN DÙNG** |
| |
| League: /tft/league/v1/challenger, /grandmaster, /master (platform |
| routing: na1, euw1, kr, etc.) Match: |
| /tft/match/v1/matches/by-puuid/{puuid}/ids + /matches/{matchId} |
| (regional routing: americas, europe, asia) Data Dragon: |
| ddragon.leagueoflegends.com --- champion, item, augment, trait |
| metadata Community Dragon: raw.communitydragon.org --- unit stats, |
| ability data chi tiết hơn |
+-----------------------------------------------------------------------+

**Tuần 2: Rate Limiting & Multi-Region**

- Implement rate limit handler (Development key: 20 requests/s, 100
  requests/2min)

- Đăng ký Production API Key với Riot (cần mô tả project rõ ràng)

- Mở rộng collector sang tất cả major regions: NA, EUW, KR, EUNE, BR,
  JP, OCE, TR

- Setup cron job/scheduler: auto-collect mỗi 30 phút

- Implement incremental fetch (chỉ lấy matches mới, không re-fetch)

- Target: thu thập được 50,000+ matches/ngày từ top players

**Tuần 3: Data Quality & Schema**

- Design schema chuẩn hóa: matches, players, comps, items, augments,
  traits

- Build ETL pipeline: raw match JSON → structured analytical tables

- Tạo materialized views cho các query thường dùng (comp winrate, item
  stats, etc.)

- Implement data validation & error handling (bad data, missing
  fields)

- Viết health check endpoint: monitor pipeline status

- Unit tests cho data collector và ETL logic

+-----------------------------------------------------------------------+
| **DATABASE SCHEMA CHÍNH** |
| |
| players (puuid, region, tier, lp, updated_at) matches (match_id, |
| game_version, queue_id, game_datetime, game_length) participants |
| (match_id, puuid, placement, level, gold_left, damage_dealt, |
| time_eliminated) participant_units (match_id, puuid, character_id, |
| tier, items\[\], rarity) participant_traits (match_id, puuid, |
| trait_name, num_units, tier_current, tier_total) participant_augments |
| (match_id, puuid, augment_name, augment_index) meta_snapshots |
| (snapshot_time, patch, comp_id, play_rate, winrate, avg_placement, |
| sample_size) |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **⚠️ RIOT API POLICY --- ĐỌC KỸ TRƯỚC KHI BUILD** |
| |
| Cấm: cung cấp thông tin in-game real-time (scouting đối thủ trong |
| trận). Cấm: bypass skill test (auto-play, auto-position). Được phép: |
| phân tích post-match data, aggregate stats, pre-game metadata |
| (augment stats tổng quát). Tool của bạn phải đăng ký trên Developer |
| Portal và được Riot approve. |
+-----------------------------------------------------------------------+

**Phase 1 Deliverables Checklist**

---

**DELIVERABLE** **DEADLINE** **STATUS**

Riot API key + project repo + DB setup 07/02 ☐

Data Collector v1: single region, basic 10/02 ☐
fetch

Rate limiter + multi-region expansion 14/02 ☐

Production API Key đăng ký với Riot 14/02 ☐

Cron scheduler: auto-collect mỗi 30 phút 16/02 ☐

ETL pipeline: raw → structured tables 18/02 ☐

Materialized views + health check 20/02 ☐

50K+ matches/day flowing ổn định 21/02 ☐

---

**3. PHASE 2: ANALYTICS ENGINE**

**Tuần 4--6 (22/02 -- 14/03)** \| Mục tiêu: Biến raw data thành
competitive intelligence

**3.1 Meta Radar --- Công cụ #1 (Tuần 4--5)**

**Mục đích: Phát hiện meta shift nhanh hơn MetaTFT, tactics.tools, và
mọi site công khai khác.**

**Core Features**

- **Comp Detection Algorithm:** Tự động nhận diện comp từ match data
  dựa trên trait combination + core units (không hardcode comp names)

- **Trend Analysis:** Track play rate + winrate theo thời gian
  (6h/12h/24h/3d/7d). Phát hiện comp đang RISING (play rate tăng +
  winrate cao) và comp đang FALLING

- **Tier Classification:** Auto-rank comp thành S/A/B/C tier dựa trên
  composite score (winrate \* consistency \* sample size)

- **Patch-aware:** Tự động reset/recalculate khi patch mới drop, chỉ
  dùng data từ patch hiện tại

- **Region Comparison:** So sánh meta giữa KR, EUW, NA --- nhận diện
  comp chỉ mạnh ở 1 region (regional meta diff)

**Vì sao này là công cụ quan trọng nhất**

MetaTFT và các site công khai thường có độ trễ 12--24h và cập nhật data
vài lần/ngày. Tool của bạn cập nhật mỗi 30 phút và có các metric custom
mà không site nào có. Trong 24--48h đầu của patch mới hoặc Set mới, đây
là sự khác biệt giữa top 1 và top 50.

**3.2 Personal Performance Tracker --- Công cụ #2 (Tuần 4--5)**

**Mục đích: Biết chính xác điểm yếu của bản thân để cải thiện có mục
tiêu.**

- **Placement Distribution:** Theo comp, theo patch, theo ngày trong
  tuần, theo thời gian chơi

- **Comp Proficiency Score:** Bạn chơi comp X tốt hơn hay tệ hơn
  average Challenger?

- **Econ Curve Analysis:** Gold/level của bạn tại mỗi stage so với top
  players chơi cùng comp

- **Item Efficiency:** Item combination nào bạn thường build, và nó
  đang cho kết quả tốt/xấu

- **Tilt Detection:** Nhận diện pattern: avg placement tụt dần sau
  game thứ 5+, hoặc tệ hơn sau midnight

- **Weakness Reports:** Tự động generate weekly report: top 3 điểm cần
  cải thiện

**3.3 Comp Deep-Dive Analyzer --- Công cụ #3 (Tuần 5--6)**

**Mục đích: Khi đã biết comp mạnh, tool này cho biết cách chơi tối ưu.**

- **Best Items per Carry:** Top 5 item sets theo winrate cho từng
  carry, có sample size

- **Optimal Augment Paths:** Augment nào tốt nhất tại 2-1, 3-2, 4-2
  cho từng comp

- **Level Timing:** Thời điểm level 6/7/8/9 của top players khi chơi
  comp này

- **Unit Priority:** Thứ tự ưu tiên pick unit, và các substitution
  patterns

- **Matchup Data:** Comp này thắng/thua comp nào nhiều nhất (nếu data
  đủ)

**3.4 Alert System --- Công cụ #4 (Tuần 6)**

**Mục đích: Không cần mở dashboard liên tục, thông tin quan trọng tự đến
với bạn.**

- **Meta Shift Alert:** Thông báo khi một comp tăng/giảm play rate \>
  3% trong 12h

- **New Comp Alert:** Thông báo khi phát hiện comp chưa từng thấy với
  winrate \> 55%

- **Patch Drop Alert:** Thông báo khi patch mới deploy + tự động
  invalidate data cũ

- **Hotfix Detection:** Monitor game version changes giữa các patch
  chính (micropatch/hotfix)

- Kênh: Discord Webhook và/hoặc Telegram Bot

**Phase 2 Deliverables Checklist**

---

**DELIVERABLE** **DEADLINE** **STATUS**

Comp Detection Algorithm v1 25/02 ☐

Meta Radar: trend tracking 28/02 ☐
(6h/12h/24h/7d)

Personal Tracker: placement + comp 01/03 ☐
proficiency

Meta Radar: auto tier classification 04/03 ☐
S/A/B/C

Personal Tracker: econ curve + item 06/03 ☐
efficiency

Comp Analyzer: item/augment/level timing 10/03 ☐
data

Alert System: Discord/Telegram 12/03 ☐
integration

Region comparison feature 14/03 ☐

---

**4. PHASE 3: DASHBOARD & POLISH**

**Tuần 7--9 (15/03 -- 31/03)** \| Mục tiêu: Frontend đẹp, Patch Diff
tool, stress test sẵn sàng cho PBE

**4.1 Dashboard Frontend (Tuần 7--8)**

Biến data thành giao diện trực quan để ra quyết định nhanh giữa các
game:

**Các trang chính**

- **Meta Overview:** Tier list dạng card, mỗi comp hiển thị: winrate,
  play rate, trend arrow (↑↓), sample size

- **Comp Detail:** Click vào comp → best items, augments, level
  timing, unit priority, matchup data

- **My Stats:** Personal tracker dashboard với placement chart, comp
  proficiency, weakness reports

- **Trends:** Line charts theo dõi sự thay đổi winrate/playrate của
  từng comp theo thời gian

- **Regions:** So sánh meta giữa các region dạng heatmap

**Tech Stack Frontend**

- React + TailwindCSS (hoặc Next.js nếu cần SSR)

- Recharts hoặc Chart.js cho data visualization

- Deploy: Vercel (free, nhanh, auto-deploy từ Git)

- Responsive: Có thể xem trên điện thoại giữa các game

**4.2 Patch Diff Analyzer (Tuần 8--9)**

**Công cụ tự động phân tích patch notes và dự đoán meta shift. Đây là
"secret weapon" khi patch mới drop.**

- **Patch Notes Parser:** Tự động scrape patch notes từ Riot, extract
  unit/item/trait changes

- **Impact Scoring:** Dựa vào meta hiện tại + mức độ thay đổi, dự đoán
  comp nào sẽ bị ảnh hưởng nhiều nhất

- **Winner/Loser Predictions:** Auto-generate "Patch Winners" và
  "Patch Losers" list

- **Historical Accuracy:** Sau mỗi patch, so sánh prediction với
  reality để tune algorithm

**4.3 Stress Test & PBE Readiness (Tuần 9)**

Đảm bảo mọi thứ sẵn sàng cho ngày PBE mở:

- Test pipeline với volume gấp 3x (Set mới sẽ có nhiều match hơn bình
  thường)

- Test Comp Detection với trait/unit names hoàn toàn mới (phải
  dynamic, không hardcode)

- Chuẩn bị PBE API endpoint (PBE dùng region pbe1.api.riotgames.com)

- Pre-load Set 17 data từ Community Dragon/Data Dragon ngay khi
  available

- Test alert system: đảm bảo notification đến nhanh và đúng

- Document toàn bộ hệ thống để bạn có thể debug nhanh khi cần

**Phase 3 Deliverables Checklist**

---

**DELIVERABLE** **DEADLINE** **STATUS**

Dashboard: Meta Overview + Comp Detail 20/03 ☐
pages

Dashboard: My Stats page 23/03 ☐

Dashboard: Trends + Regions pages 25/03 ☐

Patch Diff Analyzer v1: parser + impact 27/03 ☐
scoring

Mobile responsive 28/03 ☐

Stress test: 3x volume + PBE endpoint 30/03 ☐
ready

Full system documentation 31/03 ☐

---

**5. PHASE 4: PBE BLITZ & DAY-1 PLAYBOOK**

**Tuần 10--11 (01/04 -- 15/04)** \| Mục tiêu: Deploy tools lên PBE,
crack meta Set 17 trước mọi người

+-----------------------------------------------------------------------+
| **🚀 ĐÂY LÀ PAYOFF CỦA 9 TUẦN BUILD** |
| |
| PBE mở (\~01/04): Trong khi người khác chơi và "cảm nhận", bạn có |
| data pipeline chạy ngay lập tức. Trong vài giờ đầu, bạn đã biết comp |
| nào có winrate cao nhất. Trong 2 tuần PBE, bạn sẽ có Day-1 Playbook |
| mà không ai khác có. |
+-----------------------------------------------------------------------+

**5.1 PBE Day 1 Protocol (01/04)**

- Switch data collector sang PBE region ngay lập tức

- Load Set 17 champion/trait/item/augment data từ Data
  Dragon/Community Dragon

- Bắt đầu collect PBE matches từ các high-elo players test PBE

- Chơi PBE song song để tạo match data cho chính hệ thống

- Monitor Comp Detection: đảm bảo algorithm detect được comp mới với
  trait mới

**5.2 PBE Tuần 1 (01--07/04)**

**Focus: Thu thập càng nhiều data càng tốt và bắt đầu nhận diện
patterns.**

- Target: 10,000+ PBE matches trong tuần đầu

- Chơi 8--10 PBE games/ngày, mỗi game test comp khác nhau

- Meta Radar bắt đầu output: comp nào winrate cao, trait nào OP

- Nhận diện Carousel mới (thay đổi lớn của Set 17) ảnh hưởng econ như
  thế nào

- Ghi chép chi tiết: mỗi unit, mỗi augment, mỗi interaction lạ

**5.3 PBE Tuần 2 (08--14/04)**

**Focus: Refine tier list, build Day-1 Playbook.**

- Data đã đủ lớn để Meta Radar cho kết quả tin cậy

- Xây dựng Day-1 Playbook:

```{=html}
<!-- -->
```

- 5--7 comp đã được data-verify với winrate \> 50%

- Best items cho từng comp

- Optimal augment paths (2-1, 3-2, 4-2)

- Level timing và econ strategy

- Flex routes: khi nào pivot từ comp A sang comp B

```{=html}
<!-- -->
```

- Theo dõi PBE patches (Riot thường sửa balance trên PBE) và cập nhật
  playbook

- Test playbook bằng cách chơi 5--10 game chỉ theo playbook, đo kết
  quả

**5.4 Launch Day (15/04) --- Game Plan**

+-----------------------------------------------------------------------+
| **LAUNCH DAY CHECKLIST** |
| |
| ☐ Switch toàn bộ tools sang Live server ☐ Verify data pipeline chạy |
| với live match data ☐ Bắt đầu ranked ngay với Day-1 Playbook ☐ |
| Marathon sprint: 10--12 games trong ngày đầu ☐ Cập nhật Meta Radar |
| với live data (PBE ≠ Live luôn luôn) ☐ Adjust playbook theo live |
| reality trong vòng 24h đầu ☐ Alert system chạy: thông báo mọi meta |
| shift |
+-----------------------------------------------------------------------+

**6. TECH STACK & ARCHITECTURE**

**6.1 Recommended Tech Stack**

---

**LAYER** **TECHNOLOGY** **LÝ DO CHỌN**

**Language** Python (FastAPI) _Ecosystem tốt cho data + Riot
API wrappers sẵn có_

**Database** PostgreSQL (Supabase) _Free tier mạnh, real-time
subscriptions, auth built-in_

**Scheduler** APScheduler / Celery _Reliable cron jobs, retry
logic, monitoring_

**Frontend** React + TailwindCSS _Nhanh, responsive, component
library phong phú_

**Charts** Recharts _React-native, dễ customize,
nhẹ_

**Hosting BE** Railway / Render _Free tier, auto-deploy, easy
scaling_

**Hosting FE** Vercel _Free, CDN global, auto-deploy
từ Git_

**Alerts** Discord Webhook _Free, instant, custom embeds
đẹp_

**API Wrapper** riotwatcher (Python) _Official community lib, được
maintain tốt_

**Static Data** Community Dragon _Chi tiết hơn Data Dragon: unit
stats, abilities, scaling_

---

**6.2 System Architecture**

+-----------------------------------------------------------------------+
| ┌─────────────┐ ┌───────────────┐ ┌──────────────┐ |
| |
| │ Riot API │ │ Community │ │ Data Dragon │ |
| |
| │ (Matches) │ │ Dragon (Raw) │ │ (Metadata) │ |
| |
| └─────┬───────┘ └──────┬────────┘ └──────┬───────┘ |
| |
| │ │ │ |
| |
| └────────┬───────┘────────┘ |
| |
| │ |
| |
| ┌───────────┴────────────┐ |
| |
| │ DATA COLLECTOR (Python) │ ← APScheduler: mỗi 30 phút |
| |
| │ Rate limiter + ETL │ |
| |
| └───────────┬────────────┘ |
| |
| │ |
| |
| ┌───────────┴────────────┐ |
| |
| │ PostgreSQL (Supabase) │ |
| |
| │ matches \| comps \| meta │ |
| |
| └────┬────────────────┬────┘ |
| |
| │ │ |
| |
| ┌──────┴──────┐ ┌──────┴───────┐ |
| |
| │ Analytics │ │ Alert System │ |
| |
| │ Engine │ │ (Discord) │ |
| |
| └────┬──────┘ └─────────────┘ |
| |
| │ |
| |
| ┌────┴───────────────────┐ |
| |
| │ React Dashboard (Vercel) │ |
| |
| │ Meta \| Stats \| Trends │ |
| |
| └────────────────────────┘ |
+-----------------------------------------------------------------------+

**7. DAILY SCHEDULE (FULL-TIME DEV)**

**Phase 1--3: Build Days**

---

**THỜI GIAN** **HOẠT ĐỘNG** **CHI TIẾT**

**08:00 -- Warm-up Check data pipeline health, review
08:30** alerts, plan ngày

**08:30 -- Deep Work #1 Code các features chính (4h focused,
12:30** không distraction)

**12:30 -- Nghỉ trưa Lunch + đọc TFT Reddit/Discord/X để nắm
13:30** community pulse

**13:30 -- Deep Work #2 Tiếp tục code + testing + bug fixes
17:30**

**17:30 -- Review Code review, commit, update task board
18:00**

**19:00 -- TFT Time Chơi 3--4 game Set 16 để giữ game
21:00** sense + test tools

**21:00 -- Daily Log Ghi chép tiến độ, blockers, plan ngày
21:30** mai

---

**Phase 4: PBE Days**

---

**THỜI GIAN** **HOẠT ĐỘNG** **CHI TIẾT**

**08:00 -- Data Check Review đêm qua data collector bắt được
08:30** gì, Meta Radar output

**08:30 -- PBE Grind 5--7 PBE games, mỗi game test
12:30** comp/strategy khác

**12:30 -- Nghỉ Lunch + note observations từ buổi sáng
13:30**

**13:30 -- Tool Tuning Fix bugs, tune Comp Detection cho Set
16:00** 17, update schema

**16:00 -- PBE Grind #2 3--5 PBE games nữa, focused vào comp
19:00** đang test

**19:00 -- Analysis Cập nhật tier list, build Day-1 Playbook
20:30** từ data

**20:30 -- Daily Log Update playbook, note meta shifts
21:00**

---

+-----------------------------------------------------------------------+
| **💪 SỨC KHỎe & MENTAL** |
| |
| Full-time dev + gaming rất căng thẳng. Ngủ đủ 7--8h. Tập thể dục 30 |
| phút/ngày. Nghỉ 1 ngày/tuần (hoàn toàn). Không code sau 22:00. Sức |
| khỏe là prerequisite của performance, không phải luxury. |
+-----------------------------------------------------------------------+

**8. CON ĐƯỜNG COMPETITIVE SET 17**

Khi Set 17 launch 15/04, bạn chuyển từ developer mode sang competitor
mode. Tất cả tools đã build sẽ phục vụ mục tiêu duy nhất: leo Ladder và
qualify vào tournaments.

**8.1 Qualification Path**

+-----------------------------------------------------------------------+
| **BƯỚC 1:** Leo Ladder → Challenger/Top 30 |
| |
| ↓ (Ladder Snapshots mỗi thứ Ba) |
| |
| **BƯỚC 2:** Qualify vào Tactician's Trials (256 người) |
| |
| ↓ |
| |
| **BƯỚC 3:** Lọt vào Tactician's Cup (128 người) |
| |
| ↓ |
| |
| **BƯỚC 4:** Regional Finals (64 người) → Top 32 = Pro Circuit Set 18 |
| |
| ↓ |
| |
| **BƯỚC 5:** Tactician's Crown (World Championship, 40 người, \$470K+) |
+-----------------------------------------------------------------------+

**8.2 Ngay bây giờ**

- Đăng ký Compete Card tại competetft.com --- làm hôm nay

- Join TFT competitive Discord servers (CompeteTFT, khu vực của bạn)

- Follow \@CompeteTFT trên X để nắm lịch tournaments Set 17

- Xem VOD của Paris Open 2025 winner Huanmie để học tournament mindset

**9. KPIs & MILESTONES**

---

**METRIC** **MỤC TIÊU** **DEADLINE** **PHA**

**Data pipeline** 50K+ matches/day, 8 **21/02** 1
regions

**Meta Radar v1** Comp detection + trend + **04/03** 2
tier

**Personal Tracker Placement + **06/03** 2
v1** proficiency + econ

**Alert System** Discord alerts working **12/03** 2

**Dashboard v1** 5 pages deployed on **25/03** 3
Vercel

**Patch Diff Parser + impact scoring **27/03** 3
Analyzer**

**PBE pipeline** Collecting PBE matches **02/04** 4

**Day-1 Playbook** 5--7 data-backed comps **14/04** 4

**Set 17 Rank** Diamond+ tuần đầu **22/04** Post

**Set 17 Rank** Master+ trong 2 tuần **29/04** Post

**Set 17 Rank** Challenger trong 4 tuần **13/05** Post

**Compete Card** Đăng ký xong **HÔM NAY** ---

---

+-----------------------------------------------------------------------+
| **10.5 TUẦN. 100% FOCUS. ZERO COMPROMISE.** |
| |
| Set 17 thay đổi Carousel = mọi người bắt đầu lại từ 0. |
| |
| Nhưng bạn sẽ không bắt đầu từ 0. Bạn sẽ bắt đầu với data. |
| |
| Good luck, Tactician. 🚀 |
+-----------------------------------------------------------------------+
