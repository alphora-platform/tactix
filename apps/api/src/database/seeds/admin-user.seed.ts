import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { datasourceOption } from '../../modules/database/data-source';

export async function seedAdminUser(dataSource: DataSource): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    console.log(`⚡ Admin user already exists (${email}), updating password…`);
    existing.passwordHash = await bcrypt.hash(password, 12);
    existing.username = username;
    await repo.save(existing);
    console.log('✅ Admin user updated');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await repo.save(repo.create({ email, username, passwordHash }));
  console.log(`✅ Admin user created (${email})`);
}

// Allow standalone execution: npx ts-node src/database/seeds/admin-user.seed.ts
if (require.main === module) {
  const ds = new DataSource(datasourceOption);
  ds.initialize()
    .then((dataSource) => seedAdminUser(dataSource))
    .then(() => ds.destroy())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
