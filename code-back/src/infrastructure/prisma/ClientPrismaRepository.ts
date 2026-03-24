import { prisma } from '@infrastructure/prisma/prismaClient';
import { IClientRepository } from '@domain/repositories/IClientRepository';
import { Client } from '@domain/entities/Client';
import { dbCircuitBreaker } from '@infrastructure/resilience';

export class ClientPrismaRepository implements IClientRepository {
  async getById(id: string): Promise<Client | null> {
    const clientData = await dbCircuitBreaker.execute(() =>
      prisma.client.findUnique({ where: { id } })
    );
    if (!clientData) return null;

    // Convertir null a undefined para authorized y businessName
    const clientDataWithUndefined = {
      ...clientData,
      authorized: clientData.authorized ?? undefined,
      businessName: clientData.businessName ?? undefined,
    };

    return Client.fromPrisma(clientDataWithUndefined);
  }

  async create(client: Client): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.client.create({ data: client.toPrisma() })
    );
  }

  async update(client: Client): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.client.update({
        where: { id: client.id },
        data: client.toPrisma(),
      })
    );
  }

  async delete(id: string): Promise<void> {
    // Transacción: desvincula el cliente de sus ventas (clientId → null)
    // y luego elimina el registro. Los snapshots de venta conservan los datos.
    await dbCircuitBreaker.execute(() =>
      prisma.$transaction([
        prisma.sale.updateMany({
          where: { clientId: id },
          data: { clientId: null },
        }),
        prisma.client.delete({ where: { id } }),
      ])
    );
  }

  async getByPhoneOrDNI(value: string, empresaId: string): Promise<Client[]> {
    const clientsData = await dbCircuitBreaker.execute(() =>
      prisma.client.findMany({
        where: {
          empresaId,
          OR: [{ phones: { has: value } }, { dni: value }],
        },
      })
    );

    return clientsData.map((data) => {
      // Convertir null a undefined para authorized y businessName
      const clientDataWithUndefined = {
        ...data,
        authorized: data.authorized ?? undefined,
        businessName: data.businessName ?? undefined,
      };

      return Client.fromPrisma(clientDataWithUndefined);
    });
  }
}
