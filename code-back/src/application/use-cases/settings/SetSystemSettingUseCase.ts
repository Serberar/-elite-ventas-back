import { SystemSettingPrismaRepository } from '@infrastructure/prisma/SystemSettingPrismaRepository';
import { AuthorizationError } from '@application/shared/AppError';
import { CurrentUser } from '@application/shared/types/CurrentUser';

export class SetSystemSettingUseCase {
  constructor(private settingRepo: SystemSettingPrismaRepository) {}

  async execute(key: string, value: string, currentUser: CurrentUser): Promise<void> {
    if (currentUser.role !== 'administrador') {
      throw new AuthorizationError('Solo el administrador puede modificar la configuración del sistema');
    }
    await this.settingRepo.set(key, value);
  }
}
