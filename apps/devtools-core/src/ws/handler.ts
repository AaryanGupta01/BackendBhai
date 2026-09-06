import { SocketStream } from '@fastify/websocket';
import { FastifyRequest } from 'fastify';

export class WebSocketHandler {
  private clients = new Set<SocketStream>();

  handleConnection(connection: SocketStream, request: FastifyRequest) {
    this.clients.add(connection);
    
    connection.socket.on('close', () => {
      this.clients.delete(connection);
    });
    
    connection.socket.on('message', (message: string) => {
      // In a real app we might handle ping/pong or filter requests here
      if (message.toString() === 'ping') {
        connection.socket.send('pong');
      }
    });
  }

  broadcastNewRequest(trace: any) {
    const payload = JSON.stringify({
      type: 'new_request',
      payload: trace
    });
    for (const client of this.clients) {
      if (client.socket.readyState === 1 /* WebSocket.OPEN */) {
        client.socket.send(payload);
      }
    }
  }
}

export const wsHandler = new WebSocketHandler();
