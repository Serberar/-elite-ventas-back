import { SystemSettingPrismaRepository } from '@infrastructure/prisma/SystemSettingPrismaRepository';

export class GetSystemSettingUseCase {
  constructor(private settingRepo: SystemSettingPrismaRepository) {}

  async execute(key: string, defaultValue: string = ''): Promise<string> {
    const val = await this.settingRepo.get(key);
    return val ?? defaultValue;
  }

  async executeAsBool(key: string, defaultValue: boolean = true): Promise<boolean> {
    const val = await this.settingRepo.get(key);
    if (val === null) return defaultValue;
    return val === 'true';
  }
}
