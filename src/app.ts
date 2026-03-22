import Fastify from 'fastify';
import { productRoutes } from './routes/products';

export function buildApp() {
  const app = Fastify({ logger: false });

  app.register(productRoutes, { prefix: '/api/products' });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: 'Route not found' });
  });

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    reply.code(500).send({ error: 'Internal server error' });
  });

  return app;
}
