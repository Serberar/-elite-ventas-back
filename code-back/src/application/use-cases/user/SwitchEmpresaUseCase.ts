import jwt from 'jsonwebtoken';
import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

export class SwitchEmpresaUseCase {
  constructor(
    private empresaRepo: IEmpresaRepository,
    private userRepo: IUserRepository
  ) {}

  async execute(
    currentUser: CurrentUser,
    targetEmpresaId: string
  ): Promise<{ accessToken: string; empresa: { id: string; nombre: string; slug: string; paginasHabilitadas: string[] } }> {
    if (currentUser.role !== 'administrador') {
      throw new AuthorizationError('Solo administradores pueden cambiar de empresa');
    }

    const empresa = await this.empresaRepo.findById(targetEmpresaId);
    if (!empresa) {
      throw new NotFoundError('Empresa', targetEmpresaId);
    }
    if (!empresa.activa) {
      throw new AuthorizationError('La empresa no está activa');
    }

    const user = await this.userRepo.findById(currentUser.id);
    if (!user) {
      throw new NotFoundError('Usuario', currentUser.id);
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no definido');
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        empresaId: targetEmpresaId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
      accessToken,
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre,
        slug: empresa.slug,
        paginasHabilitadas: empresa.paginasHabilitadas,
      },
    };
  }
}
