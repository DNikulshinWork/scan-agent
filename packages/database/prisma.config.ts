import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://scanagent:scanagent_local_password@localhost:5432/scanagent_db?schema=public',
  },
});
