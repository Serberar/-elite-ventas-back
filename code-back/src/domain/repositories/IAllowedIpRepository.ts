import { AllowedIp } from '@domain/entities/AllowedIp';

export interface IAllowedIpRepository {
  list(): Promise<AllowedIp[]>;

  listIpStrings(): Promise<string[]>;

  create(data: { ip: string; description?: string | null }): Promise<AllowedIp>;

  delete(id: string): Promise<void>;
}
