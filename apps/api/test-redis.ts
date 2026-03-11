import { Redis } from 'ioredis';

async function run() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
  });

  const keys = await redis.keys('*tier-list*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Deleted ${keys.length} keys`);
  } else {
    console.log('No keys to delete');
  }

  await redis.quit();
}

run().catch(console.error);
