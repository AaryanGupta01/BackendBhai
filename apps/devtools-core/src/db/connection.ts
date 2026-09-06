import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://app:secret@localhost:5433/devtools',
  max: 20,
  idleTimeoutMillis: 30000
});
