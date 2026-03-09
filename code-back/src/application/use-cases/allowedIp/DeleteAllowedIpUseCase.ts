import { IAllowedIpRepository } from '@domain/repositories/IAllowedIpRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class DeleteAllowedIpUseCase {
  constructor(private repo: IAllowedIpRepository) {}

  async execute(id: string, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.allowedIp.DeleteAllowedIpUseCase,
      'eliminar IP permitida'
    );

    await this.repo.delete(id);
  }
}
