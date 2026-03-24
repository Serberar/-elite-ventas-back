import { AllowedIp } from '@domain/entities/AllowedIp';

export interface IAllowedIpRepository {
  list(empresaId: string): Promise<AllowedIp[]>;

  listIpStrings(empresaId?: string): Promise<string[]>;

  create(data: { ip: string; description?: string | null; empresaId: string }): Promise<AllowedIp>;

  delete(id: string, empresaId: string): Promise<void>;
}
