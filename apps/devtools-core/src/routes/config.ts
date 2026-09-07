import { FastifyInstance } from 'fastify';

/**
 * Runtime configuration for the UI. The frontend resolves its own API and WebSocket
 * URLs from the origin it was served on, so nothing about a particular product is
 * compiled into the bundle. Anything product-specific arrives here from the
 * environment, which is what lets one platform instance front different products.
 */
export default async function (fastify: FastifyInstance) {
  fastify.get('/api/v1/config', async (_request, reply) => {
    return reply.send({
      version: process.env.APP_VERSION || '0.1.0',
      // A label for whatever product this instance is watching.
      product: {
        name: process.env.PRODUCT_NAME || null,
        // Used as the default target for replay and endpoint probing when a trace
        // does not carry its own origin.
        baseUrl: process.env.PRODUCT_BASE_URL || null
      },
      // Where a product should send telemetry to be picked up by this instance.
      ingest: {
        otlpHttpUrl: process.env.PUBLIC_OTLP_HTTP_URL || null,
        otlpGrpcUrl: process.env.PUBLIC_OTLP_GRPC_URL || null,
        directOtlpPath: '/v1/traces'
      },
      features: {
        // Active probing can send traffic to a real product, so the UI needs to know
        // whether this deployment permits mutating verbs at all.
        allowMutatingProbes: process.env.ALLOW_MUTATING_PROBES === 'true'
      },
      serverTime: new Date().toISOString()
    });
  });
}
