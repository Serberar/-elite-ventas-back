import { prisma } from '@infrastructure/prisma/prismaClient';
import { Product } from '@domain/entities/Product';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { dbCircuitBreaker } from '@infrastructure/resilience';
import {
  PaginationOptions,
  PaginatedResponse,
  calculateOffset,
  buildPaginationMeta,
} from '@domain/types';
import { cacheService, CACHE_KEYS } from '@infrastructure/cache/CacheService';

export class ProductPrismaRepository implements IProductRepository {
  private invalidateCache(): void {
    cacheService.invalidatePattern('products');
  }

  async findAll(): Promise<Product[]> {
    return cacheService.getOrSet(
      CACHE_KEYS.PRODUCTS,
      async () => {
        const rows = await dbCircuitBreaker.execute(() =>
          prisma.product.findMany({
            orderBy: { name: 'asc' },
          })
        );
        return rows.map((row) => Product.fromPrisma(row));
      },
      300 // 5 minutos
    );
  }

  async findAllPaginated(pagination: PaginationOptions): Promise<PaginatedResponse<Product>> {
    const [rows, total] = await dbCircuitBreaker.execute(() =>
      Promise.all([
        prisma.product.findMany({
          orderBy: { name: 'asc' },
          skip: calculateOffset(pagination.page, pagination.limit),
          take: pagination.limit,
        }),
        prisma.product.count(),
      ])
    );

    return {
      data: rows.map((row) => Product.fromPrisma(row)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async findById(id: string): Promise<Product | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.product.findUnique({
        where: { id },
      })
    );

    return row ? Product.fromPrisma(row) : null;
  }

  async findBySKU(sku: string): Promise<Product | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.product.findUnique({
        where: { sku },
      })
    );

    return row ? Product.fromPrisma(row) : null;
  }

  async create(data: Partial<Product>): Promise<Product> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.product.create({
        data: {
          name: data.name!,
          description: data.description ?? null,
          sku: data.sku ?? null,
          price: data.price!,
          active: true,
          tipo: data.tipo ?? 'unico',
          periodo: data.periodo ?? null,
          precioBase: data.precioBase ?? null,
          precioConsumo: data.precioConsumo ?? null,
          unidadConsumo: data.unidadConsumo ?? null,
        },
      })
    );

    this.invalidateCache();
    return Product.fromPrisma(row);
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          sku: data.sku,
          price: data.price,
          ...(data.tipo !== undefined && { tipo: data.tipo }),
          ...(data.periodo !== undefined && { periodo: data.periodo }),
          ...(data.precioBase !== undefined && { precioBase: data.precioBase }),
          ...(data.precioConsumo !== undefined && { precioConsumo: data.precioConsumo }),
          ...(data.unidadConsumo !== undefined && { unidadConsumo: data.unidadConsumo }),
        },
      })
    );

    this.invalidateCache();
    return Product.fromPrisma(row);
  }

  async toggleActive(id: string): Promise<Product> {
    const current = await dbCircuitBreaker.execute(() =>
      prisma.product.findUnique({
        where: { id },
        select: { active: true },
      })
    );

    if (!current) {
      throw new Error(`Product ${id} not found`);
    }

    const updated = await dbCircuitBreaker.execute(() =>
      prisma.product.update({
        where: { id },
        data: {
          active: !current.active,
        },
      })
    );

    this.invalidateCache();
    return Product.fromPrisma(updated);
  }
}
