import { IProductRepository } from '@domain/repositories/IProductRepository';
import { Product } from '@domain/entities/Product';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import logger from '@infrastructure/observability/logger/logger';
import { NotFoundError } from '@application/shared/AppError';

export class GetProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(id: string, currentUser: CurrentUser): Promise<Product> {
    checkRolePermission(currentUser, rolePermissions.product.GetProductUseCase, 'ver productos');

    logger.info(`Obteniendo producto ${id} — usuario ${currentUser.id}`);

    const product = await this.repository.findById(id);
    if (!product) throw new NotFoundError('Producto', id);

    return product;
  }
}
