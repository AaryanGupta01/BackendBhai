import { initTracing, patchConsoleLogs, bodyCaptureMiddleware } from '../lib/telemetry/index';
import express, { Request, Response } from 'express';
import { maybeInjectAuthTimeout } from './failures';

// Express header values can be string | string[]; simulation flags are single-valued.
function normalizeHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

// Initialize telemetry BEFORE anything else
initTracing('auth-service');
patchConsoleLogs('auth-service');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(bodyCaptureMiddleware);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.post('/auth/verify', async (req: Request, res: Response) => {
  const authHeader = (req.headers.authorization || req.body.token || '') as string;
  console.log(`[AuthService] Verifying auth header: "${authHeader.substring(0, 25)}..."`);

  try {
    // S-08: Injects 5s timeout error when token is invalid or malformed.
    // The gateway forwards the global simulation mode as a header.
    const simulationHeaders: Record<string, string | undefined> = {
      'x-simulate-invalid-auth': normalizeHeader(req.headers['x-simulate-invalid-auth'])
    };
    await maybeInjectAuthTimeout(authHeader, simulationHeaders);

    // Default fast path for valid tokens
    return res.status(200).json({
      valid: true,
      userId: 'user-42',
      email: 'user-42@example.com',
      role: 'customer'
    });
  } catch (err: any) {
    console.error('[AuthService] Authentication rejected:', err.message);
    return res.status(401).json({
      valid: false,
      error: 'Unauthorized',
      message: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Auth Service listening on port ${port}`);
});
