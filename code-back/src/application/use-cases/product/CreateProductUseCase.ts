import { IProductRepository } from '@domain/repositories/IProductRepository';
import { Product } from '@domain/entities/Product';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import crypto from 'crypto';
import logger from '@infrastructure/observability/logger/logger';
import { CreateProductDTO } from '@infrastructure/express/validation/productSchemas';
import { businessProductsCreated } from '@infrastructure/observability/metrics/prometheusMetrics';

export class CreateProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(
    data: CreateProductDTO, // DTO ya validado en la ruta
    currentUser: CurrentUser
  ): Promise<Product> {
    // Permisos
    checkRolePermission(
      currentUser,
      rolePermissions.product.CreateProductUseCase,
      'crear productos'
    );

    logger.info(`Creando producto "${data.name}" — usuario ${currentUser.id}`);

    // Construir entidad
    const product = new Product(
      crypto.randomUUID(),
      data.name,
      data.description ?? null,
      data.sku ?? null,
      data.price,
      true,
      new Date(),
      new Date(),
      data.tipo ?? 'unico',
      data.periodo ?? null,
      data.precioBase ?? null,
      data.precioConsumo ?? null,
      data.unidadConsumo ?? null,
      currentUser.empresaId
    );

    // Persistir
    const created = await this.repository.create(product);

    // Registrar métrica de negocio
    businessProductsCreated.inc();

    logger.info(`Producto creado: ${created.id} — SKU: ${created.sku ?? 'sin SKU'}`);

    return created;
  }
}
