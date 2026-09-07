import { initTracing, patchConsoleLogs, bodyCaptureMiddleware } from '../lib/telemetry/index';
import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { CATALOG, CATEGORIES, findProduct, CatalogProduct } from './catalog';

// Initialize telemetry BEFORE anything else
initTracing('catalog-service');
patchConsoleLogs('catalog-service');

const app = express();
const port = process.env.PORT || 3004;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:secret@localhost:5432/ecommerce';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL_SECONDS = 30;

app.use(express.json());
app.use(bodyCaptureMiddleware);

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

const pool = new Pool({ connectionString: DATABASE_URL });
let dbReady = false;

const redis = createClient({ url: REDIS_URL });
let cacheReady = false;
redis.on('error', () => {
  // Handled by cacheReady; a dead cache must never take the catalogue down.
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Widens the products table and seeds the full catalogue. Runs on every boot because
 * the compose init scripts only fire on a brand-new volume, and a demo that only works
 * after `down -v` is a demo that fails in front of people.
 */
async function ensureSchema() {
  try {
    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category     VARCHAR(60);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS brand        VARCHAR(60);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS emoji        VARCHAR(16);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS rating       NUMERIC(2,1);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description  TEXT;
    `);

    for (const p of CATALOG) {
      await pool.query(
        `INSERT INTO products (id, name, price, stock, category, brand, emoji, rating, review_count, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, price = EXCLUDED.price, category = EXCLUDED.category,
           brand = EXCLUDED.brand, emoji = EXCLUDED.emoji, rating = EXCLUDED.rating,
           review_count = EXCLUDED.review_count, description = EXCLUDED.description`,
        [p.id, p.name, p.price, p.stock, p.category, p.brand, p.emoji, p.rating, p.review_count, p.description]
      );
    }
    dbReady = true;
    console.log(`[CatalogService] Schema ready, ${CATALOG.length} products seeded`);
  } catch (err: any) {
    dbReady = false;
    console.warn(`[CatalogService] Postgres unavailable (${err.message}); serving the in-code catalogue`);
  }
}

/** Reads through Redis. A cache miss is a real, visible span, which is the point. */
async function cached<T>(key: string, simHeaders: Record<string, string | undefined>, load: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
  const bypass = simHeaders['x-simulate-cache-miss'] === 'true';

  if (cacheReady && !bypass) {
    try {
      const raw = await redis.get(key);
      if (raw) return { value: JSON.parse(raw) as T, hit: true };
    } catch (err: any) {
      console.warn(`[CatalogService] Cache read failed for ${key}: ${err.message}`);
    }
  }

  const value = await load();

  if (cacheReady) {
    try {
      await redis.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(value));
    } catch (err: any) {
      console.warn(`[CatalogService] Cache write failed for ${key}: ${err.message}`);
    }
  }
  return { value, hit: false };
}

function rowsToProducts(rows: any[]): CatalogProduct[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    price: Number(r.price),
    stock: Number(r.stock),
    category: r.category,
    brand: r.brand,
    emoji: r.emoji,
    rating: Number(r.rating),
    review_count: Number(r.review_count),
    description: r.description
  }));
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'catalog-service', database: dbReady, cache: cacheReady });
});

app.get('/categories', async (_req: Request, res: Response) => {
  const counts: Record<string, number> = {};
  CATALOG.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
  res.json({ categories: CATEGORIES.map((c) => ({ ...c, count: counts[c.slug] || 0 })) });
});

// Browse. Cached per category+sort so repeat browsing shows cache hits in the trace.
app.get('/products', async (req: Request, res: Response) => {
  const category = String(req.query.category || 'all');
  const sort = String(req.query.sort || 'featured');
  const simHeaders = {
    'x-simulate-cache-miss': normalizeHeader(req.headers['x-simulate-cache-miss']),
    'x-simulate-slow': normalizeHeader(req.headers['x-simulate-slow'])
  };

  if (simHeaders['x-simulate-slow'] === 'true') {
    console.warn('[CatalogService] Simulated slow catalogue read (2s)');
    await sleep(2000);
  }

  try {
    const { value, hit } = await cached(`catalog:list:${category}:${sort}`, simHeaders, async () => {
      if (dbReady) {
        const where = category === 'all' ? '' : 'WHERE category = $1';
        const params = category === 'all' ? [] : [category];
        const { rows } = await pool.query(`SELECT * FROM products ${where}`, params);
        return rowsToProducts(rows);
      }
      return CATALOG.filter((p) => category === 'all' || p.category === category);
    });

    const sorted = [...value].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      return b.review_count - a.review_count;
    });

    res.json({ products: sorted, count: sorted.length, cache: hit ? 'hit' : 'miss' });
  } catch (err: any) {
    console.error(`[CatalogService] Failed to list products: ${err.message}`);
    res.status(500).json({ error: 'Failed to load catalogue', message: err.message });
  }
});

// Search. Deliberately uncached so every query is a real database round trip.
app.get('/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ products: [], count: 0, query: q });

  try {
    if (dbReady) {
      const { rows } = await pool.query(
        `SELECT * FROM products
         WHERE name ILIKE $1 OR description ILIKE $1 OR brand ILIKE $1 OR category ILIKE $1
         ORDER BY review_count DESC`,
        [`%${q}%`]
      );
      return res.json({ products: rowsToProducts(rows), count: rows.length, query: q });
    }
    const needle = q.toLowerCase();
    const hits = CATALOG.filter((p) =>
      [p.name, p.description, p.brand, p.category].some((f) => f.toLowerCase().includes(needle))
    );
    res.json({ products: hits, count: hits.length, query: q });
  } catch (err: any) {
    console.error(`[CatalogService] Search failed for "${q}": ${err.message}`);
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

app.get('/products/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    if (dbReady) {
      const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Product not found', id });
      return res.json(rowsToProducts(rows)[0]);
    }
    const product = findProduct(id);
    if (!product) return res.status(404).json({ error: 'Product not found', id });
    res.json(product);
  } catch (err: any) {
    console.error(`[CatalogService] Failed to load ${id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to load product', message: err.message });
  }
});

async function start() {
  await ensureSchema();
  try {
    await redis.connect();
    cacheReady = true;
    console.log('[CatalogService] Redis cache connected');
  } catch (err: any) {
    cacheReady = false;
    console.warn(`[CatalogService] Redis unavailable (${err.message}); every read will hit Postgres`);
  }
  app.listen(port, () => console.log(`Catalog Service listening on port ${port}`));
}

start();
