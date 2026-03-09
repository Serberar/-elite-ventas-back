import { prisma } from '@infrastructure/prisma/prismaClient';
import { Prisma } from '@prisma/client';

import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { Sale } from '@domain/entities/Sale';
import { SaleItem } from '@domain/entities/SaleItem';
import { SaleHistory } from '@domain/entities/SaleHistory';
import { SaleAssignment } from '@domain/entities/SaleAssignment';
import { dbCircuitBreaker } from '@infrastructure/resilience';
import {
  PaginationOptions,
  PaginatedResponse,
  calculateOffset,
  buildPaginationMeta,
} from '@domain/types';

type SaleFilters = {
  clientId?: string;
  statusId?: string;
  from?: Date;
  to?: Date;
  comercial?: string;
};

export class SalePrismaRepository implements ISaleRepository {
  async create(data: {
    clientId: string;
    statusId: string;
    totalAmount?: number;
    notes?: Prisma.JsonValue | Prisma.JsonNullValueInput;
    metadata?: Prisma.JsonValue | Prisma.JsonNullValueInput;

    clientSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput;
    addressSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput;
    comercial?: string | null;
  }): Promise<Sale> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.sale.create({
        data: {
          clientId: data.clientId,
          statusId: data.statusId,
          totalAmount: data.totalAmount ?? 0,
          notes: data.notes ?? Prisma.JsonNull,
          metadata: data.metadata ?? Prisma.JsonNull,
          clientSnapshot: data.clientSnapshot ?? Prisma.JsonNull,
          addressSnapshot: data.addressSnapshot ?? Prisma.JsonNull,
          comercial: data.comercial ?? null,
        },
      })
    );

    return Sale.fromPrisma(row);
  }

  async update(
    saleId: string,
    data: {
      statusId?: string;
      totalAmount?: number;
      notes?: Prisma.JsonValue | Prisma.JsonNullValueInput;
      metadata?: Prisma.JsonValue | Prisma.JsonNullValueInput;
      closedAt?: Date | null;
    }
  ): Promise<Sale> {
    const updated = await dbCircuitBreaker.execute(() =>
      prisma.sale.update({
        where: { id: saleId },
        data: {
          statusId: data.statusId,
          totalAmount: data.totalAmount,
          notes: data.notes ?? Prisma.JsonNull,
          metadata: data.metadata ?? Prisma.JsonNull,
          closedAt: data.closedAt,
        },
      })
    );

    return Sale.fromPrisma(updated);
  }

  async findById(id: string): Promise<Sale | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.sale.findUnique({ where: { id } })
    );
    return row ? Sale.fromPrisma(row) : null;
  }

  async findWithRelations(id: string): Promise<{
    sale: Sale;
    items: SaleItem[];
    assignments: SaleAssignment[];
    histories: SaleHistory[];
    client?: any | null;
    status?: any | null;
    signatureRequest?: any | null;
  } | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.sale.findUnique({
        where: { id },
        include: {
          items: true,
          assignments: true,
          histories: {
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'asc' as const },
          },
          client: true,
          status: true,
          signatureRequest: true,
        },
      })
    );

    if (!row) return null;

    return {
      sale: Sale.fromPrisma(row),
      items: row.items.map((i) => SaleItem.fromPrisma(i)),
      assignments: row.assignments.map((a) => SaleAssignment.fromPrisma(a)),
      histories: row.histories.map((h) => SaleHistory.fromPrisma(h)),
      client: row.client ?? null,
      status: row.status ?? null,
      signatureRequest: row.signatureRequest ?? null,
    };
  }

  async list(filters: SaleFilters): Promise<Sale[]> {
    const rows = await dbCircuitBreaker.execute(() =>
      prisma.sale.findMany({
        where: {
          clientId: filters.clientId,
          statusId: filters.statusId,
          comercial: filters.comercial,
          createdAt:
            filters.from || filters.to
              ? {
                  ...(filters.from ? { gte: filters.from } : {}),
                  ...(filters.to ? { lte: filters.to } : {}),
                }
              : undefined,
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    return rows.map((r) => Sale.fromPrisma(r));
  }

  /**
   * Lista ventas con todas las relaciones en UNA sola query (evita N+1)
   */
  async listWithRelations(filters: SaleFilters): Promise<
    Array<{
      sale: Sale;
      items: SaleItem[];
      assignments: SaleAssignment[];
      histories: SaleHistory[];
      client?: any | null;
      status?: any | null;
      signatureRequest?: any | null;
    }>
  > {
    const rows = await dbCircuitBreaker.execute(() =>
      prisma.sale.findMany({
        where: {
          clientId: filters.clientId,
          statusId: filters.statusId,
          comercial: filters.comercial,
          createdAt:
            filters.from || filters.to
              ? {
                  ...(filters.from ? { gte: filters.from } : {}),
                  ...(filters.to ? { lte: filters.to } : {}),
                }
              : undefined,
        },
        include: {
          items: true,
          assignments: true,
          histories: true,
          client: true,
          status: true,
          signatureRequest: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    );

    return rows.map((row) => ({
      sale: Sale.fromPrisma(row),
      items: row.items.map((i) => SaleItem.fromPrisma(i)),
      assignments: row.assignments.map((a) => SaleAssignment.fromPrisma(a)),
      histories: row.histories.map((h) => SaleHistory.fromPrisma(h)),
      client: row.client ?? null,
      status: row.status ?? null,
      signatureRequest: row.signatureRequest ?? null,
    }));
  }

  async listPaginated(
    filters: SaleFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<Sale>> {
    const where = {
      clientId: filters.clientId,
      statusId: filters.statusId,
      comercial: filters.comercial,
      createdAt:
        filters.from || filters.to
          ? {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            }
          : undefined,
    };

    const [rows, total] = await dbCircuitBreaker.execute(() =>
      Promise.all([
        prisma.sale.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: calculateOffset(pagination.page, pagination.limit),
          take: pagination.limit,
        }),
        prisma.sale.count({ where }),
      ])
    );

    return {
      data: rows.map((r) => Sale.fromPrisma(r)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  /**
   * Lista ventas paginadas con relaciones en UNA sola query (evita N+1)
   */
  async listPaginatedWithRelations(
    filters: SaleFilters,
    pagination: PaginationOptions
  ): Promise<
    PaginatedResponse<{
      sale: Sale;
      items: SaleItem[];
      assignments: SaleAssignment[];
      histories: SaleHistory[];
      client?: any | null;
      status?: any | null;
      signatureRequest?: any | null;
    }>
  > {
    const where = {
      clientId: filters.clientId,
      statusId: filters.statusId,
      comercial: filters.comercial,
      createdAt:
        filters.from || filters.to
          ? {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            }
          : undefined,
    };

    const [rows, total] = await dbCircuitBreaker.execute(() =>
      Promise.all([
        prisma.sale.findMany({
          where,
          include: {
            items: true,
            assignments: true,
            histories: true,
            client: true,
            status: true,
            signatureRequest: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: calculateOffset(pagination.page, pagination.limit),
          take: pagination.limit,
        }),
        prisma.sale.count({ where }),
      ])
    );

    return {
      data: rows.map((row) => ({
        sale: Sale.fromPrisma(row),
        items: row.items.map((i) => SaleItem.fromPrisma(i)),
        assignments: row.assignments.map((a) => SaleAssignment.fromPrisma(a)),
        histories: row.histories.map((h) => SaleHistory.fromPrisma(h)),
        client: row.client ?? null,
        status: row.status ?? null,
        signatureRequest: row.signatureRequest ?? null,
      })),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async addItem(
    saleId: string,
    data: {
      productId?: string | null;
      nameSnapshot: string;
      skuSnapshot?: string | null;
      unitPrice: number;
      quantity: number;
      finalPrice: number;
    }
  ): Promise<SaleItem> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleItem.create({
        data: {
          saleId,
          productId: data.productId ?? null,
          nameSnapshot: data.nameSnapshot,
          skuSnapshot: data.skuSnapshot ?? null,
          unitPrice: data.unitPrice,
          quantity: data.quantity,
          finalPrice: data.finalPrice,
        },
      })
    );

    return SaleItem.fromPrisma(row);
  }

  async updateItem(
    itemId: string,
    data: { unitPrice?: number; quantity?: number; finalPrice?: number }
  ): Promise<SaleItem> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleItem.update({
        where: { id: itemId },
        data: {
          unitPrice: data.unitPrice,
          quantity: data.quantity,
          finalPrice: data.finalPrice,
        },
      })
    );

    return SaleItem.fromPrisma(row);
  }

  async removeItem(itemId: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.saleItem.delete({ where: { id: itemId } })
    );
  }

  async updateClientSnapshot(
    saleId: string,
    clientSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput,
    comercial?: string | null
  ): Promise<Sale> {
    const updated = await dbCircuitBreaker.execute(() =>
      prisma.sale.update({
        where: { id: saleId },
        data: {
          clientSnapshot: clientSnapshot ?? Prisma.JsonNull,
          ...(comercial !== undefined ? { comercial } : {}),
        },
      })
    );

    return Sale.fromPrisma(updated);
  }

  async addHistory(data: {
    saleId: string;
    userId?: string | null;
    action: string;
    payload?: Prisma.JsonValue | Prisma.JsonNullValueInput;
  }): Promise<SaleHistory> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleHistory.create({
        data: {
          saleId: data.saleId,
          userId: data.userId ?? null,
          action: data.action,
          payload: data.payload ?? Prisma.JsonNull,
        },
      })
    );

    return SaleHistory.fromPrisma(row);
  }

  async assignUser(data: {
    saleId: string;
    userId: string;
    role: string;
  }): Promise<SaleAssignment> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleAssignment.create({
        data: {
          saleId: data.saleId,
          userId: data.userId,
          role: data.role,
        },
      })
    );

    return SaleAssignment.fromPrisma(row);
  }

  async getDistinctComerciales(): Promise<string[]> {
    const result = await dbCircuitBreaker.execute(() =>
      prisma.sale.findMany({
        where: {
          comercial: { not: null },
        },
        select: { comercial: true },
        distinct: ['comercial'],
        orderBy: { comercial: 'asc' },
      })
    );

    return result
      .map((r) => r.comercial)
      .filter((c): c is string => c !== null);
  }

  /**
   * Crea una venta con items en una sola transacción atómica.
   * Si cualquier paso falla, se hace rollback de todo.
   */
  async createWithItemsTransaction(data: {
    clientId: string;
    statusId: string;
    notes?: Prisma.JsonValue | Prisma.JsonNullValueInput;
    metadata?: Prisma.JsonValue | Prisma.JsonNullValueInput;
    clientSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput;
    addressSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput;
    comercial?: string | null;
    items: Array<{
      productId?: string | null;
      nameSnapshot: string;
      skuSnapshot?: string | null;
      unitPrice: number;
      quantity: number;
      finalPrice: number;
      tipoSnapshot?: string | null;
      periodoSnapshot?: string | null;
      precioBaseSnapshot?: number | null;
      precioConsumoSnapshot?: number | null;
      unidadConsumoSnapshot?: string | null;
    }>;
    history: {
      userId: string;
      action: string;
      payload?: Prisma.JsonValue | Prisma.JsonNullValueInput;
    };
  }): Promise<Sale> {
    const result = await dbCircuitBreaker.execute(() =>
      prisma.$transaction(async (tx) => {
        // 1. Crear la venta
        const sale = await tx.sale.create({
          data: {
            clientId: data.clientId,
            statusId: data.statusId,
            totalAmount: 0,
            notes: data.notes ?? Prisma.JsonNull,
            metadata: data.metadata ?? Prisma.JsonNull,
            clientSnapshot: data.clientSnapshot ?? Prisma.JsonNull,
            addressSnapshot: data.addressSnapshot ?? Prisma.JsonNull,
            comercial: data.comercial ?? null,
          },
        });

        // 2. Crear todos los items
        let totalAmount = 0;
        for (const item of data.items) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId ?? null,
              nameSnapshot: item.nameSnapshot,
              skuSnapshot: item.skuSnapshot ?? null,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              finalPrice: item.finalPrice,
              tipoSnapshot: item.tipoSnapshot ?? null,
              periodoSnapshot: item.periodoSnapshot ?? null,
              precioBaseSnapshot: item.precioBaseSnapshot ?? null,
              precioConsumoSnapshot: item.precioConsumoSnapshot ?? null,
              unidadConsumoSnapshot: item.unidadConsumoSnapshot ?? null,
            },
          });
          totalAmount += item.finalPrice;
        }

        // 3. Actualizar el total de la venta
        const updatedSale = await tx.sale.update({
          where: { id: sale.id },
          data: { totalAmount },
        });

        // 4. Crear el registro de historial
        await tx.saleHistory.create({
          data: {
            saleId: sale.id,
            userId: data.history.userId,
            action: data.history.action,
            payload: data.history.payload ?? Prisma.JsonNull,
          },
        });

        return updatedSale;
      })
    );

    return Sale.fromPrisma(result);
  }
}
