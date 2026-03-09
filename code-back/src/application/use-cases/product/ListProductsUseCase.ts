import { IProductRepository } from '@domain/repositories/IProductRepository';
import { Product } from '@domain/entities/Product';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import logger from '@infrastructure/observability/logger/logger';

export class ListProductsUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(currentUser: CurrentUser): Promise<Product[]> {
    checkRolePermission(
      currentUser,
      rolePermissions.product.ListProductsUseCase,
      'listar productos'
    );

    logger.info(`Listando productos — usuario ${currentUser.id}`);

    const list = await this.repository.findAll();

    return list;
  }
}
