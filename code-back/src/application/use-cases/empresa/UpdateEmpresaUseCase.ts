import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

export class UpdateEmpresaUseCase {
  constructor(private empresaRepo: IEmpresaRepository) {}

  async execute(
    id: string,
    data: {
      nombre?: string;
      slug?: string;
      activa?: boolean;
      logo?: string | null;
      colorPrimario?: string | null;
      colorSecundario?: string | null;
      colorNombreEmpresa?: string | null;
      paginasHabilitadas?: string[];
      paginaInicio?: string | null;
    },
    currentUser: CurrentUser
  ): Promise<Empresa> {
    if (currentUser.role !== 'administrador') {
      throw new AuthorizationError('Solo administradores pueden modificar empresas');
    }

    const existing = await this.empresaRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Empresa', id);
    }

    const updated = new Empresa(
      existing.id,
      data.nombre ?? existing.nombre,
      data.slug ?? existing.slug,
      data.activa ?? existing.activa,
      data.logo !== undefined ? data.logo : existing.logo,
      data.colorPrimario !== undefined ? data.colorPrimario : existing.colorPrimario,
      data.colorSecundario !== undefined ? data.colorSecundario : existing.colorSecundario,
      data.paginasHabilitadas ?? existing.paginasHabilitadas,
      existing.createdAt,
      data.paginaInicio !== undefined ? data.paginaInicio : existing.paginaInicio,
      data.colorNombreEmpresa !== undefined ? data.colorNombreEmpresa : existing.colorNombreEmpresa
    );

    await this.empresaRepo.update(updated);
    return updated;
  }
}
