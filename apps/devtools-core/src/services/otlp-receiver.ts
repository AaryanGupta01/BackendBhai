import { TraceRepository } from '../db/repositories/trace-repository.js';
import { redactSpanAttributes, redactHeaders, redactBody } from './redactor.js';
import { wsHandler } from '../ws/handler.js';

const repo = new TraceRepository();

export class OtlpReceiver {
  async processSyntheticTrace(payload: any) {
    // Basic implementation for synthetic payload from fixtures
    const trace = payload.trace;
    if (trace) {
      trace.request_headers = redactHeaders(trace.request_headers);
      trace.response_headers = redactHeaders(trace.response_headers);
      trace.request_body = redactBody(trace.request_body);
      trace.response_body = redactBody(trace.response_body);
      await repo.insertTrace(trace);
      
      // Phase 4: WS Integration
      wsHandler.broadcastNewRequest(trace);
    }
    
    if (payload.spans) {
      const spans = payload.spans.map((s: any) => ({
        ...s,
        attributes: redactSpanAttributes(s.attributes)
      }));
      await repo.insertSpans(spans);
    }

    if (payload.logs) {
      await repo.insertLogEvents(payload.logs);
    }
  }

  // TODO: Add full OTLP JSON parsing for real Collector data
}
