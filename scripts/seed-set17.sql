-- Seed Set 17 Static Data
-- Run: psql -U <user> -d <db> -f seed-set17.sql
-- Safe to re-run (uses ON CONFLICT DO UPDATE)

BEGIN;

-- ── Champions ──────────────────────────────────────────────────────────────

INSERT INTO set17_champions (api_name, display_name, cost, traits, role, dmg_type, row_position, set_number)
VALUES
  ('TFT17_Aatrox',       'Aatrox',           1, '{N.O.V.A.,Bastion}',                    'tank',     'physical', 'front', 17),
  ('TFT17_Briar',        'Briar',            1, '{Anima,Primordian,Rogue}',               'fighter',  'physical', 'front', 17),
  ('TFT17_Caitlyn',      'Caitlyn',          1, '{N.O.V.A.,Fateweaver}',                  'carry',    'physical', 'back',  17),
  ('TFT17_Chogath',      'Cho''Gath',        1, '{"Dark Star",Brawler}',                  'tank',     'magic',    'front', 17),
  ('TFT17_Ezreal',       'Ezreal',           1, '{Timebreaker,Sniper}',                   'carry',    'physical', 'back',  17),
  ('TFT17_Leona',        'Leona',            1, '{Arbiter,Vanguard}',                     'tank',     'magic',    'front', 17),
  ('TFT17_Lissandra',    'Lissandra',        1, '{"Dark Star",Shepherd,Replicator}',      'caster',   'magic',    'back',  17),
  ('TFT17_Nasus',        'Nasus',            1, '{"Space Groove",Vanguard}',              'tank',     'magic',    'front', 17),
  ('TFT17_Poppy',        'Poppy',            1, '{Meeple,Bastion}',                       'tank',     'magic',    'front', 17),
  ('TFT17_RekSai',       'Rek''Sai',         1, '{Primordian,Brawler}',                   'tank',     'magic',    'front', 17),
  ('TFT17_Talon',        'Talon',            1, '{Stargazer,Rogue}',                      'assassin', 'physical', 'mid',   17),
  ('TFT17_Teemo',        'Teemo',            1, '{"Space Groove",Shepherd}',              'carry',    'magic',    'back',  17),
  ('TFT17_TwistedFate',  'Twisted Fate',     1, '{Stargazer,Fateweaver}',                 'caster',   'magic',    'back',  17),
  ('TFT17_Veigar',       'Veigar',           1, '{Meeple,Replicator}',                    'caster',   'magic',    'back',  17),
  ('TFT17_Akali',        'Akali',            2, '{N.O.V.A.,Marauder}',                    'fighter',  'physical', 'front', 17),
  ('TFT17_Belveth',      'Bel''Veth',        2, '{Primordian,Challenger,Marauder}',       'fighter',  'physical', 'front', 17),
  ('TFT17_Gnar',         'Gnar',             2, '{Meeple,Sniper}',                        'carry',    'physical', 'back',  17),
  ('TFT17_Gragas',       'Gragas',           2, '{Psionic,Brawler}',                      'tank',     'magic',    'front', 17),
  ('TFT17_Gwen',         'Gwen',             2, '{"Space Groove",Rogue}',                 'assassin', 'magic',    'mid',   17),
  ('TFT17_Jax',          'Jax',              2, '{Stargazer,Bastion}',                    'tank',     'magic',    'front', 17),
  ('TFT17_Jinx',         'Jinx',             2, '{Anima,Challenger}',                     'carry',    'physical', 'back',  17),
  ('TFT17_Meepsie',      'Meepsie',          2, '{Meeple,Shepherd,Voyager}',              'tank',     'magic',    'front', 17),
  ('TFT17_Milio',        'Milio',            2, '{Timebreaker,Fateweaver}',               'caster',   'magic',    'back',  17),
  ('TFT17_Mordekaiser',  'Mordekaiser',      2, '{"Dark Star",Channeler,Vanguard}',       'tank',     'magic',    'front', 17),
  ('TFT17_Pantheon',     'Pantheon',         2, '{Timebreaker,Brawler,Replicator}',       'tank',     'physical', 'front', 17),
  ('TFT17_Pyke',         'Pyke',             2, '{Psionic,Voyager}',                      'assassin', 'physical', 'mid',   17),
  ('TFT17_Zoe',          'Zoe',              2, '{Arbiter,Channeler}',                    'caster',   'magic',    'back',  17),
  ('TFT17_Aurora',       'Aurora',           3, '{Anima,Voyager}',                        'caster',   'magic',    'back',  17),
  ('TFT17_Diana',        'Diana',            3, '{Arbiter,Challenger}',                   'fighter',  'magic',    'front', 17),
  ('TFT17_Fizz',         'Fizz',             3, '{Meeple,Rogue}',                         'assassin', 'magic',    'mid',   17),
  ('TFT17_Illaoi',       'Illaoi',           3, '{Anima,Vanguard,Shepherd}',              'tank',     'magic',    'front', 17),
  ('TFT17_Kaisa',        'Kai''Sa',          3, '{"Dark Star",Rogue}',                    'carry',    'physical', 'back',  17),
  ('TFT17_Lulu',         'Lulu',             3, '{Stargazer,Replicator}',                 'caster',   'magic',    'back',  17),
  ('TFT17_Maokai',       'Maokai',           3, '{N.O.V.A.,Brawler}',                     'tank',     'magic',    'front', 17),
  ('TFT17_MissFortune',  'Miss Fortune',     3, '{"Gun Goddess"}',                        'flex',     'mixed',    'back',  17),
  ('TFT17_Ornn',         'Ornn',             3, '{"Space Groove",Bastion}',               'tank',     'magic',    'front', 17),
  ('TFT17_Rhaast',       'Rhaast',           3, '{Redeemer}',                             'tank',     'physical', 'front', 17),
  ('TFT17_Samira',       'Samira',           3, '{"Space Groove",Sniper}',                'carry',    'physical', 'back',  17),
  ('TFT17_Urgot',        'Urgot',            3, '{Mecha,Brawler,Marauder}',               'fighter',  'physical', 'front', 17),
  ('TFT17_Viktor',       'Viktor',           3, '{Psionic,Channeler}',                    'caster',   'magic',    'back',  17),
  ('TFT17_AurelionSol',  'Aurelion Sol',     4, '{Mecha,Channeler}',                      'caster',   'magic',    'back',  17),
  ('TFT17_Corki',        'Corki',            4, '{Meeple,Fateweaver}',                    'carry',    'physical', 'back',  17),
  ('TFT17_Karma',        'Karma',            4, '{"Dark Star",Voyager}',                  'caster',   'magic',    'back',  17),
  ('TFT17_Kindred',      'Kindred',          4, '{N.O.V.A.,Challenger}',                  'carry',    'physical', 'back',  17),
  ('TFT17_Leblanc',      'LeBlanc',          4, '{Arbiter,Shepherd}',                     'carry',    'magic',    'back',  17),
  ('TFT17_MasterYi',     'Master Yi',        4, '{Psionic,Marauder}',                     'fighter',  'physical', 'front', 17),
  ('TFT17_Nami',         'Nami',             4, '{"Space Groove",Replicator}',            'caster',   'magic',    'back',  17),
  ('TFT17_Nunu',         'Nunu',             4, '{Stargazer,Vanguard}',                   'tank',     'magic',    'front', 17),
  ('TFT17_Rammus',       'Rammus',           4, '{Meeple,Bastion}',                       'tank',     'magic',    'front', 17),
  ('TFT17_Riven',        'Riven',            4, '{Timebreaker,Rogue}',                    'fighter',  'mixed',    'front', 17),
  ('TFT17_TahmKench',    'Tahm Kench',       4, '{Oracle,Brawler}',                       'tank',     'magic',    'front', 17),
  ('TFT17_TheMightyMech','The Mighty Mech',  4, '{Mecha,Voyager}',                        'tank',     'physical', 'front', 17),
  ('TFT17_Xayah',        'Xayah',            4, '{Stargazer,Sniper}',                     'carry',    'physical', 'back',  17),
  ('TFT17_Bard',         'Bard',             5, '{Meeple,Channeler}',                     'caster',   'magic',    'back',  17),
  ('TFT17_Blitzcrank',   'Blitzcrank',       5, '{"Party Animal","Space Groove",Vanguard}','fighter', 'magic',    'front', 17),
  ('TFT17_Fiora',        'Fiora',            5, '{"Divine Duelist",Anima,Marauder}',      'fighter',  'physical', 'front', 17),
  ('TFT17_Graves',       'Graves',           5, '{"Factory New"}',                        'carry',    'physical', 'back',  17),
  ('TFT17_Jhin',         'Jhin',             5, '{"Dark Star",Eradicator,Sniper}',        'carry',    'physical', 'back',  17),
  ('TFT17_Morgana',      'Morgana',          5, '{"Dark Lady"}',                          'fighter',  'magic',    'front', 17),
  ('TFT17_Shen',         'Shen',             5, '{Bulwark,Bastion}',                      'fighter',  'magic',    'front', 17),
  ('TFT17_Sona',         'Sona',             5, '{Commander,Psionic,Shepherd}',            'caster',   'magic',    'back',  17),
  ('TFT17_Vex',          'Vex',              5, '{Doomer}',                                'carry',    'magic',    'back',  17),
  ('TFT17_Zed',          'Zed',              5, '{"Galaxy Hunter"}',                      'fighter',  'physical', 'front', 17)
ON CONFLICT (api_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  cost         = EXCLUDED.cost,
  traits       = EXCLUDED.traits,
  role         = EXCLUDED.role,
  dmg_type     = EXCLUDED.dmg_type,
  row_position = EXCLUDED.row_position,
  set_number   = EXCLUDED.set_number,
  updated_at   = now();

-- ── Traits ─────────────────────────────────────────────────────────────────

INSERT INTO set17_traits (api_name, display_name, trait_type, breakpoints, description, set_number)
VALUES
  ('TFT17_Anima',         'Anima',          'origin', '{3,6}',       'Tich diem ky thuat khi thua. Du 100 diem nhan vu khi manh.', 17),
  ('TFT17_Arbiter',       'Arbiter',        'origin', '{2,3}',       'Tu tao luat than thanh: chon dieu kien va hieu ung kich hoat.', 17),
  ('TFT17_Bulwark',       'Bulwark',        'origin', '{1}',         'Trieu hoi relic: dong doi ke canh nhan 18% HP giap do + 20% AS.', 17),
  ('TFT17_Commander',     'Commander',       'origin', '{1}',         'Sona tang Command Mod moi 2 vong: thay doi cach dong doi chien dau.', 17),
  ('TFT17_DarkLady',      'Dark Lady',       'origin', '{1}',         'Doi nhan 5% giam sat thuong phep, 10% khi Morgana bien hinh.', 17),
  ('TFT17_DarkStar',      'Dark Star',       'origin', '{2,4,6,9}',   'Tao ho den tieu diet dich <10% mau. 4: +30% AD/AP. 6: sieu tuong manh nhat.', 17),
  ('TFT17_DivineDuelist', 'Divine Duelist',  'origin', '{1}',         'Hoi 15% mau nguoi choi tu sat thuong gay ra. Fiora luon thang 1v1.', 17),
  ('TFT17_Doomer',        'Doomer',          'origin', '{1}',         'Dau tran danh cap 8% AD/AP tat ca dich, tang cho Vex manh nhat.', 17),
  ('TFT17_Eradicator',    'Eradicator',      'origin', '{1}',         'Dich bi giam 14% Giap va Khang Phep.', 17),
  ('TFT17_FactoryNew',    'Factory New',     'origin', '{1}',         'Sau moi tran, Graves nhan nang cap vinh vien moi.', 17),
  ('TFT17_GalaxyHunter',  'Galaxy Hunter',   'origin', '{1}',         'Khi co ban sao song: Zed +40% AD. Chi qua Hero Augment.', 17),
  ('TFT17_GunGoddess',    'Gun Goddess',     'origin', '{1}',         'Chon che do khi len san: Channeler / Challenger / Replicator.', 17),
  ('TFT17_Mecha',         'Mecha',           'origin', '{3,4,6}',     'Bien hinh: +60% mau, chiem 2 o doi hinh, tinh doi cho Mecha. 6: +1 o doi.', 17),
  ('TFT17_Meeple',        'Meeple',          'origin', '{3,5,7,10}',  'Tich bup be, tang suc manh chieu thuc. 7: Cloning Slot tren ghe du bi.', 17),
  ('TFT17_NOVA',          'N.O.V.A.',        'origin', '{2,5}',       'Sau 6 giay chien dau: surge buff cho dong doi theo loai tuong N.O.V.A. chon.', 17),
  ('TFT17_Oracle',        'Oracle',          'origin', '{1}',         'Moi 3 vong, Tahm Kench tang phan thuong.', 17),
  ('TFT17_PartyAnimal',   'Party Animal',    'origin', '{1}',         'Khi <45% HP: an + hoi 15% HP/giay. Khi day: Groove mai + passive x4.', 17),
  ('TFT17_Primordian',    'Primordian',      'origin', '{2,3}',       'Gay sat thuong sinh ra Swarmlings. 3: moi vong nhan tuong 1-2v ngau nhien.', 17),
  ('TFT17_Psionic',       'Psionic',         'origin', '{2,4}',       'Nhan Psionic items dat len bat ky dong doi nao. 4: items manh hon tren Psionic.', 17),
  ('TFT17_Redeemer',      'Redeemer',        'origin', '{1}',         'Moi toc/he active: +2-4% AS va +2-4 Giap/Khang Phep cho doi.', 17),
  ('TFT17_SpaceGroove',   'Space Groove',    'origin', '{1,3,5,7,10}','Groove: tang AS + hoi % mau toi da. 5: moi giay trong Groove +3% AD/AP tich luy.', 17),
  ('TFT17_Stargazer',     'Stargazer',       'origin', '{3,4,5,6,7}', 'Chom sao thay doi moi van: 7 constellation khac nhau.', 17),
  ('TFT17_Timebreaker',   'Timebreaker',     'origin', '{2,3,4}',     'Thua: reroll mien phi. Thang: tich XP vao Temporal Core. 3: +15% AS team.', 17),
  ('TFT17_Bastion',       'Bastion',         'class',  '{2,4,6}',     'Doi +12 Giap/Khang Phep. Bastion nhan nhieu hon, double trong 10 giay dau.', 17),
  ('TFT17_Brawler',       'Brawler',         'class',  '{2,4,6}',     'Doi +7% mau. Brawler: +25/45/65% mau toi da.', 17),
  ('TFT17_Challenger',    'Challenger',       'class',  '{2,3,4,5}',   'Doi +10% AS. Challenger: +15-40% AS. Sau kill: dash + +50% AS bonus 2.5 giay.', 17),
  ('TFT17_Channeler',     'Channeler',        'class',  '{2,3,4,5}',   'Channeler +20% mana tu moi nguon. Doi hoi mana lien tuc.', 17),
  ('TFT17_Fateweaver',    'Fateweaver',       'class',  '{2,4}',       'Innate: Spell Crit. 2: hieu ung co hoi kiem tra 2 lan. 4: +20% crit chance.', 17),
  ('TFT17_Marauder',      'Marauder',         'class',  '{2,4,6}',     'Doi +5% Omnivamp. Marauder: +5-10% Omnivamp, +20-40% AD, heal du -> giap do.', 17),
  ('TFT17_Replicator',    'Replicator',       'class',  '{2,4}',       'Chieu thuc kich hoat them lan 2 voi 25-50% suc manh.', 17),
  ('TFT17_Rogue',         'Rogue',            'class',  '{2,3,4,5}',   'Rogue +15-60% AD/AP. Lan dau <50% mau: an, dich bi chuyen sang tuong khac.', 17),
  ('TFT17_Shepherd',      'Shepherd',         'class',  '{3,5,7}',     'Trieu hoi Bia va Bayin. Suc manh tang theo tong sao tuong Shepherd.', 17),
  ('TFT17_Sniper',        'Sniper',           'class',  '{2,3,4,5}',   '+18-32% khuech dai sat thuong, tang them theo khoang cach den dich.', 17),
  ('TFT17_Vanguard',      'Vanguard',         'class',  '{2,4,6}',     '+5% Do Ben khi co giap do. Dau tran + 50% mau: giap do 16-40% mau toi da.', 17),
  ('TFT17_Voyager',       'Voyager',          'class',  '{2,3,4,5,6}', 'Xe tang/Chien binh: giap do 175-700. Cac tuong khac: +9-27% khuech dai sat thuong.', 17)
ON CONFLICT (api_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  trait_type   = EXCLUDED.trait_type,
  breakpoints  = EXCLUDED.breakpoints,
  description  = EXCLUDED.description,
  set_number   = EXCLUDED.set_number,
  updated_at   = now();

COMMIT;

-- Verify
SELECT 'Champions: ' || count(*) FROM set17_champions;
SELECT 'Traits: ' || count(*) FROM set17_traits;
