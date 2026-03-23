import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validate as isUuid } from 'uuid';
import { db } from '../db/database';
import { ProductSchema } from '../types';

interface IdParams {
  productId: string;
}

export async function productRoutes(app: FastifyInstance) {
  app.get('/', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send(db.getAll());
  });

  app.get('/:productId', async (req: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
    const { productId } = req.params;

    if (!isUuid(productId)) {
      return reply.code(400).send({ error: `Invalid productId: "${productId}" is not a valid UUID` });
    }

    const product = db.getById(productId);
    if (!product) {
      return reply.code(404).send({ error: `Product with id "${productId}" not found` });
    }

    return reply.code(200).send(product);
  });

  app.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const result = ProductSchema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(', ');
      return reply.code(400).send({ error: `Validation failed: ${messages}` });
    }

    const product = db.create(result.data);
    return reply.code(201).send(product);
  });

  app.put('/:productId', async (req: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
    const { productId } = req.params;

    if (!isUuid(productId)) {
      return reply.code(400).send({ error: `Invalid productId: "${productId}" is not a valid UUID` });
    }

    const existing = db.getById(productId);
    if (!existing) {
      return reply.code(404).send({ error: `Product with id "${productId}" not found` });
    }

    const result = ProductSchema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(', ');
      return reply.code(400).send({ error: `Validation failed: ${messages}` });
    }

    const updated = db.update(productId, result.data);
    return reply.code(200).send(updated);
  });

  app.delete('/:productId', async (req: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
    const { productId } = req.params;

    if (!isUuid(productId)) {
      return reply.code(400).send({ error: `Invalid productId: "${productId}" is not a valid UUID` });
    }

    const existing = db.getById(productId);
    if (!existing) {
      return reply.code(404).send({ error: `Product with id "${productId}" not found` });
    }

    db.delete(productId);
    return reply.code(204).send();
  });
}
