import { NodeSDK } from '@opentelemetry/sdk-node';
/**
 * Initializes the OpenTelemetry Node SDK for trace data collection.
 *
 * @param defaultServiceName Service name (e.g. api-gateway, auth-service, order-service, payment-service)
 * @returns The initialized NodeSDK instance
 */
export declare function initTracing(defaultServiceName?: string): NodeSDK;
//# sourceMappingURL=tracing.d.ts.map