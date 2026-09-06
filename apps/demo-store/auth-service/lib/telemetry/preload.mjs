// telemetry-preload.mjs
// This file is loaded via `node --import ./telemetry-preload.mjs` BEFORE any other code.
// This ensures OTel auto-instrumentation patches http/express BEFORE they are imported.

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter as OTLPHttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.SERVICE_NAME || 'unknown-service';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317';

let traceExporter;
try {
  if (otlpEndpoint.includes(':4317')) {
    const { OTLPTraceExporter: OTLPGrpcTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-grpc');
    traceExporter = new OTLPGrpcTraceExporter({ url: otlpEndpoint });
  } else {
    traceExporter = new OTLPHttpTraceExporter({ url: otlpEndpoint });
  }
} catch {
  traceExporter = new OTLPHttpTraceExporter({ url: otlpEndpoint });
}

const resource = new Resource({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: '1.0.0',
  'deployment.environment': 'hackathon-demo',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
console.log(`[Preload] OTel SDK started for "${serviceName}" → ${otlpEndpoint}`);

// Graceful shutdown
process.on('SIGTERM', async () => { await sdk.shutdown(); process.exit(0); });
process.on('SIGINT', async () => { await sdk.shutdown(); process.exit(0); });
