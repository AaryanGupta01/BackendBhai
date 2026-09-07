import { initTracing, patchConsoleLogs, bodyCaptureMiddleware } from '../lib/telemetry/index';
import express, { Request, Response } from 'express';
import { Pool } from 'pg';

initTracing('review-service');
patchConsoleLogs('review-service');

const app = express();
const port = process.env.PORT || 3005;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://app:secret@localhost:5432/ecommerce';

app.use(express.json());
app.use(bodyCaptureMiddleware);

// Injected outage. Recommendations degrade rather than fail when this is on,
// which is the interesting thing to watch in the trace.
app.use((req, res, next) => {
  if (req.path !== '/health' && normalizeHeader(req.headers['x-simulate-reviews-503']) === 'true') {
    console.error('[ReviewService] Simulated outage (x-simulate-reviews-503)');
    return res.status(503).json({ error: 'Review service unavailable', simulated: true });
  }
  next();
});

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const pool = new Pool({ connectionString: DATABASE_URL });
let dbReady = false;

const AUTHORS = ['A. Mehta', 'J. Okafor', 'L. Nguyen', 'R. Silva', 'T. Andersson', 'K. Yamada', 'D. Novak', 'S. Farrell'];
const HEADLINES = [
  ['Exactly what I needed', 5, 'Replaced a much pricier one and honestly cannot tell the difference. Setup took two minutes.'],
  ['Good, with one caveat', 4, 'Build quality is excellent. Docked a star because the cable is shorter than the photos suggest.'],
  ['Solid for the price', 4, 'Been using it daily for three months with no issues at all. Would buy again.'],
  ['Does the job', 3, 'Works fine, nothing remarkable. The packaging was more impressive than the product.'],
  ['Better than expected', 5, 'Bought it on a whim during a sale and it has become the thing I use most on my desk.'],
  ['Disappointed', 2, 'Mine arrived with a dead pixel and support took nine days to reply. The product itself is fine.'],
  ['Would recommend', 5, 'Third one I have bought, two for the office. That should tell you enough.'],
  ['Fine but overpriced', 3, 'No complaints about how it works. I just think it should cost about thirty percent less.']
];

/** Deterministic per product, so the same product always shows the same reviews. */
function seedReviewsFor(productId: string) {
  const n = (productId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 4) + 3;
  return Array.from({ length: n }, (_, i) => {
    const [title, rating, body] = HEADLINES[(productId.length + i * 3) % HEADLINES.length];
    return {
      product_id: productId,
      author: AUTHORS[(productId.length + i * 5) % AUTHORS.length],
      rating: rating as number,
      title: title as string,
      body: body as string
    };
  });
}

async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          SERIAL PRIMARY KEY,
        product_id  VARCHAR(50) NOT NULL,
        author      VARCHAR(120) NOT NULL,
        rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title       VARCHAR(200) NOT NULL,
        body        TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
    `);
    dbReady = true;
    console.log('[ReviewService] Schema ready');
  } catch (err: any) {
    dbReady = false;
    console.warn(`[ReviewService] Postgres unavailable (${err.message}); generating reviews in memory`);
  }
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'review-service', database: dbReady });
});

app.get('/reviews/:productId', async (req: Request, res: Response) => {
  const productId = String(req.params.productId);

  if (normalizeHeader(req.headers['x-simulate-slow']) === 'true') {
    console.warn('[ReviewService] Simulated slow review query (1.5s)');
    await sleep(1500);
  }

  try {
    if (dbReady) {
      let { rows } = await pool.query(
        'SELECT author, rating, title, body, created_at FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
        [productId]
      );

      // First view of a product materialises its reviews, so the table fills as the
      // catalogue is browsed rather than needing a separate seed step.
      if (rows.length === 0) {
        for (const r of seedReviewsFor(productId)) {
          await pool.query(
            'INSERT INTO reviews (product_id, author, rating, title, body) VALUES ($1,$2,$3,$4,$5)',
            [r.product_id, r.author, r.rating, r.title, r.body]
          );
        }
        rows = (await pool.query(
          'SELECT author, rating, title, body, created_at FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
          [productId]
        )).rows;
      }

      const average = rows.reduce((s: number, r: any) => s + r.rating, 0) / (rows.length || 1);
      return res.json({ productId, count: rows.length, average: Number(average.toFixed(2)), reviews: rows });
    }

    const seeded = seedReviewsFor(productId);
    const average = seeded.reduce((s, r) => s + r.rating, 0) / seeded.length;
    res.json({ productId, count: seeded.length, average: Number(average.toFixed(2)), reviews: seeded });
  } catch (err: any) {
    console.error(`[ReviewService] Failed to load reviews for ${productId}: ${err.message}`);
    res.status(500).json({ error: 'Failed to load reviews', message: err.message });
  }
});

app.post('/reviews', async (req: Request, res: Response) => {
  const { productId, author = 'Anonymous', rating = 5, title = '', body = '' } = req.body || {};
  if (!productId) return res.status(400).json({ error: 'productId is required' });
  if (Number(rating) < 1 || Number(rating) > 5) {
    return res.status(422).json({ error: 'rating must be between 1 and 5', received: rating });
  }

  try {
    if (dbReady) {
      await pool.query(
        'INSERT INTO reviews (product_id, author, rating, title, body) VALUES ($1,$2,$3,$4,$5)',
        [productId, author, Number(rating), title || 'Review', body]
      );
    }
    console.log(`[ReviewService] Recorded ${rating}-star review for ${productId}`);
    res.status(201).json({ status: 'created', productId, rating: Number(rating) });
  } catch (err: any) {
    console.error(`[ReviewService] Failed to record review: ${err.message}`);
    res.status(500).json({ error: 'Failed to record review', message: err.message });
  }
});

async function start() {
  await ensureSchema();
  app.listen(port, () => console.log(`Review Service listening on port ${port}`));
}

start();
