export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
/**
 * Creates a trace-context aware logger function object matching dev1.md §6.4.
 */
export declare function createLogger(serviceName?: string): {
    info(message: string, meta?: Record<string, unknown>): void;
    error(message: string, error?: Error, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
};
/**
 * Monkey-patches native console logging methods (log, info, warn, error)
 * to output structured JSON logs injected with active OpenTelemetry trace_id and span_id.
 */
export declare function patchConsoleLogs(serviceName?: string): void;
//# sourceMappingURL=logger.d.ts.map