import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

let dbAvailable = true;
export const isDbAvailable = () => dbAvailable;

const { Pool } = pg;

export const pool = process.env.NO_DB === '1' ? ({} as pg.Pool) : new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://app:secret@localhost:5433/devtools',
  max: 20,
  idleTimeoutMillis: 30000
});

export const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
  } catch (e) {
    dbAvailable = false;
  }
};

if (process.env.NO_DB === '1') {
  dbAvailable = false;
} else {
  testConnection().catch(() => { dbAvailable = false; });
}

// Callers must fail loudly when telemetry storage is down. Returning fabricated
// fixtures here is what made seeded demo data indistinguishable from real traces.
export class DatabaseUnavailableError extends Error {
  code = 'DB_UNAVAILABLE';
  constructor() {
    super('Telemetry database unavailable');
  }
}

export function requireDb(): void {
  if (!dbAvailable) throw new DatabaseUnavailableError();
}
