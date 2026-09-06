"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.patchConsoleLogs = patchConsoleLogs;
const api_1 = require("@opentelemetry/api");
let patched = false;
const originalConsoleLog = console.log.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);
const originalConsoleDebug = console.debug.bind(console);
/**
 * Creates a trace-context aware logger function object matching dev1.md §6.4.
 */
function createLogger(serviceName = process.env.SERVICE_NAME || 'unknown-service') {
    return {
        info(message, meta) {
            const spanContext = api_1.trace.getActiveSpan()?.spanContext();
            const logPayload = {
                level: 'info',
                message,
                service: serviceName,
                service_name: serviceName,
                trace_id: spanContext?.traceId ?? null,
                span_id: spanContext?.spanId ?? null,
                timestamp: new Date().toISOString(),
                ...meta,
            };
            originalConsoleLog(JSON.stringify(logPayload));
        },
        error(message, error, meta) {
            const spanContext = api_1.trace.getActiveSpan()?.spanContext();
            const logPayload = {
                level: 'error',
                message,
                service: serviceName,
                service_name: serviceName,
                trace_id: spanContext?.traceId ?? null,
                span_id: spanContext?.spanId ?? null,
                timestamp: new Date().toISOString(),
                error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
                ...meta,
            };
            originalConsoleError(JSON.stringify(logPayload));
        },
        warn(message, meta) {
            const spanContext = api_1.trace.getActiveSpan()?.spanContext();
            const logPayload = {
                level: 'warn',
                message,
                service: serviceName,
                service_name: serviceName,
                trace_id: spanContext?.traceId ?? null,
                span_id: spanContext?.spanId ?? null,
                timestamp: new Date().toISOString(),
                ...meta,
            };
            originalConsoleWarn(JSON.stringify(logPayload));
        },
        debug(message, meta) {
            const spanContext = api_1.trace.getActiveSpan()?.spanContext();
            const logPayload = {
                level: 'debug',
                message,
                service: serviceName,
                service_name: serviceName,
                trace_id: spanContext?.traceId ?? null,
                span_id: spanContext?.spanId ?? null,
                timestamp: new Date().toISOString(),
                ...meta,
            };
            originalConsoleDebug(JSON.stringify(logPayload));
        }
    };
}
/**
 * Monkey-patches native console logging methods (log, info, warn, error)
 * to output structured JSON logs injected with active OpenTelemetry trace_id and span_id.
 */
function patchConsoleLogs(serviceName = process.env.SERVICE_NAME || 'unknown-service') {
    if (patched) {
        return;
    }
    const logger = createLogger(serviceName);
    console.log = (...args) => {
        const msg = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
        logger.info(msg);
    };
    console.info = (...args) => {
        const msg = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
        logger.info(msg);
    };
    console.warn = (...args) => {
        const msg = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
        logger.warn(msg);
    };
    console.error = (...args) => {
        const errArg = args.find((a) => a instanceof Error);
        const msg = args.map((arg) => (arg instanceof Error ? arg.message : typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
        logger.error(msg, errArg);
    };
    console.debug = (...args) => {
        const msg = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
        logger.debug(msg);
    };
    patched = true;
    originalConsoleLog(JSON.stringify({
        timestamp: new Date().toISOString(),
        service: serviceName,
        service_name: serviceName,
        level: 'info',
        message: `[Logger] Console monkey-patching initialized for service "${serviceName}"`,
        trace_id: null,
        span_id: null,
    }));
}
//# sourceMappingURL=logger.js.map