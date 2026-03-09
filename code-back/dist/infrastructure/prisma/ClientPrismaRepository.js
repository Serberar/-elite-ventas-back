"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientPrismaRepository = void 0;
const prismaClient_1 = require("../prisma/prismaClient");
const Client_1 = require("../../domain/entities/Client");
const resilience_1 = require("../resilience");
class ClientPrismaRepository {
    async getById(id) {
        const clientData = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.client.findUnique({ where: { id } }));
        if (!clientData)
            return null;
        // Convertir null a undefined para authorized y businessName
        const clientDataWithUndefined = {
            ...clientData,
            authorized: clientData.authorized ?? undefined,
            businessName: clientData.businessName ?? undefined,
        };
        return Client_1.Client.fromPrisma(clientDataWithUndefined);
    }
    async create(client) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.client.create({ data: client.toPrisma() }));
    }
    async update(client) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.client.update({
            where: { id: client.id },
            data: client.toPrisma(),
        }));
    }
    async getByPhoneOrDNI(value) {
        const clientsData = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.client.findMany({
            where: {
                OR: [{ phones: { has: value } }, { dni: value }],
            },
        }));
        return clientsData.map((data) => {
            // Convertir null a undefined para authorized y businessName
            const clientDataWithUndefined = {
                ...data,
                authorized: data.authorized ?? undefined,
                businessName: data.businessName ?? undefined,
            };
            return Client_1.Client.fromPrisma(clientDataWithUndefined);
        });
    }
}
exports.ClientPrismaRepository = ClientPrismaRepository;
