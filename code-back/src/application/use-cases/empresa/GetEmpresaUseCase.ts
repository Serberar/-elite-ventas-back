import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { NotFoundError } from '@application/shared/AppError';

export class GetEmpresaUseCase {
  constructor(private empresaRepo: IEmpresaRepository) {}

  async execute(id: string): Promise<Empresa> {
    const empresa = await this.empresaRepo.findById(id);
    if (!empresa) {
      throw new NotFoundError('Empresa', id);
    }
    return empresa;
  }
}
