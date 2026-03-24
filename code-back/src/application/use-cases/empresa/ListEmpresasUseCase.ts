import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

export class ListEmpresasUseCase {
  constructor(private empresaRepo: IEmpresaRepository) {}

  async execute(currentUser: CurrentUser): Promise<Empresa[]> {
    if (currentUser.role !== 'administrador') {
      throw new AuthorizationError('Solo administradores pueden listar empresas');
    }
    return this.empresaRepo.list();
  }
}
