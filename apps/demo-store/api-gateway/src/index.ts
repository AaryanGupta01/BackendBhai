import { initTracing, patchConsoleLogs, bodyCaptureMiddleware } from '../lib/telemetry/index';
import express, { Request, Response } from 'express';
import http from 'http';

// Initialize telemetry BEFORE anything else
initTracing('api-gateway');
patchConsoleLogs('api-gateway');

const app = express();
const port = process.env.PORT || 3000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';

app.use(express.json());
app.use(bodyCaptureMiddleware);

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

// Helper for traceparent propagation
function getForwardHeaders(req: Request): Record<string, string> {
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
  // Per-request failure simulation (replaces the removed global chaos state):
  // send x-simulate-slow / x-simulate-503 headers to trigger delays/errors.
  if (req.headers['x-simulate-slow']) {
    headers['x-simulate-slow'] = req.headers['x-simulate-slow'] as string;
  }
  if (req.headers['x-simulate-503']) {
    headers['x-simulate-503'] = req.headers['x-simulate-503'] as string;
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

// GET /api/products
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest(`${ORDER_SERVICE_URL}/products`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch products from order service', message: err.message });
  }
});

// GET /api/orders
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest(`${ORDER_SERVICE_URL}/orders`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch orders from order service', message: err.message });
  }
});

// GET /api/orders/:id
app.get('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const result = await forwardRequest(`${ORDER_SERVICE_URL}/orders/${req.params.id}`, 'GET', getForwardHeaders(req));
    res.status(result.statusCode).json(result.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch order', message: err.message });
  }
});

// POST /api/orders (Checkout — per-request failure simulation via headers)
app.post('/api/orders', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('[APIGateway] Processing POST /api/orders');

  try {
    const authHeaders = getForwardHeaders(req);
    const orderHeaders = getForwardHeaders(req);
    const orderBody = { ...req.body };

    // Default to the demo token when the caller did not send one
    if (!authHeaders['authorization']) {
      authHeaders['authorization'] = 'Bearer token-user-42';
    }

    // 1. Authenticate with Auth Service
    const authResult = await forwardRequest(`${AUTH_SERVICE_URL}/auth/verify`, 'POST', authHeaders, {
      token: authHeaders['authorization']
    });

    if (authResult.statusCode !== 200) {
      return res.status(authResult.statusCode).json({
        error: 'Authentication failed',
        details: authResult.data,
        durationMs: Date.now() - startTime
      });
    }

    // 2. Forward to Order Service
    const orderResult = await forwardRequest(`${ORDER_SERVICE_URL}/orders`, 'POST', orderHeaders, orderBody);

    return res.status(orderResult.statusCode).json({
      ...orderResult.data,
      gatewayDurationMs: Date.now() - startTime
    });
  } catch (err: any) {
    console.error('[APIGateway] Error handling /api/orders:', err.message);
    return res.status(500).json({
      error: 'Gateway routing failure',
      message: err.message,
      durationMs: Date.now() - startTime
    });
  }
});

app.listen(port, () => {
  console.log(`API Gateway listening on port ${port}`);
});
