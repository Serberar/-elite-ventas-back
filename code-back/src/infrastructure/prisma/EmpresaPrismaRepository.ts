import { prisma } from '@infrastructure/prisma/prismaClient';
import { IEmpresaRepository } from '@domain/repositories/IEmpresaRepository';
import { Empresa } from '@domain/entities/Empresa';
import { dbCircuitBreaker } from '@infrastructure/resilience';
import { SYSTEM_STATUSES } from '@domain/constants';

export class EmpresaPrismaRepository implements IEmpresaRepository {
  /**
   * Crea una empresa y genera en transacción sus estados de sistema propios.
   */
  async create(empresa: Empresa): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.$transaction(async (tx) => {
        // 1. Crear empresa
        await tx.empresa.create({ data: empresa.toPrisma() });

        // 2. Crear estados de sistema propios de la empresa
        for (const s of SYSTEM_STATUSES) {
          await tx.saleStatus.create({
            data: { ...s, empresaId: empresa.id },
          });
        }
      })
    );
  }

  async findById(id: string): Promise<Empresa | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.empresa.findUnique({ where: { id } })
    );
    return row ? Empresa.fromPrisma(row) : null;
  }

  async findBySlug(slug: string): Promise<Empresa | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.empresa.findUnique({ where: { slug } })
    );
    return row ? Empresa.fromPrisma(row) : null;
  }

  async list(): Promise<Empresa[]> {
    const rows = await dbCircuitBreaker.execute(() =>
      prisma.empresa.findMany({ orderBy: { nombre: 'asc' } })
    );
    return rows.map((r) => Empresa.fromPrisma(r));
  }

  async update(empresa: Empresa): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.empresa.update({
        where: { id: empresa.id },
        data: {
          nombre: empresa.nombre,
          slug: empresa.slug,
          activa: empresa.activa,
          logo: empresa.logo,
          colorPrimario: empresa.colorPrimario,
          colorSecundario: empresa.colorSecundario,
          paginasHabilitadas: empresa.paginasHabilitadas,
          paginaInicio: empresa.paginaInicio,
          colorNombreEmpresa: empresa.colorNombreEmpresa,
        },
      })
    );
  }
}
