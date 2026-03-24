import { Empresa } from '@domain/entities/Empresa';

export interface IEmpresaRepository {
  create(empresa: Empresa): Promise<void>;
  findById(id: string): Promise<Empresa | null>;
  findBySlug(slug: string): Promise<Empresa | null>;
  list(): Promise<Empresa[]>;
  update(empresa: Empresa): Promise<void>;
}
