"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bodyCaptureMiddleware = void 0;
const api_1 = require("@opentelemetry/api");
const MAX_BODY_SIZE_BYTES = 64 * 1024; // 64 KB limit
/**
 * Safely converts a payload into a string representation and truncates it to 64KB.
 */
function serializeAndTruncate(payload) {
    if (payload === undefined || payload === null) {
        return undefined;
    }
    try {
        let strPayload;
        if (typeof payload === 'string') {
            strPayload = payload;
        }
        else if (Buffer.isBuffer(payload)) {
            strPayload = payload.toString('utf-8');
        }
        else {
            strPayload = JSON.stringify(payload);
        }
        if (strPayload.length > MAX_BODY_SIZE_BYTES) {
            return strPayload.substring(0, MAX_BODY_SIZE_BYTES) + '... [TRUNCATED at 64KB]';
        }
        return strPayload;
    }
    catch (error) {
        return '[Unserializable Payload]';
    }
}
/**
 * Express middleware to capture req.body and res.send/res.json bodies
 * as custom OpenTelemetry span attributes with a strict 64KB truncation limit.
 */
const bodyCaptureMiddleware = (req, res, next) => {
    const span = api_1.trace.getActiveSpan();
    if (span && span.isRecording()) {
        if (req.body) {
            const capturedReqBody = serializeAndTruncate(req.body);
            if (capturedReqBody !== undefined) {
                span.setAttribute('custom.http.request.body', capturedReqBody);
            }
        }
        let responseCaptured = false;
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (!responseCaptured && span.isRecording()) {
                const capturedResBody = serializeAndTruncate(body);
                if (capturedResBody !== undefined) {
                    span.setAttribute('custom.http.response.body', capturedResBody);
                    responseCaptured = true;
                }
            }
            return originalJson(body);
        };
        const originalSend = res.send.bind(res);
        res.send = function (body) {
            if (!responseCaptured && span.isRecording()) {
                const capturedResBody = serializeAndTruncate(body);
                if (capturedResBody !== undefined) {
                    span.setAttribute('custom.http.response.body', capturedResBody);
                    responseCaptured = true;
                }
            }
            return originalSend(body);
        };
    }
    next();
};
exports.bodyCaptureMiddleware = bodyCaptureMiddleware;
//# sourceMappingURL=bodyCapture.js.map