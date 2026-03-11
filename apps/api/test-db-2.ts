import { DataSource } from 'typeorm';

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:YkZKz0QR2ygnCPIm@localhost:5433/tactix',
  });
  await dataSource.initialize();
  const nulls = await dataSource.query(
    `SELECT comp_id, trait_combo, patch FROM mv_comp_stats WHERE trait_combo IS NULL LIMIT 2`
  );
  console.log('Nulls in MV:', JSON.stringify(nulls, null, 2));

  // Let's inspect the CTE data for one of these comp_ids
  if (nulls.length > 0) {
    const compId = nulls[0].comp_id;
    const raw = await dataSource.query(
      `
      SELECT
        p.puuid,
        p.match_id,
        p.placement,
        m.patch,
        md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) AS comp_id,
        array_agg(pt.trait_name ORDER BY pt.trait_name) AS trait_combo
      FROM participants p
      JOIN matches m
        ON m.match_id  = p.match_id
       AND m.queue_id  = 1100
      JOIN participant_traits pt
        ON pt.match_id = p.match_id
       AND pt.puuid    = p.puuid
       AND pt.style    > 0
      WHERE m.patch IS NOT NULL
      GROUP BY p.puuid, p.match_id, p.placement, m.patch
      HAVING md5(string_agg(pt.trait_name, ',' ORDER BY pt.trait_name))::varchar(16) = $1
      LIMIT 5
    `,
      [compId]
    );
    console.log('CTE rows for ' + compId + ':', JSON.stringify(raw, null, 2));
  }

  await dataSource.destroy();
}

run().catch(console.error);
