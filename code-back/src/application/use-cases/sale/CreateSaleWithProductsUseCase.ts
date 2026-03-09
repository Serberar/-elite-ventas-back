import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { CreateSaleWithProductsDTO } from '@infrastructure/express/validation/saleSchemas';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import {
  businessSalesCreated,
  businessSaleItemsAdded,
} from '@infrastructure/observability/metrics/prometheusMetrics';
import { Sale } from '@domain/entities/Sale';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '@application/shared/AppError';

function safeJson(input: unknown): Prisma.JsonValue | typeof Prisma.JsonNull {
  if (input === null || input === undefined) return Prisma.JsonNull;
  return JSON.parse(JSON.stringify(input)) as Prisma.JsonValue;
}

export class CreateSaleWithProductsUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private saleStatusRepo: ISaleStatusRepository,
    private productRepo: IProductRepository
  ) {}

  async execute(dto: CreateSaleWithProductsDTO, currentUser: CurrentUser): Promise<Sale> {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.CreateSaleWithProductsUseCase,
      'crear venta con productos'
    );

    // Validar que el cliente tenga id
    if (!dto.client?.id) {
      throw new ValidationError('El cliente es obligatorio y debe tener un id válido');
    }

    // Obtener status inicial si no viene en DTO
    let statusId = dto.statusId;
    if (!statusId) {
      const initialStatus = await this.saleStatusRepo.findInitialStatus();
      if (!initialStatus?.id) {
        throw new ValidationError('No se encontró un estado inicial para las ventas');
      }
      statusId = initialStatus.id;
    }

    const clientSnapshot = safeJson(dto.client);
    const addressSnapshot = safeJson(dto.client?.address ?? null);

    // Preparar items con SKU snapshot (validación previa a la transacción)
    const rawItems = Array.isArray(dto.items) ? dto.items : [];
    const preparedItems: Array<{
      productId?: string | null;
      nameSnapshot: string;
      skuSnapshot: string | null;
      unitPrice: number;
      quantity: number;
      finalPrice: number;
      tipoSnapshot: string | null;
      periodoSnapshot: string | null;
      precioBaseSnapshot: number | null;
      precioConsumoSnapshot: number | null;
      unidadConsumoSnapshot: string | null;
    }> = [];

    for (const item of rawItems) {
      let skuSnapshot: string | null = null;
      let tipoSnapshot: string | null = null;
      let periodoSnapshot: string | null = null;
      let precioBaseSnapshot: number | null = null;
      let precioConsumoSnapshot: number | null = null;
      let unidadConsumoSnapshot: string | null = null;
      const unitPrice = Number(item.price ?? 0);
      const quantity = Number(item.quantity ?? 0);
      const finalPrice = unitPrice * quantity;

      if (item.productId) {
        const product = await this.productRepo.findById(item.productId);
        if (!product) {
          throw new NotFoundError('Producto', item.productId);
        }
        skuSnapshot = product.sku ?? null;
        tipoSnapshot = product.tipo ?? 'unico';
        periodoSnapshot = product.periodo ?? null;
        precioBaseSnapshot = product.precioBase ?? null;
        precioConsumoSnapshot = product.precioConsumo ?? null;
        unidadConsumoSnapshot = product.unidadConsumo ?? null;
      }

      preparedItems.push({
        productId: item.productId,
        nameSnapshot: item.name,
        skuSnapshot,
        unitPrice,
        quantity,
        finalPrice,
        tipoSnapshot,
        periodoSnapshot,
        precioBaseSnapshot,
        precioConsumoSnapshot,
        unidadConsumoSnapshot,
      });
    }

    const historyPayload = safeJson({
      client: dto.client,
      items: dto.items,
      statusId: dto.statusId,
      notes: dto.notes,
      metadata: dto.metadata,
    });

    // Crear venta con items en una transacción atómica
    // Si falla cualquier paso, se hace rollback automático
    const sale = await this.saleRepo.createWithItemsTransaction({
      clientId: dto.client.id,
      statusId,
      notes: safeJson(dto.notes ?? null),
      metadata: safeJson(dto.metadata ?? null),
      clientSnapshot,
      addressSnapshot,
      comercial: dto.comercial ?? null,
      items: preparedItems,
      history: {
        userId: currentUser.id,
        action: 'create_sale',
        payload: historyPayload,
      },
    });

    businessSalesCreated.inc();
    businessSaleItemsAdded.inc(preparedItems.length);

    return sale;
  }
}
