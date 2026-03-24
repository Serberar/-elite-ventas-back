import { IAllowedIpRepository } from '@domain/repositories/IAllowedIpRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class ListAllowedIpsUseCase {
  constructor(private repo: IAllowedIpRepository) {}

  async execute(currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.allowedIp.ListAllowedIpsUseCase,
      'listar IPs permitidas'
    );

    return await this.repo.list(currentUser.empresaId);
  }
}
