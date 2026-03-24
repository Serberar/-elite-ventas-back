import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, ConflictError } from '@application/shared/AppError';

export class CreateEmpresaUseCase {
  constructor(private empresaRepo: IEmpresaRepository) {}

  async execute(
    data: {
      nombre: string;
      slug: string;
      logo?: string | null;
      colorPrimario?: string | null;
      colorSecundario?: string | null;
      colorNombreEmpresa?: string | null;
      paginasHabilitadas?: string[];
    },
    currentUser: CurrentUser
  ): Promise<Empresa> {
    if (currentUser.role !== 'administrador') {
      throw new AuthorizationError('Solo administradores pueden crear empresas');
    }

    const existing = await this.empresaRepo.findBySlug(data.slug);
    if (existing) {
      throw new ConflictError(`Ya existe una empresa con el slug "${data.slug}"`);
    }

    const empresa = new Empresa(
      crypto.randomUUID(),
      data.nombre,
      data.slug,
      true,
      data.logo ?? null,
      data.colorPrimario ?? null,
      data.colorSecundario ?? null,
      data.paginasHabilitadas ?? [],
      new Date(),
      null,
      data.colorNombreEmpresa ?? null
    );

    await this.empresaRepo.create(empresa);
    return empresa;
  }
}
