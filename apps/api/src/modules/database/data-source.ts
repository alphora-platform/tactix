import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import {
  Player,
  Match,
  Participant,
  ParticipantUnit,
  ParticipantTrait,
  ParticipantAugment,
  MetaSnapshot,
} from '../../database/entities';

dotenv.config();

const envBool = (value: string | undefined): boolean =>
  (value ?? '').trim().toLowerCase() === 'true';

// Supabase requires SSL connection
const sslConfig = envBool(process.env.POSTGRES_SSL)
  ? {
      rejectUnauthorized: false, // Required for Supabase
    }
  : false;

export const datasourceOption: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: +(process.env.POSTGRES_PORT ?? '5432'),
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  database: process.env.POSTGRES_DB ?? 'tactix',
  entities: [
    Player,
    Match,
    Participant,
    ParticipantUnit,
    ParticipantTrait,
    ParticipantAugment,
    MetaSnapshot,
  ],
  migrations: [],
  synchronize: envBool(process.env.POSTGRES_SYNCHRONIZE) ?? false,
  dropSchema: envBool(process.env.POSTGRES_DROP_SCHEMA) ?? false,
  migrationsTableName: 'migrations',
  ssl: sslConfig,
};

export default new DataSource(datasourceOption);
