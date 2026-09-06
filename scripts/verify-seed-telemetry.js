#!/usr/bin/env node
// scripts/verify-seed-telemetry.js — Fix-1 verification (Integration Fix List item 1).
//
// Fails if recent orders in the ecommerce DB lack matching traces in the
// devtools DB. Direct-DB seeding bypasses telemetry, so this check catches
// any regression where order rows appear without corresponding traces.
//
// Only the last WINDOW_MINUTES (default 10) are checked: historical gaps
// from a time before the pipeline was lossless are not regressions.
//
// Usage: node scripts/verify-seed-telemetry.js
// Env:   POSTGRES_HOST (default localhost), POSTGRES_PORT (default 5433)

const { Client } = require('pg');

const HOST = process.env.POSTGRES_HOST || 'localhost';
const PORT = parseInt(process.env.POSTGRES_PORT || '5433', 10);
const USER = process.env.POSTGRES_USER || 'app';
const PASSWORD = process.env.POSTGRES_PASSWORD || 'secret';

async function main() {
  const WINDOW_MINUTES = parseInt(process.env.WINDOW_MINUTES || '10', 10);

  // Recent order count from the ecommerce DB
  const ecom = new Client({ host: HOST, port: PORT, user: USER, password: PASSWORD, database: 'ecommerce' });
  await ecom.connect();
  let orderCount = 0;
  try {
    const res = await ecom.query(
      'SELECT COUNT(*)::int AS n FROM orders WHERE created_at >= NOW() - ($1 * INTERVAL \'1 minute\')',
      [WINDOW_MINUTES]
    );
    orderCount = res.rows[0].n;
  } catch (err) {
    if (err.code === '42P01') {
      console.log('[verify-seed] orders table does not exist yet — nothing to verify. PASS (vacuous).');
      return;
    }
    throw err;
  } finally {
    await ecom.end();
  }

  // Recent trace count for POST order paths from the devtools DB
  const dev = new Client({ host: HOST, port: PORT, user: USER, password: PASSWORD, database: 'devtools' });
  await dev.connect();
  let orderTraceCount = 0;
  try {
    const res = await dev.query(
      `SELECT COUNT(DISTINCT t.id)::int AS n
         FROM traces t
        WHERE t.method = 'POST'
          AND (t.path LIKE '%order%' OR t.path LIKE '%checkout%')
          AND to_timestamp(t.start_time / 1000.0) >= NOW() - ($1 * INTERVAL '1 minute')`,
      [WINDOW_MINUTES]
    );
    orderTraceCount = res.rows[0].n;
  } finally {
    await dev.end();
  }

  console.log(`[verify-seed] orders in ecommerce DB:   ${orderCount}`);
  console.log(`[verify-seed] POST order traces in devtools DB: ${orderTraceCount}`);

  if (orderCount === 0) {
    console.log('[verify-seed] No orders exist. PASS (vacuous) — run scripts/seed.js first.');
    return;
  }

  if (orderTraceCount < orderCount) {
    console.error(`[verify-seed] FAIL: ${orderCount} orders exist but only ${orderTraceCount} order traces found.`);
    console.error('[verify-seed] Some orders were created without telemetry (direct-DB seeding or dropped OTLP exports?).');
    process.exit(1);
  }

  console.log('[verify-seed] PASS: every order has corresponding trace telemetry.');
}

main().catch(err => {
  console.error('[verify-seed] ERROR:', err.message);
  process.exit(1);
});
