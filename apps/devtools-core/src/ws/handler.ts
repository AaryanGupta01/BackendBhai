import { SocketStream } from '@fastify/websocket';
import { FastifyRequest } from 'fastify';

export class WebSocketHandler {
  private clients = new Set<SocketStream>();
  private subscriptions = new Map<SocketStream, Set<string>>();

  handleConnection(connection: SocketStream, request: FastifyRequest) {
    this.clients.add(connection);
    this.subscriptions.set(connection, new Set());
    
    // 1. Send connected event
    connection.socket.send(JSON.stringify({
      type: 'connected',
      data: {
        serverVersion: '0.1.0',
        activeConnections: this.clients.size
      },
      timestamp: new Date().toISOString()
    }));

    connection.socket.on('close', () => {
      this.clients.delete(connection);
      this.subscriptions.delete(connection);
    });
    
    connection.socket.on('message', (message: string) => {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.type === 'subscribe_trace' && msg.data?.traceId) {
           this.subscriptions.get(connection)?.add(msg.data.traceId);
        } else if (msg.type === 'unsubscribe_trace' && msg.data?.traceId) {
           this.subscriptions.get(connection)?.delete(msg.data.traceId);
        } else if (message.toString() === 'ping') {
           connection.socket.send('pong');
        }
      } catch {
        // Ignore invalid JSON
      }
    });
  }

  broadcastNewRequest(trace: any) {
    // Map to camelCase RequestSummary exactly like GET /api/v1/requests
    let ts = trace.start_time;
    if (typeof ts === 'string' && /^\d+$/.test(ts)) {
       ts = new Date(parseInt(ts, 10)).toISOString();
    } else if (typeof ts === 'number') {
       ts = new Date(ts).toISOString();
    } else {
       ts = new Date(ts).toISOString();
    }

    const summary = {
      traceId: trace.id,
      method: trace.method,
      path: trace.path,
      statusCode: trace.status_code,
      durationMs: parseInt(trace.duration_ms || '0', 10) || (trace.end_time - trace.start_time),
      timestamp: ts,
      services: trace.services || [],
      rootService: trace.root_service,
      hasError: trace.status_code >= 400 || trace.status === 'error'
    };

    const payload = JSON.stringify({
      type: 'new_request',
      data: summary,
      timestamp: new Date().toISOString()
    });
    for (const client of this.clients) {
      if (client.socket.readyState === 1 /* WebSocket.OPEN */) {
        client.socket.send(payload);
      }
    }
  }
}

export const wsHandler = new WebSocketHandler();
