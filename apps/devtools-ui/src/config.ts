/**
 * Runtime configuration.
 *
 * The UI is served by the platform itself, so its API and WebSocket URLs are derived
 * from the origin the page was loaded from. Nothing about a deployment or a monitored
 * product is compiled into the bundle, which is what lets the same build front any
 * installation. An explicit override is still available for local development where
 * the Vite dev server and the platform run on different ports.
 */

declare global {
  interface Window {
    __BACKENDBHAI_API_BASE__?: string;
  }
}

function resolveApiBase(): string {
  if (typeof window !== 'undefined' && window.__BACKENDBHAI_API_BASE__) {
    return window.__BACKENDBHAI_API_BASE__.replace(/\/$/, '');
  }
  const fromEnv = import.meta.env?.VITE_API_BASE_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export const API_BASE = resolveApiBase();

export function websocketUrl(path = '/ws'): string {
  const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = path;
  url.search = '';
  return url.toString();
}

/** Shape of GET /api/v1/config. */
export interface PlatformConfig {
  version: string;
  product: { name: string | null; baseUrl: string | null };
  ingest: { otlpHttpUrl: string | null; otlpGrpcUrl: string | null; directOtlpPath: string };
  features: { allowMutatingProbes: boolean };
  serverTime: string;
}
