import { buildApp } from '../src/app';
import { db } from '../src/db/database';
import { FastifyInstance } from 'fastify';

describe('Product CRUD API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    db.clear();
  });


  describe('Full product lifecycle', () => {
    it('should complete a full create → read → update → delete cycle', async () => {
      const listRes = await app.inject({ method: 'GET', url: '/api/products' });
      expect(listRes.statusCode).toBe(200);
      expect(JSON.parse(listRes.body)).toEqual([]);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: {
          name: 'Laptop',
          description: 'A powerful laptop',
          price: 999.99,
          category: 'electronics',
          inStock: true,
        },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.body);
      expect(created).toMatchObject({
        name: 'Laptop',
        description: 'A powerful laptop',
        price: 999.99,
        category: 'electronics',
        inStock: true,
      });
      expect(created.id).toBeDefined();
      const productId = created.id;

      const getRes = await app.inject({ method: 'GET', url: `/api/products/${productId}` });
      expect(getRes.statusCode).toBe(200);
      expect(JSON.parse(getRes.body)).toEqual(created);

      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/products/${productId}`,
        payload: {
          name: 'Laptop Pro',
          description: 'An even more powerful laptop',
          price: 1299.99,
          category: 'electronics',
          inStock: false,
        },
      });
      expect(updateRes.statusCode).toBe(200);
      const updated = JSON.parse(updateRes.body);
      expect(updated.id).toBe(productId);
      expect(updated.name).toBe('Laptop Pro');
      expect(updated.price).toBe(1299.99);
      expect(updated.inStock).toBe(false);

      const deleteRes = await app.inject({ method: 'DELETE', url: `/api/products/${productId}` });
      expect(deleteRes.statusCode).toBe(204);

      const afterDeleteRes = await app.inject({ method: 'GET', url: `/api/products/${productId}` });
      expect(afterDeleteRes.statusCode).toBe(404);
      expect(JSON.parse(afterDeleteRes.body).error).toMatch(/not found/i);
    });
  });


  describe('POST /api/products – validation', () => {
    it('should return 400 when required fields are missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: { name: 'Book' },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toMatch(/validation failed/i);
    });

    it('should return 400 when price is zero', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: { name: 'Book', description: 'A book', price: 0, category: 'books', inStock: true },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when price is negative', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: { name: 'Book', description: 'A book', price: -5, category: 'books', inStock: true },
      });
      expect(res.statusCode).toBe(400);
    });
  });


  describe('UUID validation', () => {
    it('should return 400 for invalid UUID on GET', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/products/not-a-uuid' });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toMatch(/invalid productid/i);
    });

    it('should return 400 for invalid UUID on PUT', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/products/bad-id',
        payload: { name: 'x', description: 'x', price: 1, category: 'x', inStock: true },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid UUID on DELETE', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/products/123' });
      expect(res.statusCode).toBe(400);
    });
  });


  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await app.inject({ method: 'GET', url: '/some/unknown/route' });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toMatch(/route not found/i);
    });

    it('should return 404 for valid UUID that does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/products/00000000-0000-0000-0000-000000000000',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/products – list', () => {
    it('should return all created products', async () => {
      const items = [
        { name: 'Phone', description: 'A smartphone', price: 699, category: 'electronics', inStock: true },
        { name: 'Shirt', description: 'A cotton shirt', price: 29.99, category: 'clothing', inStock: false },
      ];

      for (const item of items) {
        await app.inject({ method: 'POST', url: '/api/products', payload: item });
      }

      const res = await app.inject({ method: 'GET', url: '/api/products' });
      expect(res.statusCode).toBe(200);
      const list = JSON.parse(res.body);
      expect(list).toHaveLength(2);
      expect(list.map((p: { name: string }) => p.name)).toEqual(
        expect.arrayContaining(['Phone', 'Shirt'])
      );
    });
  });
});
