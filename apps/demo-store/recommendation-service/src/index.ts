import { initTracing, patchConsoleLogs, bodyCaptureMiddleware } from '../lib/telemetry/index';
import express, { Request, Response } from 'express';
import http from 'http';

initTracing('recommendation-service');
patchConsoleLogs('recommendation-service');

const app = express();
const port = process.env.PORT || 3006;
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3004';
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://localhost:3005';

app.use(express.json());
app.use(bodyCaptureMiddleware);

function normalizeHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Forwards trace context and simulation flags so a recommendation is one trace. */
function forwardHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  for (const h of ['traceparent', 'x-replay-mode', 'x-simulate-slow', 'x-simulate-503', 'x-simulate-cache-miss']) {
    const v = normalizeHeader(req.headers[h]);
    if (v) headers[h] = v;
  }
  return headers;
}

function getJson(url: string, headers: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if ((res.statusCode || 500) >= 400) {
            return reject(new Error(`${url} responded ${res.statusCode}`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (err: any) {
            reject(new Error(`${url} returned non-JSON: ${err.message}`));
          }
        });
      }
    );
    request.on('error', reject);
    request.setTimeout(10000, () => request.destroy(new Error(`${url} timed out`)));
    request.end();
  });
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'recommendation-service' });
});

/**
 * Fans out to the catalogue and the review service, then ranks. This is the deepest
 * call chain in the demo: gateway -> recommendation -> {catalog -> postgres/redis,
 * review -> postgres}, which is what makes the topology graph worth looking at.
 */
app.get('/recommendations/:productId', async (req: Request, res: Response) => {
  const productId = String(req.params.productId);
  const headers = forwardHeaders(req);

  if (normalizeHeader(req.headers['x-simulate-slow']) === 'true') {
    console.warn('[RecommendationService] Simulated ranking delay (1.2s)');
    await sleep(1200);
  }

  try {
    const product = await getJson(`${CATALOG_SERVICE_URL}/products/${productId}`, headers);
    const sameCategory = await getJson(
      `${CATALOG_SERVICE_URL}/products?category=${encodeURIComponent(product.category)}&sort=rating`,
      headers
    );

    const candidates = (sameCategory.products || []).filter((p: any) => p.id !== productId).slice(0, 6);

    // Enrich the top candidates with live review data. Deliberately sequential so the
    // waterfall shows each dependency as its own span rather than one blur.
    const enriched: any[] = [];
    for (const candidate of candidates.slice(0, 4)) {
      try {
        const reviews = await getJson(`${REVIEW_SERVICE_URL}/reviews/${candidate.id}`, headers);
        enriched.push({ ...candidate, reviewAverage: reviews.average, reviewCount: reviews.count });
      } catch (err: any) {
        // One unavailable dependency degrades a recommendation, it does not fail it.
        console.warn(`[RecommendationService] Review lookup failed for ${candidate.id}: ${err.message}`);
        enriched.push({ ...candidate, reviewAverage: candidate.rating, reviewCount: candidate.review_count });
      }
    }

    const ranked = enriched.sort(
      (a, b) => b.reviewAverage * Math.log10(b.reviewCount + 10) - a.reviewAverage * Math.log10(a.reviewCount + 10)
    );

    console.log(`[RecommendationService] Ranked ${ranked.length} recommendations for ${productId}`);
    res.json({ productId, basedOn: product.category, recommendations: ranked });
  } catch (err: any) {
    console.error(`[RecommendationService] Failed for ${productId}: ${err.message}`);
    res.status(502).json({ error: 'Failed to build recommendations', message: err.message });
  }
});

app.listen(port, () => console.log(`Recommendation Service listening on port ${port}`));
