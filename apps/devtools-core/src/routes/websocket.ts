import { FastifyInstance } from 'fastify';
import { wsHandler } from '../ws/handler.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    wsHandler.handleConnection(connection, req);
  });
}
