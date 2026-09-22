import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://scanagent:scanagent_local_password@localhost:5432/scanagent_db?schema=public';

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

/**
 * Автоматическая инициализация схемы таблиц (DDL) при старте сервера,
 * если база данных в Neon еще не инициализирована (CREATE TABLE IF NOT EXISTS).
 */
export async function ensureDatabaseSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR(255) NOT NULL,
        source VARCHAR(50) NOT NULL DEFAULT 'hh',
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        price VARCHAR(255) NOT NULL DEFAULT '',
        salary_num INTEGER,
        link TEXT NOT NULL DEFAULT '',
        score INTEGER NOT NULL DEFAULT 0,
        match_percent INTEGER NOT NULL DEFAULT 0,
        verdict TEXT NOT NULL DEFAULT '',
        hook TEXT NOT NULL DEFAULT '',
        pitch TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '',
        employer VARCHAR(255),
        city VARCHAR(255),
        is_remote BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        outcome VARCHAR(50) NOT NULL DEFAULT 'pending',
        published_at TIMESTAMPTZ(6),
        applied_at TIMESTAMPTZ(6),
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_orders_order_id_source UNIQUE (order_id, source)
      );

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
      CREATE INDEX IF NOT EXISTS idx_orders_score ON orders (score DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS scoring_rule_configs (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
        core_stack TEXT NOT NULL DEFAULT '',
        related_stack TEXT NOT NULL DEFAULT '',
        nice_to_have TEXT NOT NULL DEFAULT '',
        hard_exclude TEXT NOT NULL DEFAULT '',
        min_score INTEGER NOT NULL DEFAULT 3,
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

export * from '@prisma/client';
