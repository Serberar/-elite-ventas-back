import { prisma } from '@infrastructure/prisma/prismaClient';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { dbCircuitBreaker } from '@infrastructure/resilience';
import { cacheService, CACHE_KEYS } from '@infrastructure/cache/CacheService';

export class SaleStatusPrismaRepository implements ISaleStatusRepository {
  private invalidateCache(): void {
    cacheService.invalidatePattern('sale_statuses');
  }

  async findById(id: string): Promise<SaleStatus | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleStatus.findUnique({ where: { id } })
    );
    return row ? SaleStatus.fromPrisma(row) : null;
  }

  async list(empresaId: string): Promise<SaleStatus[]> {
    return cacheService.getOrSet(
      `${CACHE_KEYS.SALE_STATUSES}:${empresaId}`,
      async () => {
        const rows = await dbCircuitBreaker.execute(() =>
          prisma.saleStatus.findMany({ where: { empresaId }, orderBy: { order: 'asc' } })
        );
        return rows.map((r) => SaleStatus.fromPrisma(r));
      },
      300 // 5 minutos
    );
  }

  async findInitialStatus(empresaId: string): Promise<SaleStatus | null> {
    return cacheService.getOrSet(
      `${CACHE_KEYS.SALE_STATUS_INITIAL}:${empresaId}`,
      async () => {
        const row = await dbCircuitBreaker.execute(() =>
          prisma.saleStatus.findFirst({
            orderBy: { order: 'asc' },
            where: { isFinal: false, empresaId }
          })
        );
        return row ? SaleStatus.fromPrisma(row) : null;
      },
      300 // 5 minutos
    );
  }

  async create(data: {
    name: string;
    order: number;
    color?: string | null;
    isFinal?: boolean;
    isCancelled?: boolean;
    empresaId: string;
  }): Promise<SaleStatus> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleStatus.create({
        data: {
          name: data.name,
          order: data.order,
          color: data.color ?? null,
          isFinal: data.isFinal ?? false,
          isCancelled: data.isCancelled ?? false,
          empresaId: data.empresaId,
        },
      })
    );

    this.invalidateCache();
    return SaleStatus.fromPrisma(row);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      order: number;
      color?: string | null;
      isFinal?: boolean;
      isCancelled?: boolean;
    }>
  ): Promise<SaleStatus> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleStatus.update({
        where: { id },
        data: {
          name: data.name,
          order: data.order,
          color: data.color,
          isFinal: data.isFinal,
          isCancelled: data.isCancelled,
        },
      })
    );

    this.invalidateCache();
    return SaleStatus.fromPrisma(row);
  }

  async reorder(orderList: { id: string; order: number }[]): Promise<SaleStatus[]> {
    // La transacción se ejecuta dentro del circuit breaker
    await dbCircuitBreaker.execute(async () => {
      const ops = orderList.map((o) =>
        prisma.saleStatus.update({
          where: { id: o.id },
          data: { order: o.order },
        })
      );
      return prisma.$transaction(ops);
    });

    this.invalidateCache();

    // Devolver lista actualizada ordenada
    const rows = await dbCircuitBreaker.execute(() =>
      prisma.saleStatus.findMany({ orderBy: { order: 'asc' } })
    );
    return rows.map((r) => SaleStatus.fromPrisma(r));
  }

  async delete(id: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.saleStatus.delete({ where: { id } })
    );
    this.invalidateCache();
  }
}
