import { randomUUID } from 'crypto';
import { Product, ProductInput } from '../types';

class ProductDatabase {
  private products: Map<string, Product> = new Map();

  getAll(): Product[] {
    return Array.from(this.products.values());
  }

  getById(id: string): Product | undefined {
    return this.products.get(id);
  }

  create(input: ProductInput): Product {
    const product: Product = { id: randomUUID(), ...input };
    this.products.set(product.id, product);
    return product;
  }

  update(id: string, input: Partial<ProductInput>): Product | undefined {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated: Product = { ...existing, ...input };
    this.products.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.products.delete(id);
  }

  clear(): void {
    this.products.clear();
  }
}

export const db = new ProductDatabase();
