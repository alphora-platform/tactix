import { DataSource } from 'typeorm';
import { Set17Champion } from '../entities/set17-champion.entity';
import { Set17Trait } from '../entities/set17-trait.entity';
import { datasourceOption } from '../../modules/database/data-source';

// ── Champions Data ──────────────────────────────────────────────────────────

const SET17_CHAMPIONS = [
  // 1 gold
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
  // 2 gold
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
  // 3 gold
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
  // 4 gold
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
  // 5 gold
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
];

// ── Traits Data ─────────────────────────────────────────────────────────────

const SET17_TRAITS = [
  // Origins
  {
    apiName: 'TFT17_Anima',
    displayName: 'Anima',
    traitType: 'origin',
    breakpoints: [3, 6],
    description: 'Tích điểm kỹ thuật khi thua. Đủ 100 điểm nhận vũ khí mạnh.',
  },
  {
    apiName: 'TFT17_Arbiter',
    displayName: 'Arbiter',
    traitType: 'origin',
    breakpoints: [2, 3],
    description: 'Tự tạo luật thần thánh: chọn điều kiện và hiệu ứng kích hoạt.',
  },
  {
    apiName: 'TFT17_Bulwark',
    displayName: 'Bulwark',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Triệu hồi relic: đồng đội kế cạnh nhận 18% HP giáp đỡ + 20% AS.',
  },
  {
    apiName: 'TFT17_Commander',
    displayName: 'Commander',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Sona tặng Command Mod mỗi 2 vòng: thay đổi cách đồng đội chiến đấu.',
  },
  {
    apiName: 'TFT17_DarkLady',
    displayName: 'Dark Lady',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Đội nhận 5% giảm sát thương phép, 10% khi Morgana biến hình.',
  },
  {
    apiName: 'TFT17_DarkStar',
    displayName: 'Dark Star',
    traitType: 'origin',
    breakpoints: [2, 4, 6, 9],
    description: 'Tạo hố đen tiêu diệt địch <10% máu. 4: +30% AD/AP. 6: siêu tướng mạnh nhất.',
  },
  {
    apiName: 'TFT17_DivineDuelist',
    displayName: 'Divine Duelist',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Hồi 15% máu người chơi từ sát thương gây ra. Fiora luôn thắng 1v1.',
  },
  {
    apiName: 'TFT17_Doomer',
    displayName: 'Doomer',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Đầu trận đánh cắp 8% AD/AP tất cả địch, tặng cho Vex mạnh nhất.',
  },
  {
    apiName: 'TFT17_Eradicator',
    displayName: 'Eradicator',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Địch bị giảm 14% Giáp và Kháng Phép.',
  },
  {
    apiName: 'TFT17_FactoryNew',
    displayName: 'Factory New',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Sau mỗi trận, Graves nhận nâng cấp vĩnh viễn mới.',
  },
  {
    apiName: 'TFT17_GalaxyHunter',
    displayName: 'Galaxy Hunter',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Khi có bản sao sống: Zed +40% AD. Chỉ qua Hero Augment.',
  },
  {
    apiName: 'TFT17_GunGoddess',
    displayName: 'Gun Goddess',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Chọn chế độ khi lên sân: Channeler / Challenger / Replicator.',
  },
  {
    apiName: 'TFT17_Mecha',
    displayName: 'Mecha',
    traitType: 'origin',
    breakpoints: [3, 4, 6],
    description: 'Biến hình: +60% máu, chiếm 2 ô đội hình, tính đôi cho Mecha. 6: +1 ô đội.',
  },
  {
    apiName: 'TFT17_Meeple',
    displayName: 'Meeple',
    traitType: 'origin',
    breakpoints: [3, 5, 7, 10],
    description: 'Tích búp bê, tăng sức mạnh chiêu thức. 7: Cloning Slot trên ghế dự bị.',
  },
  {
    apiName: 'TFT17_NOVA',
    displayName: 'N.O.V.A.',
    traitType: 'origin',
    breakpoints: [2, 5],
    description: 'Sau 6 giây chiến đấu: surge buff cho đồng đội theo loại tướng N.O.V.A. chọn.',
  },
  {
    apiName: 'TFT17_Oracle',
    displayName: 'Oracle',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Mỗi 3 vòng, Tahm Kench tặng phần thưởng.',
  },
  {
    apiName: 'TFT17_PartyAnimal',
    displayName: 'Party Animal',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Khi <45% HP: ẩn + hồi 15% HP/giây. Khi đầy: Groove mãi + passive x4.',
  },
  {
    apiName: 'TFT17_Primordian',
    displayName: 'Primordian',
    traitType: 'origin',
    breakpoints: [2, 3],
    description: 'Gây sát thương sinh ra Swarmlings. 3: mỗi vòng nhận tướng 1-2v ngẫu nhiên.',
  },
  {
    apiName: 'TFT17_Psionic',
    displayName: 'Psionic',
    traitType: 'origin',
    breakpoints: [2, 4],
    description: 'Nhận Psionic items đặt lên bất kỳ đồng đội nào. 4: items mạnh hơn trên Psionic.',
  },
  {
    apiName: 'TFT17_Redeemer',
    displayName: 'Redeemer',
    traitType: 'origin',
    breakpoints: [1],
    description: 'Mỗi tộc/hệ active: +2-4% AS và +2-4 Giáp/Kháng Phép cho đội.',
  },
  {
    apiName: 'TFT17_SpaceGroove',
    displayName: 'Space Groove',
    traitType: 'origin',
    breakpoints: [1, 3, 5, 7, 10],
    description: 'Groove: tăng AS + hồi % máu tối đa. 5: mỗi giây trong Groove +3% AD/AP tích lũy.',
  },
  {
    apiName: 'TFT17_Stargazer',
    displayName: 'Stargazer',
    traitType: 'origin',
    breakpoints: [3, 4, 5, 6, 7],
    description: 'Chòm sao thay đổi mỗi ván: 7 constellation khác nhau (The Altar, The Boar, v.v.)',
  },
  {
    apiName: 'TFT17_Timebreaker',
    displayName: 'Timebreaker',
    traitType: 'origin',
    breakpoints: [2, 3, 4],
    description: 'Thua: reroll miễn phí. Thắng: tích XP vào Temporal Core. 3: +15% AS team.',
  },
  // Classes
  {
    apiName: 'TFT17_Bastion',
    displayName: 'Bastion',
    traitType: 'class',
    breakpoints: [2, 4, 6],
    description: 'Đội +12 Giáp/Kháng Phép. Bastion nhận nhiều hơn, double trong 10 giây đầu.',
  },
  {
    apiName: 'TFT17_Brawler',
    displayName: 'Brawler',
    traitType: 'class',
    breakpoints: [2, 4, 6],
    description: 'Đội +7% máu. Brawler: +25/45/65% máu tối đa.',
  },
  {
    apiName: 'TFT17_Challenger',
    displayName: 'Challenger',
    traitType: 'class',
    breakpoints: [2, 3, 4, 5],
    description: 'Đội +10% AS. Challenger: +15-40% AS. Sau kill: dash + +50% AS bonus 2.5 giây.',
  },
  {
    apiName: 'TFT17_Channeler',
    displayName: 'Channeler',
    traitType: 'class',
    breakpoints: [2, 3, 4, 5],
    description: 'Channeler +20% mana từ mọi nguồn. Đội hồi mana liên tục.',
  },
  {
    apiName: 'TFT17_Fateweaver',
    displayName: 'Fateweaver',
    traitType: 'class',
    breakpoints: [2, 4],
    description: 'Innate: Spell Crit. 2: hiệu ứng cơ hội kiểm tra 2 lần. 4: +20% crit chance.',
  },
  {
    apiName: 'TFT17_Marauder',
    displayName: 'Marauder',
    traitType: 'class',
    breakpoints: [2, 4, 6],
    description: 'Đội +5% Omnivamp. Marauder: +5-10% Omnivamp, +20-40% AD, heal dư → giáp đỡ.',
  },
  {
    apiName: 'TFT17_Replicator',
    displayName: 'Replicator',
    traitType: 'class',
    breakpoints: [2, 4],
    description: 'Chiêu thức kích hoạt thêm lần 2 với 25-50% sức mạnh.',
  },
  {
    apiName: 'TFT17_Rogue',
    displayName: 'Rogue',
    traitType: 'class',
    breakpoints: [2, 3, 4, 5],
    description: 'Rogue +15-60% AD/AP. Lần đầu <50% máu: ẩn, địch bị chuyển sang tướng khác.',
  },
  {
    apiName: 'TFT17_Shepherd',
    displayName: 'Shepherd',
    traitType: 'class',
    breakpoints: [3, 5, 7],
    description: 'Triệu hồi Bia và Bayin. Sức mạnh tăng theo tổng sao tướng Shepherd.',
  },
  {
    apiName: 'TFT17_Sniper',
    displayName: 'Sniper',
    traitType: 'class',
    breakpoints: [2, 3, 4, 5],
    description: '+18-32% khuếch đại sát thương, tăng thêm theo khoảng cách đến địch.',
  },
  {
    apiName: 'TFT17_Vanguard',
    displayName: 'Vanguard',
    traitType: 'class',
    breakpoints: [2, 4, 6],
    description: '+5% Độ Bền khi có giáp đỡ. Đầu trận + 50% máu: giáp đỡ 16-40% máu tối đa.',
  },
  {
    apiName: 'TFT17_Voyager',
    displayName: 'Voyager',
    traitType: 'class',
    breakpoints: [2, 3, 4, 5, 6],
    description:
      'Xe tăng/Chiến binh: giáp đỡ 175-700. Các tướng khác: +9-27% khuếch đại sát thương.',
  },
];

// ── Row Position Mapping ────────────────────────────────────────────────────

function getRowPosition(role: string): string {
  switch (role) {
    case 'tank':
    case 'fighter':
      return 'front';
    case 'assassin':
      return 'mid';
    case 'carry':
    case 'caster':
    case 'flex':
    default:
      return 'back';
  }
}

// ── Main Seed Function ──────────────────────────────────────────────────────

export async function seedSet17StaticData(ds: DataSource) {
  const championRepo = ds.getRepository(Set17Champion);
  const traitRepo = ds.getRepository(Set17Trait);

  let champSuccess = 0;
  let champFail = 0;

  for (let i = 0; i < SET17_CHAMPIONS.length; i++) {
    const c = SET17_CHAMPIONS[i];
    const idx = `${i + 1}/${SET17_CHAMPIONS.length}`;
    try {
      await championRepo.upsert(
        {
          apiName: c.apiName,
          displayName: c.displayName,
          cost: c.cost,
          traits: c.traits,
          role: c.role,
          dmgType: c.dmgType,
          rowPosition: getRowPosition(c.role),
          setNumber: 17,
        },
        ['apiName']
      );
      console.log(`Seeding champion ${idx}: ${c.displayName}`);
      champSuccess++;
    } catch (err) {
      console.error(`Failed champion ${idx}: ${c.displayName} —`, (err as Error).message);
      champFail++;
    }
  }

  let traitSuccess = 0;
  let traitFail = 0;

  for (let i = 0; i < SET17_TRAITS.length; i++) {
    const t = SET17_TRAITS[i];
    const idx = `${i + 1}/${SET17_TRAITS.length}`;
    try {
      await traitRepo.upsert(
        {
          apiName: t.apiName,
          displayName: t.displayName,
          traitType: t.traitType,
          breakpoints: t.breakpoints,
          description: t.description,
          setNumber: 17,
        },
        ['apiName']
      );
      console.log(`Seeding trait ${idx}: ${t.displayName}`);
      traitSuccess++;
    } catch (err) {
      console.error(`Failed trait ${idx}: ${t.displayName} —`, (err as Error).message);
      traitFail++;
    }
  }

  console.log(
    `\nDone! Seeded ${champSuccess} champions (${champFail} failed), ${traitSuccess} traits (${traitFail} failed)`
  );
}

// ── Standalone execution ───────────────────────────────────────────────────

if (require.main === module) {
  (async () => {
    const ds = new DataSource(datasourceOption);
    await ds.initialize();
    console.log('Connected to database.');
    await seedSet17StaticData(ds);
    await ds.destroy();
  })().catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
}
