import { Prisma } from '@prisma/client';
import { Sale } from '@domain/entities/Sale';
import { SaleItem } from '@domain/entities/SaleItem';
import { SaleHistory } from '@domain/entities/SaleHistory';
import { SaleAssignment } from '@domain/entities/SaleAssignment';
import { PaginationOptions, PaginatedResponse } from '@domain/types';

export interface ISaleRepository {
  create(data: {
    clientId: string;
    statusId: string;
    totalAmount?: number;
    notes?: Prisma.JsonValue | Prisma.JsonNullValueInput;
    metadata?: Prisma.JsonValue | Prisma.JsonNullValueInput;

    // 🔥 NUEVOS CAMPOS PARA SNAPSHOTS
    clientSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput;
    addressSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput;
    comercial?: string | null;
  }): Promise<Sale>;

  findById(id: string): Promise<Sale | null>;

  findWithRelations(id: string): Promise<{
    sale: Sale;
    items: SaleItem[];
    assignments: SaleAssignment[];
    histories: SaleHistory[];
    client?: any | null;
    status?: any | null;
  } | null>;

  list(filters: {
    clientId?: string;
    statusId?: string;
    from?: Date;
    to?: Date;
    comercial?: string;
  }): Promise<Sale[]>;

  /** Lista ventas con todas las relaciones en UNA sola query (evita N+1) */
  listWithRelations(filters: {
    clientId?: string;
    statusId?: string;
    from?: Date;
    to?: Date;
    comercial?: string;
  }): Promise<
    Array<{
      sale: Sale;
      items: SaleItem[];
      assignments: SaleAssignment[];
      histories: SaleHistory[];
      client?: any | null;
      status?: any | null;
    }>
  >;

  /** Listado paginado de ventas */
  listPaginated(
    filters: {
      clientId?: string;
      statusId?: string;
      from?: Date;
      to?: Date;
      comercial?: string;
    },
    pagination: PaginationOptions
  ): Promise<PaginatedResponse<Sale>>;

  /** Listado paginado con relaciones en UNA sola query (evita N+1) */
  listPaginatedWithRelations(
    filters: {
      clientId?: string;
      statusId?: string;
      from?: Date;
      to?: Date;
      comercial?: string;
    },
    pagination: PaginationOptions
  ): Promise<
    PaginatedResponse<{
      sale: Sale;
      items: SaleItem[];
      assignments: SaleAssignment[];
      histories: SaleHistory[];
      client?: any | null;
      status?: any | null;
    }>
  >;

  update(
    saleId: string,
    data: {
      statusId?: string;
      totalAmount?: number;
      notes?: Prisma.JsonValue | Prisma.JsonNullValueInput;
      metadata?: Prisma.JsonValue | Prisma.JsonNullValueInput;
      closedAt?: Date | null;

      // No se actualizan snapshots (solo lectura)
    }
  ): Promise<Sale>;

  addItem(
    saleId: string,
    data: {
      productId?: string | null;
      nameSnapshot: string;
      skuSnapshot?: string | null;
      unitPrice: number;
      quantity: number;
      finalPrice: number;
    }
  ): Promise<SaleItem>;

  updateItem(
    itemId: string,
    data: {
      unitPrice?: number;
      quantity?: number;
      finalPrice?: number;
    }
  ): Promise<SaleItem>;

  removeItem(itemId: string): Promise<void>;

  updateClientSnapshot(
    saleId: string,
    clientSnapshot: Prisma.JsonValue | Prisma.JsonNullValueInput,
    comercial?: string | null
  ): Promise<Sale>;

  addHistory(data: {
    saleId: string;
    userId?: string | null;
    action: string;
    payload?: Prisma.JsonValue | Prisma.JsonNullValueInput;
  }): Promise<SaleHistory>;

  assignUser(data: {
    saleId: string;
    userId: string;
    role: string;
  }): Promise<SaleAssignment>;

  getDistinctComerciales(): Promise<string[]>;

  /**
   * Crea una venta con items en una sola transacción atómica.
   * Si cualquier paso falla, se hace rollback de todo.
   */
  createWithItemsTransaction(data: {
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
    }>;
    history: {
      userId: string;
      action: string;
      payload?: Prisma.JsonValue | Prisma.JsonNullValueInput;
    };
  }): Promise<Sale>;
}
