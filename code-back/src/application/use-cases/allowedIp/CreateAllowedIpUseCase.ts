import { IAllowedIpRepository } from '@domain/repositories/IAllowedIpRepository';
import { CreateAllowedIpDTO } from '@infrastructure/express/validation/allowedIpSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class CreateAllowedIpUseCase {
  constructor(private repo: IAllowedIpRepository) {}

  async execute(dto: CreateAllowedIpDTO, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.allowedIp.CreateAllowedIpUseCase,
      'crear IP permitida'
    );

    return await this.repo.create({
      ip: dto.ip,
      description: dto.description ?? null,
    });
  }
}
