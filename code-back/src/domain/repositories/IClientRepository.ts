import { Client } from '@domain/entities/Client';

export interface IClientRepository {
  getById(id: string): Promise<Client | null>;
  create(client: Client): Promise<void>;
  update(client: Client): Promise<void>;
  getByPhoneOrDNI(phone: string): Promise<Client[]>;
}
