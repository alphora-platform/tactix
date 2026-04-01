# PROMPT: Đưa Data Phân Tích TFT Set 17 Vào Tactix

> Dán toàn bộ nội dung này vào Claude Code trong VS Code.  
> Thực hiện từng task theo thứ tự — **không bỏ qua bước nào**.

---

## BỐI CẢNH

Bạn đang làm việc trên **Tactix** — nền tảng phân tích TFT meta.  
Repo: `alphora-platform/tactix` | Stack: NestJS + Prisma + PostgreSQL + Redis

TFT Set 17 "Space Gods" PBE mở ngày 31/03/2026, live ngày 15/04/2026.  
Mục tiêu: seed toàn bộ data Set 17 đã được phân tích thủ công vào database, để:

1. Tactix có thể resolve tên tướng/tộc/hệ ngay từ ngày đầu PBE
2. Metadata service (Task R1) có data nền để fallback khi Community Dragon chưa cập nhật
3. Frontend hiển thị đúng ngay lập tức thay vì raw API names

---

## DATA SET 17 ĐÃ PHÂN TÍCH

### Tướng (59 tướng) — đầy đủ

```typescript
// Dùng làm nguồn seed chính xác
export const SET17_CHAMPIONS = [
  // ── 1 vàng ──────────────────────────────────────────────────────────────
  {
    apiName: 'TFT17_Aatrox',
    displayName: 'Aatrox',
    cost: 1,
    traits: ['N.O.V.A.', 'Bastion'],
    role: 'tank',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Briar',
    displayName: 'Briar',
    cost: 1,
    traits: ['Anima', 'Primordian', 'Rogue'],
    role: 'fighter',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Caitlyn',
    displayName: 'Caitlyn',
    cost: 1,
    traits: ['N.O.V.A.', 'Fateweaver'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Chogath',
    displayName: "Cho'Gath",
    cost: 1,
    traits: ['Dark Star', 'Brawler'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Ezreal',
    displayName: 'Ezreal',
    cost: 1,
    traits: ['Timebreaker', 'Sniper'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Leona',
    displayName: 'Leona',
    cost: 1,
    traits: ['Arbiter', 'Vanguard'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Lissandra',
    displayName: 'Lissandra',
    cost: 1,
    traits: ['Dark Star', 'Shepherd', 'Replicator'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Nasus',
    displayName: 'Nasus',
    cost: 1,
    traits: ['Space Groove', 'Vanguard'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Poppy',
    displayName: 'Poppy',
    cost: 1,
    traits: ['Meeple', 'Bastion'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_RekSai',
    displayName: "Rek'Sai",
    cost: 1,
    traits: ['Primordian', 'Brawler'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Talon',
    displayName: 'Talon',
    cost: 1,
    traits: ['Stargazer', 'Rogue'],
    role: 'assassin',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Teemo',
    displayName: 'Teemo',
    cost: 1,
    traits: ['Space Groove', 'Shepherd'],
    role: 'carry',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_TwistedFate',
    displayName: 'Twisted Fate',
    cost: 1,
    traits: ['Stargazer', 'Fateweaver'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Veigar',
    displayName: 'Veigar',
    cost: 1,
    traits: ['Meeple', 'Replicator'],
    role: 'caster',
    dmgType: 'magic',
  },
  // ── 2 vàng ──────────────────────────────────────────────────────────────
  {
    apiName: 'TFT17_Akali',
    displayName: 'Akali',
    cost: 2,
    traits: ['N.O.V.A.', 'Marauder'],
    role: 'fighter',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Belveth',
    displayName: "Bel'Veth",
    cost: 2,
    traits: ['Primordian', 'Challenger', 'Marauder'],
    role: 'fighter',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Gnar',
    displayName: 'Gnar',
    cost: 2,
    traits: ['Meeple', 'Sniper'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Gragas',
    displayName: 'Gragas',
    cost: 2,
    traits: ['Psionic', 'Brawler'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Gwen',
    displayName: 'Gwen',
    cost: 2,
    traits: ['Space Groove', 'Rogue'],
    role: 'assassin',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Jax',
    displayName: 'Jax',
    cost: 2,
    traits: ['Stargazer', 'Bastion'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Jinx',
    displayName: 'Jinx',
    cost: 2,
    traits: ['Anima', 'Challenger'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Meepsie',
    displayName: 'Meepsie',
    cost: 2,
    traits: ['Meeple', 'Shepherd', 'Voyager'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Milio',
    displayName: 'Milio',
    cost: 2,
    traits: ['Timebreaker', 'Fateweaver'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Mordekaiser',
    displayName: 'Mordekaiser',
    cost: 2,
    traits: ['Dark Star', 'Channeler', 'Vanguard'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Pantheon',
    displayName: 'Pantheon',
    cost: 2,
    traits: ['Timebreaker', 'Brawler', 'Replicator'],
    role: 'tank',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Pyke',
    displayName: 'Pyke',
    cost: 2,
    traits: ['Psionic', 'Voyager'],
    role: 'assassin',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Zoe',
    displayName: 'Zoe',
    cost: 2,
    traits: ['Arbiter', 'Channeler'],
    role: 'caster',
    dmgType: 'magic',
  },
  // ── 3 vàng ──────────────────────────────────────────────────────────────
  {
    apiName: 'TFT17_Aurora',
    displayName: 'Aurora',
    cost: 3,
    traits: ['Anima', 'Voyager'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Diana',
    displayName: 'Diana',
    cost: 3,
    traits: ['Arbiter', 'Challenger'],
    role: 'fighter',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Fizz',
    displayName: 'Fizz',
    cost: 3,
    traits: ['Meeple', 'Rogue'],
    role: 'assassin',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Illaoi',
    displayName: 'Illaoi',
    cost: 3,
    traits: ['Anima', 'Vanguard', 'Shepherd'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Kaisa',
    displayName: "Kai'Sa",
    cost: 3,
    traits: ['Dark Star', 'Rogue'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Lulu',
    displayName: 'Lulu',
    cost: 3,
    traits: ['Stargazer', 'Replicator'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Maokai',
    displayName: 'Maokai',
    cost: 3,
    traits: ['N.O.V.A.', 'Brawler'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_MissFortune',
    displayName: 'Miss Fortune',
    cost: 3,
    traits: ['Gun Goddess'],
    role: 'flex',
    dmgType: 'mixed',
  },
  {
    apiName: 'TFT17_Ornn',
    displayName: 'Ornn',
    cost: 3,
    traits: ['Space Groove', 'Bastion'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Rhaast',
    displayName: 'Rhaast',
    cost: 3,
    traits: ['Redeemer'],
    role: 'tank',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Samira',
    displayName: 'Samira',
    cost: 3,
    traits: ['Space Groove', 'Sniper'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Urgot',
    displayName: 'Urgot',
    cost: 3,
    traits: ['Mecha', 'Brawler', 'Marauder'],
    role: 'fighter',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Viktor',
    displayName: 'Viktor',
    cost: 3,
    traits: ['Psionic', 'Channeler'],
    role: 'caster',
    dmgType: 'magic',
  },
  // ── 4 vàng ──────────────────────────────────────────────────────────────
  {
    apiName: 'TFT17_AurelionSol',
    displayName: 'Aurelion Sol',
    cost: 4,
    traits: ['Mecha', 'Channeler'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Corki',
    displayName: 'Corki',
    cost: 4,
    traits: ['Meeple', 'Fateweaver'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Karma',
    displayName: 'Karma',
    cost: 4,
    traits: ['Dark Star', 'Voyager'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Kindred',
    displayName: 'Kindred',
    cost: 4,
    traits: ['N.O.V.A.', 'Challenger'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Leblanc',
    displayName: 'LeBlanc',
    cost: 4,
    traits: ['Arbiter', 'Shepherd'],
    role: 'carry',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_MasterYi',
    displayName: 'Master Yi',
    cost: 4,
    traits: ['Psionic', 'Marauder'],
    role: 'fighter',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Nami',
    displayName: 'Nami',
    cost: 4,
    traits: ['Space Groove', 'Replicator'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Nunu',
    displayName: 'Nunu',
    cost: 4,
    traits: ['Stargazer', 'Vanguard'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Rammus',
    displayName: 'Rammus',
    cost: 4,
    traits: ['Meeple', 'Bastion'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Riven',
    displayName: 'Riven',
    cost: 4,
    traits: ['Timebreaker', 'Rogue'],
    role: 'fighter',
    dmgType: 'mixed',
  },
  {
    apiName: 'TFT17_TahmKench',
    displayName: 'Tahm Kench',
    cost: 4,
    traits: ['Oracle', 'Brawler'],
    role: 'tank',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_TheMightyMech',
    displayName: 'The Mighty Mech',
    cost: 4,
    traits: ['Mecha', 'Voyager'],
    role: 'tank',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Xayah',
    displayName: 'Xayah',
    cost: 4,
    traits: ['Stargazer', 'Sniper'],
    role: 'carry',
    dmgType: 'physical',
  },
  // ── 5 vàng ──────────────────────────────────────────────────────────────
  {
    apiName: 'TFT17_Bard',
    displayName: 'Bard',
    cost: 5,
    traits: ['Meeple', 'Channeler'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Blitzcrank',
    displayName: 'Blitzcrank',
    cost: 5,
    traits: ['Party Animal', 'Space Groove', 'Vanguard'],
    role: 'fighter',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Fiora',
    displayName: 'Fiora',
    cost: 5,
    traits: ['Divine Duelist', 'Anima', 'Marauder'],
    role: 'fighter',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Graves',
    displayName: 'Graves',
    cost: 5,
    traits: ['Factory New'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Jhin',
    displayName: 'Jhin',
    cost: 5,
    traits: ['Dark Star', 'Eradicator', 'Sniper'],
    role: 'carry',
    dmgType: 'physical',
  },
  {
    apiName: 'TFT17_Morgana',
    displayName: 'Morgana',
    cost: 5,
    traits: ['Dark Lady'],
    role: 'fighter',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Shen',
    displayName: 'Shen',
    cost: 5,
    traits: ['Bulwark', 'Bastion'],
    role: 'fighter',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Sona',
    displayName: 'Sona',
    cost: 5,
    traits: ['Commander', 'Psionic', 'Shepherd'],
    role: 'caster',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Vex',
    displayName: 'Vex',
    cost: 5,
    traits: ['Doomer'],
    role: 'carry',
    dmgType: 'magic',
  },
  {
    apiName: 'TFT17_Zed',
    displayName: 'Zed',
    cost: 5,
    traits: ['Galaxy Hunter'],
    role: 'fighter',
    dmgType: 'physical',
  },
] as const;
```

### Tộc/Hệ (traits) — đầy đủ

```typescript
export const SET17_TRAITS = [
  // Origins
  {
    apiName: 'TFT17_Anima',
    displayName: 'Anima',
    type: 'origin',
    breakpoints: [3, 6],
    description: 'Tích điểm kỹ thuật khi thua. Đủ 100 điểm nhận vũ khí mạnh.',
  },
  {
    apiName: 'TFT17_Arbiter',
    displayName: 'Arbiter',
    type: 'origin',
    breakpoints: [2, 3],
    description: 'Tự tạo luật thần thánh: chọn điều kiện và hiệu ứng kích hoạt.',
  },
  {
    apiName: 'TFT17_Bulwark',
    displayName: 'Bulwark',
    type: 'origin',
    breakpoints: [1],
    description: 'Triệu hồi relic: đồng đội kế cạnh nhận 18% HP giáp đỡ + 20% AS.',
  },
  {
    apiName: 'TFT17_Commander',
    displayName: 'Commander',
    type: 'origin',
    breakpoints: [1],
    description: 'Sona tặng Command Mod mỗi 2 vòng: thay đổi cách đồng đội chiến đấu.',
  },
  {
    apiName: 'TFT17_DarkLady',
    displayName: 'Dark Lady',
    type: 'origin',
    breakpoints: [1],
    description: 'Đội nhận 5% giảm sát thương phép, 10% khi Morgana biến hình.',
  },
  {
    apiName: 'TFT17_DarkStar',
    displayName: 'Dark Star',
    type: 'origin',
    breakpoints: [2, 4, 6, 9],
    description: 'Tạo hố đen tiêu diệt địch <10% máu. 4: +30% AD/AP. 6: siêu tướng mạnh nhất.',
  },
  {
    apiName: 'TFT17_DivineDuelist',
    displayName: 'Divine Duelist',
    type: 'origin',
    breakpoints: [1],
    description: 'Hồi 15% máu người chơi từ sát thương gây ra. Fiora luôn thắng 1v1.',
  },
  {
    apiName: 'TFT17_Doomer',
    displayName: 'Doomer',
    type: 'origin',
    breakpoints: [1],
    description: 'Đầu trận đánh cắp 8% AD/AP tất cả địch, tặng cho Vex mạnh nhất.',
  },
  {
    apiName: 'TFT17_Eradicator',
    displayName: 'Eradicator',
    type: 'origin',
    breakpoints: [1],
    description: 'Địch bị giảm 14% Giáp và Kháng Phép.',
  },
  {
    apiName: 'TFT17_FactoryNew',
    displayName: 'Factory New',
    type: 'origin',
    breakpoints: [1],
    description: 'Sau mỗi trận, Graves nhận nâng cấp vĩnh viễn mới.',
  },
  {
    apiName: 'TFT17_GalaxyHunter',
    displayName: 'Galaxy Hunter',
    type: 'origin',
    breakpoints: [1],
    description: 'Khi có bản sao sống: Zed +40% AD. Chỉ qua Hero Augment.',
  },
  {
    apiName: 'TFT17_GunGoddess',
    displayName: 'Gun Goddess',
    type: 'origin',
    breakpoints: [1],
    description: 'Chọn chế độ khi lên sân: Channeler / Challenger / Replicator.',
  },
  {
    apiName: 'TFT17_Mecha',
    displayName: 'Mecha',
    type: 'origin',
    breakpoints: [3, 4, 6],
    description: 'Biến hình: +60% máu, chiếm 2 ô đội hình, tính đôi cho Mecha. 6: +1 ô đội.',
  },
  {
    apiName: 'TFT17_Meeple',
    displayName: 'Meeple',
    type: 'origin',
    breakpoints: [3, 5, 7, 10],
    description: 'Tích búp bê, tăng sức mạnh chiêu thức. 7: Cloning Slot trên ghế dự bị.',
  },
  {
    apiName: 'TFT17_NOVA',
    displayName: 'N.O.V.A.',
    type: 'origin',
    breakpoints: [2, 5],
    description: 'Sau 6 giây chiến đấu: surge buff cho đồng đội theo loại tướng N.O.V.A. chọn.',
  },
  {
    apiName: 'TFT17_Oracle',
    displayName: 'Oracle',
    type: 'origin',
    breakpoints: [1],
    description: 'Mỗi 3 vòng, Tahm Kench tặng phần thưởng.',
  },
  {
    apiName: 'TFT17_PartyAnimal',
    displayName: 'Party Animal',
    type: 'origin',
    breakpoints: [1],
    description: 'Khi <45% HP: ẩn + hồi 15% HP/giây. Khi đầy: Groove mãi + passive x4.',
  },
  {
    apiName: 'TFT17_Primordian',
    displayName: 'Primordian',
    type: 'origin',
    breakpoints: [2, 3],
    description: 'Gây sát thương sinh ra Swarmlings. 3: mỗi vòng nhận tướng 1-2v ngẫu nhiên.',
  },
  {
    apiName: 'TFT17_Psionic',
    displayName: 'Psionic',
    type: 'origin',
    breakpoints: [2, 4],
    description: 'Nhận Psionic items đặt lên bất kỳ đồng đội nào. 4: items mạnh hơn trên Psionic.',
  },
  {
    apiName: 'TFT17_Redeemer',
    displayName: 'Redeemer',
    type: 'origin',
    breakpoints: [1],
    description: 'Mỗi tộc/hệ active: +2-4% AS và +2-4 Giáp/Kháng Phép cho đội.',
  },
  {
    apiName: 'TFT17_SpaceGroove',
    displayName: 'Space Groove',
    type: 'origin',
    breakpoints: [1, 3, 5, 7, 10],
    description: 'Groove: tăng AS + hồi % máu tối đa. 5: mỗi giây trong Groove +3% AD/AP tích lũy.',
  },
  {
    apiName: 'TFT17_Stargazer',
    displayName: 'Stargazer',
    type: 'origin',
    breakpoints: [3, 4, 5, 6, 7],
    description: 'Chòm sao thay đổi mỗi ván: 7 constellation khác nhau (The Altar, The Boar, v.v.)',
  },
  {
    apiName: 'TFT17_Timebreaker',
    displayName: 'Timebreaker',
    type: 'origin',
    breakpoints: [2, 3, 4],
    description: 'Thua: reroll miễn phí. Thắng: tích XP vào Temporal Core. 3: +15% AS team.',
  },
  // Classes
  {
    apiName: 'TFT17_Bastion',
    displayName: 'Bastion',
    type: 'class',
    breakpoints: [2, 4, 6],
    description: 'Đội +12 Giáp/Kháng Phép. Bastion nhận nhiều hơn, double trong 10 giây đầu.',
  },
  {
    apiName: 'TFT17_Brawler',
    displayName: 'Brawler',
    type: 'class',
    breakpoints: [2, 4, 6],
    description: 'Đội +7% máu. Brawler: +25/45/65% máu tối đa.',
  },
  {
    apiName: 'TFT17_Challenger',
    displayName: 'Challenger',
    type: 'class',
    breakpoints: [2, 3, 4, 5],
    description: 'Đội +10% AS. Challenger: +15-40% AS. Sau kill: dash + +50% AS bonus 2.5 giây.',
  },
  {
    apiName: 'TFT17_Channeler',
    displayName: 'Channeler',
    type: 'class',
    breakpoints: [2, 3, 4, 5],
    description: 'Channeler +20% mana từ mọi nguồn. Đội hồi mana liên tục.',
  },
  {
    apiName: 'TFT17_Fateweaver',
    displayName: 'Fateweaver',
    type: 'class',
    breakpoints: [2, 4],
    description: 'Innate: Spell Crit. 2: hiệu ứng cơ hội kiểm tra 2 lần. 4: +20% crit chance.',
  },
  {
    apiName: 'TFT17_Marauder',
    displayName: 'Marauder',
    type: 'class',
    breakpoints: [2, 4, 6],
    description: 'Đội +5% Omnivamp. Marauder: +5-10% Omnivamp, +20-40% AD, heal dư → giáp đỡ.',
  },
  {
    apiName: 'TFT17_Replicator',
    displayName: 'Replicator',
    type: 'class',
    breakpoints: [2, 4],
    description: 'Chiêu thức kích hoạt thêm lần 2 với 25-50% sức mạnh.',
  },
  {
    apiName: 'TFT17_Rogue',
    displayName: 'Rogue',
    type: 'class',
    breakpoints: [2, 3, 4, 5],
    description: 'Rogue +15-60% AD/AP. Lần đầu <50% máu: ẩn, địch bị chuyển sang tướng khác.',
  },
  {
    apiName: 'TFT17_Shepherd',
    displayName: 'Shepherd',
    type: 'class',
    breakpoints: [3, 5, 7],
    description: 'Triệu hồi Bia và Bayin. Sức mạnh tăng theo tổng sao tướng Shepherd.',
  },
  {
    apiName: 'TFT17_Sniper',
    displayName: 'Sniper',
    type: 'class',
    breakpoints: [2, 3, 4, 5],
    description: '+18-32% khuếch đại sát thương, tăng thêm theo khoảng cách đến địch.',
  },
  {
    apiName: 'TFT17_Vanguard',
    displayName: 'Vanguard',
    type: 'class',
    breakpoints: [2, 4, 6],
    description: '+5% Độ Bền khi có giáp đỡ. Đầu trận + 50% máu: giáp đỡ 16-40% máu tối đa.',
  },
  {
    apiName: 'TFT17_Voyager',
    displayName: 'Voyager',
    type: 'class',
    breakpoints: [2, 3, 4, 5, 6],
    description:
      'Xe tăng/Chiến binh: giáp đỡ 175-700. Các tướng khác: +9-27% khuếch đại sát thương.',
  },
] as const;
```

---

## TASK 1 — Kiểm Tra Schema Hiện Tại

```
Đọc các file sau và báo cáo lại:
1. prisma/schema.prisma — xem có model nào cho champions/traits/items chưa
2. src/modules/ — liệt kê tất cả modules hiện có
3. src/modules/metadata/ (nếu tồn tại) — đọc service và entity

Sau khi đọc, trả lời:
- Schema hiện tại có model Champion, Trait, Item chưa?
- Đã có MetadataModule chưa?
- Set number được lưu như thế nào (field tên gì, kiểu dữ liệu gì)?

KHÔNG viết code ở bước này. Chỉ đọc và báo cáo.
```

---

## TASK 2 — Tạo/Cập Nhật Prisma Schema cho Set 17

```
Dựa trên kết quả Task 1, thực hiện một trong hai trường hợp:

TRƯỜNG HỢP A — Nếu đã có model Champion/Trait:
  Thêm các field còn thiếu vào model hiện tại:
  - Champion: thêm `role String?`, `dmgType String?`, `rowPosition String?`
               (rowPosition: "front" | "mid" | "back")
  - Trait: thêm `traitType String?` ("origin" | "class"), `description String?`

TRƯỜNG HỢP B — Nếu chưa có, tạo mới trong prisma/schema.prisma:

model Set17Champion {
  id          Int      @id @default(autoincrement())
  apiName     String   @unique  // e.g. "TFT17_Aatrox"
  displayName String            // e.g. "Aatrox"
  cost        Int               // 1-5
  traits      String[]          // ["Dark Star", "Brawler"]
  role        String            // "tank" | "fighter" | "carry" | "caster" | "assassin" | "flex"
  dmgType     String            // "physical" | "magic" | "mixed"
  rowPosition String            // "front" | "mid" | "back"
  setNumber   Int      @default(17)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([cost])
  @@index([setNumber])
}

model Set17Trait {
  id          Int      @id @default(autoincrement())
  apiName     String   @unique  // e.g. "TFT17_DarkStar"
  displayName String            // e.g. "Dark Star"
  traitType   String            // "origin" | "class"
  breakpoints Int[]             // [2, 4, 6, 9]
  description String            // mô tả tiếng Việt
  setNumber   Int      @default(17)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([setNumber])
}

Sau khi sửa schema, chạy:
npx prisma generate
npx prisma migrate dev --name add_set17_static_data

Báo cáo kết quả migration.
```

---

## TASK 3 — Tạo Seed Script

```
Tạo file: prisma/seeds/set17-static-data.seed.ts

Script này seed toàn bộ 59 tướng và 34 tộc/hệ Set 17 vào database.
Dùng upsert (không insert duplicate khi chạy lại).

Yêu cầu:
1. Import PrismaClient
2. Dùng SET17_CHAMPIONS và SET17_TRAITS từ data ở trên (copy vào đầu file)
3. Thêm field rowPosition cho từng tướng dựa trên role:
   - "tank", "fighter" (frontline) → rowPosition = "front"
   - "assassin" (midline) → rowPosition = "mid"
   - "carry", "caster" (backline) → rowPosition = "back"
   - "flex" → rowPosition = "back" (default)
4. Upsert champions: where: { apiName }, update: toàn bộ fields, create: toàn bộ fields
5. Upsert traits: tương tự
6. Log tiến độ: "Seeding champion X/59: Aatrox..."
7. Log tổng kết: "Done! Seeded X champions, Y traits"
8. Bắt và log lỗi cho từng record thất bại (không throw, tiếp tục record tiếp theo)

Sau khi tạo file, thêm vào package.json scripts:
"seed:set17": "ts-node prisma/seeds/set17-static-data.seed.ts"

Chạy thử:
pnpm seed:set17

Báo cáo kết quả: bao nhiêu records đã được tạo/update.
```

---

## TASK 4 — Tạo MetadataSet17Service

```
Tạo module: src/modules/metadata-set17/

Cấu trúc:
- metadata-set17.module.ts
- metadata-set17.service.ts
- metadata-set17.controller.ts
- dto/champion-response.dto.ts
- dto/trait-response.dto.ts

Service cần implement:

1. getAllChampions(setNumber = 17): Promise<ChampionResponseDto[]>
   → Query DB, trả về tất cả tướng của set đó
   → Cache Redis key: "set17:champions" với TTL 1 giờ

2. getChampionByApiName(apiName: string): Promise<ChampionResponseDto | null>
   → Cache Redis key: "set17:champion:{apiName}"

3. getAllTraits(setNumber = 17): Promise<TraitResponseDto[]>
   → Cache Redis key: "set17:traits" với TTL 1 giờ

4. resolveChampionName(apiName: string): Promise<string>
   → Nếu có trong DB: trả displayName
   → Nếu không: strip prefix (TFT17_, Set17_) + format CamelCase → "Darkin Weapon"

5. resolveTraitName(apiName: string): Promise<string>
   → Tương tự resolveChampionName

Controller expose:
- GET /metadata/set17/champions
- GET /metadata/set17/champions/:apiName
- GET /metadata/set17/traits
- GET /metadata/set17/traits/:apiName
- GET /metadata/set17/resolve/champion/:apiName  → { apiName, displayName }
- GET /metadata/set17/resolve/trait/:apiName     → { apiName, displayName }

Follow pattern từ .agent/skills/nestjs-module-generator/SKILL.md
```

---

## TASK 5 — Tích Hợp Vào Metadata Service Hiện Tại

```
Mở file: src/modules/metadata/metadata.service.ts (hoặc FriendlyNameService)

Tích hợp Set17 data vào luồng resolve hiện tại:

1. Inject MetadataSet17Service vào MetadataService
2. Trong resolveCompName() hoặc resolveChampionName():
   - Thử lookup DB qua MetadataSet17Service trước
   - Nếu có → trả về displayName từ DB
   - Nếu không → fallback sang Community Dragon cache (logic cũ)
   - Nếu vẫn không → strip prefix + format

3. Tương tự cho resolveTraitName()

4. Trong getCompLabel() hoặc tương đương:
   - Dùng displayName đã resolve (tiếng Anh chính xác từ DB)

Sau khi tích hợp, viết 2 unit test:
- resolveChampionName("TFT17_Aatrox") → "Aatrox"
- resolveTraitName("TFT17_DarkStar") → "Dark Star"

Chạy: pnpm test metadata
```

---

## TASK 6 — Kiểm Tra End-to-End

```
Sau khi hoàn thành Tasks 1-5, kiểm tra end-to-end:

1. Khởi động backend:
   pnpm dev (hoặc nx serve backend)

2. Test endpoints:
   curl http://localhost:3000/metadata/set17/champions | jq '. | length'
   → Expect: 59

   curl http://localhost:3000/metadata/set17/traits | jq '. | length'
   → Expect: 34

   curl http://localhost:3000/metadata/set17/resolve/champion/TFT17_Aatrox
   → Expect: { "apiName": "TFT17_Aatrox", "displayName": "Aatrox" }

   curl http://localhost:3000/metadata/set17/resolve/trait/TFT17_DarkStar
   → Expect: { "apiName": "TFT17_DarkStar", "displayName": "Dark Star" }

3. Test resolve trong analytics endpoint:
   curl http://localhost:3000/meta/top-comps
   → Verify: không có raw API name nào trong response (không có "TFT17_")

4. Nếu có Swagger UI: mở /api và test thủ công từng endpoint

Báo cáo kết quả: mọi thứ OK hay cần fix gì.
```

---

## LƯU Ý KỸ THUẬT

```
1. Tất cả tên trait trong DB là displayName tiếng Anh (vd: "Dark Star"),
   không phải apiName (vd: "TFT17_DarkStar"). Frontend map sang tiếng Việt
   nếu cần bằng i18n dictionary riêng.

2. Field `role` dùng lowercase English theo convention Riot API:
   "tank" | "fighter" | "carry" | "caster" | "assassin" | "flex"

3. Field `dmgType`: "physical" | "magic" | "mixed"

4. Field `rowPosition`: "front" | "mid" | "back"
   Đây là gợi ý vị trí mặc định — frontend có thể cho user tùy chỉnh.

5. Khi Community Dragon cập nhật Set 17 sau ngày PBE, chạy lại:
   pnpm seed:set17
   Upsert sẽ cập nhật data mà không tạo duplicate.

6. Breakpoints của trait lưu dạng Int[] trong Postgres — đảm bảo
   Prisma schema dùng đúng kiểu dữ liệu cho database đang dùng.
```

---

## THỨ TỰ THỰC HIỆN

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

Mỗi task hoàn thành xong mới chuyển sang task tiếp theo.
Nếu task nào fail, báo cáo lỗi chi tiết trước khi tiếp tục.
```
