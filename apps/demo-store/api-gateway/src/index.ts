import express, { Request, Response } from 'express';
import http from 'http';
import {
  getSimulationState,
  setSimulationState,
  resetSimulationState,
  shouldInjectSimulation
} from './simulation';

const app = express();
const port = process.env.PORT || 3000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:3004';
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://localhost:3005';
const RECOMMENDATION_SERVICE_URL = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3006';

app.use(express.json());

// Enable CORS for demo frontend & amazon store
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Replay-Mode, X-Simulate-Slow, X-Simulate-503, traceparent');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Global failure simulation is owned by ./simulation.ts


// Helper for traceparent propagation
function getForwardHeaders(req: Request, opts?: { applyGlobalSimulation?: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  };
  if (req.headers.authorization) {
    headers['authorization'] = req.headers.authorization as string;
  }
  if (req.headers.traceparent) {
    headers['traceparent'] = req.headers.traceparent as string;
  }
  if (req.headers['x-replay-mode']) {
    headers['x-replay-mode'] = req.headers['x-replay-mode'] as string;
  }
  if (req.headers['x-simulate-slow']) {
    headers['x-simulate-slow'] = req.headers['x-simulate-slow'] as string;
  }
  for (const flag of ['x-simulate-cache-miss', 'x-simulate-catalog-503', 'x-simulate-reviews-503', 'x-simulate-browse-slow']) {
    const v = req.headers[flag];
    if (v) headers[flag] = Array.isArray(v) ? v[0] : (v as string);
  }
  if (req.headers['x-simulate-503']) {
    headers['x-simulate-503'] = req.headers['x-simulate-503'] as string;
  }
  if (req.headers['x-simulate-mode']) {
    headers['x-simulate-mode'] = req.headers['x-simulate-mode'] as string;
  }

  // Translate the active global mode into the per-hop headers the downstream
  // services already understand. A header on the incoming request wins, so a
  // single call can still opt out of whatever the simulator has set.
  if (opts?.applyGlobalSimulation !== false) {
    const mode = shouldInjectSimulation({
      'x-simulate-slow': headers['x-simulate-slow'],
      'x-simulate-503': headers['x-simulate-503'],
      'x-simulate-mode': headers['x-simulate-mode']
    });
    if (mode === 'heavy') headers['x-simulate-heavy-order'] = 'true';
    else if (mode === 'invalid-auth') headers['x-simulate-invalid-auth'] = 'true';
    else if (mode === 'payment-503') headers['x-simulate-503'] = 'true';
    else if (mode === 'slow-payment') headers['x-simulate-slow'] = 'true';
    else if (mode === 'cache-miss') headers['x-simulate-cache-miss'] = 'true';
    else if (mode === 'catalog-503') headers['x-simulate-catalog-503'] = 'true';
    else if (mode === 'reviews-503') headers['x-simulate-reviews-503'] = 'true';
    else if (mode === 'browse-slow') headers['x-simulate-browse-slow'] = 'true';
  }

  return headers;
}

// Simple HTTP client using native Node http
function forwardRequest(urlStr: string, method: string, headers: Record<string, string>, body?: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsedData: any = data;
        try {
          parsedData = JSON.parse(data);
        } catch (_) {}
        resolve({ statusCode: res.statusCode || 200, data: parsedData });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// Global simulation control surface. Product-agnostic: the Failure Simulator sets a
// mode here and every request through the gateway picks it up, including orders
// placed on the storefront.
app.get('/api/simulation/state', (_req: Request, res: Response) => {
  res.json(getSimulationState());
});

app.post('/api/simulation/state', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const next = getSimulationState();
    const updated = setSimulationState({
      mode: body.mode ?? undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined
    });
    console.log(`[APIGateway] Global simulation mode: ${next.mode} -> ${updated.mode}`);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: 'Invalid simulation state update', message: err.message });
  }
});

app.post('/api/simulation/reset', (_req: Request, res: Response) => {
  res.json(resetSimulationState());
});

// GET /api/products
app.get('/api/products', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const result = await forwardRequest(`${ORDER_SERVICE_URL}/products`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch products from order service', message: err.message });
  }
});

// GET /api/orders
app.get('/api/orders', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const result = await forwardRequest(`${ORDER_SERVICE_URL}/orders`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch orders from order service', message: err.message });
  }
});

// GET /api/orders/:id
app.get('/api/orders/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const result = await forwardRequest(`${ORDER_SERVICE_URL}/orders/${req.params.id}`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch order', message: err.message });
  }
});

// POST /api/orders (checkout; simulation arrives via forwarded headers)
app.post('/api/orders', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`[APIGateway] Processing POST /api/orders (simulation: ${getSimulationState().mode})`);

  try {
    const authHeaders = getForwardHeaders(req);
    const orderHeaders = getForwardHeaders(req);
    const orderBody = { ...req.body };

    // Simulation is already encoded in the forwarded headers by getForwardHeaders,
    // and each downstream service decides what to do with it.
    if (!authHeaders['authorization']) {
      authHeaders['authorization'] = 'Bearer token-user-42';
    }

    // 1. Authenticate with Auth Service
    const authResult = await forwardRequest(`${AUTH_SERVICE_URL}/auth/verify`, 'POST', authHeaders, {
      token: authHeaders['authorization']
    });

    if (authResult.statusCode !== 200) {
      const duration = Date.now() - startTime;

      return res.status(authResult.statusCode).json({
        error: 'Authentication failed',
        details: authResult.data,
        simulationMode: getSimulationState().mode,
        durationMs: duration
      });
    }

    // 2. Forward to Order Service
    const orderResult = await forwardRequest(`${ORDER_SERVICE_URL}/orders`, 'POST', orderHeaders, orderBody);

    const duration = Date.now() - startTime;

    return res.status(orderResult.statusCode).json({
      ...orderResult.data,
      simulationMode: getSimulationState().mode,
      gatewayDurationMs: duration
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error('[APIGateway] Error handling /api/orders:', err.message);
    

    return res.status(500).json({
      error: 'Gateway routing failure',
      message: err.message,
      simulationMode: getSimulationState().mode,
      durationMs: duration
    });
  }
});

// Telemetry is emitted by the OpenTelemetry SDK, not pushed by hand. The previous
// emitTelemetry() helper POSTed a fabricated summary to localhost:4001 - a port
// nothing listens on inside this container - which failed on every request and
// added a bogus "localhost" dependency to the discovered topology.


// ─── Storefront read paths ─────────────────────────────────────────────
// Each of these is a distinct call chain, which is what gives the topology graph
// something worth showing: catalogue reads hit Postgres through a Redis cache, and
// recommendations fan out to two services before returning.

app.get('/api/catalog/categories', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest(`${CATALOG_SERVICE_URL}/categories`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Catalog service unavailable', message: err.message });
  }
});

app.get('/api/catalog/search', async (req: Request, res: Response) => {
  const q = encodeURIComponent(String(req.query.q || ''));
  try {
    const result = await forwardRequest(`${CATALOG_SERVICE_URL}/search?q=${q}`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Search unavailable', message: err.message });
  }
});

app.get('/api/catalog/products/:id', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest(`${CATALOG_SERVICE_URL}/products/${req.params.id}`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Catalog service unavailable', message: err.message });
  }
});

app.get('/api/catalog/products', async (req: Request, res: Response) => {
  const category = encodeURIComponent(String(req.query.category || 'all'));
  const sort = encodeURIComponent(String(req.query.sort || 'featured'));
  try {
    const result = await forwardRequest(
      `${CATALOG_SERVICE_URL}/products?category=${category}&sort=${sort}`,
      'GET',
      getForwardHeaders(req)
    );
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Catalog service unavailable', message: err.message });
  }
});

app.get('/api/products/:id/reviews', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest(`${REVIEW_SERVICE_URL}/reviews/${req.params.id}`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Review service unavailable', message: err.message });
  }
});

app.post('/api/products/:id/reviews', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest(`${REVIEW_SERVICE_URL}/reviews`, 'POST', getForwardHeaders(req), {
      ...req.body,
      productId: req.params.id
    });
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Review service unavailable', message: err.message });
  }
});

app.get('/api/products/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest(
      `${RECOMMENDATION_SERVICE_URL}/recommendations/${req.params.id}`,
      'GET',
      getForwardHeaders(req)
    );
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Recommendation service unavailable', message: err.message });
  }
});

app.listen(port, () => {
  console.log(`API Gateway listening on port ${port}`);
});
