import { SystemSettingPrismaRepository } from '@infrastructure/prisma/SystemSettingPrismaRepository';

export class GetSystemSettingUseCase {
  constructor(private settingRepo: SystemSettingPrismaRepository) {}

  async execute(key: string, empresaId: string, defaultValue: string = ''): Promise<string> {
    const val = await this.settingRepo.get(key, empresaId);
    return val ?? defaultValue;
  }

  async executeAsBool(key: string, empresaId: string, defaultValue: boolean = true): Promise<boolean> {
    const val = await this.settingRepo.get(key, empresaId);
    if (val === null) return defaultValue;
    return val === 'true';
  }
}
