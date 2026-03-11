import { DataSource } from 'typeorm';

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:YkZKz0QR2ygnCPIm@localhost:5433/tactix',
  });
  await dataSource.initialize();
  const res = await dataSource.query(`SELECT comp_id, trait_combo FROM mv_comp_stats LIMIT 5`);
  console.log('Sample:', JSON.stringify(res, null, 2));

  const nulls = await dataSource.query(
    `SELECT comp_id, trait_combo, patch FROM mv_comp_stats WHERE trait_combo IS NULL`
  );
  console.log('Nulls:', JSON.stringify(nulls, null, 2));

  await dataSource.destroy();
}

run().catch(console.error);
