import type { RequestHandler } from 'express';
/**
 * Express middleware to capture req.body and res.send/res.json bodies
 * as custom OpenTelemetry span attributes with a strict 64KB truncation limit.
 */
export declare const bodyCaptureMiddleware: RequestHandler;
//# sourceMappingURL=bodyCapture.d.ts.map