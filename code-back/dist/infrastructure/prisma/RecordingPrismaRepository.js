"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordingPrismaRepository = void 0;
const prismaClient_1 = require("../prisma/prismaClient");
const Recording_1 = require("../../domain/entities/Recording");
const resilience_1 = require("../resilience");
class RecordingPrismaRepository {
    async create(data) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleRecording.create({
            data: {
                saleId: data.saleId,
                filename: data.filename,
                storagePath: data.storagePath,
                mimeType: data.mimeType,
                size: data.size,
                uploadedById: data.uploadedById ?? null,
            },
        }));
        return Recording_1.Recording.fromPrisma(row);
    }
    async findById(id) {
        const row = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleRecording.findUnique({
            where: { id },
        }));
        return row ? Recording_1.Recording.fromPrisma(row) : null;
    }
    async findBySaleId(saleId) {
        const rows = await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleRecording.findMany({
            where: { saleId },
            orderBy: { createdAt: 'desc' },
        }));
        return rows.map((r) => Recording_1.Recording.fromPrisma(r));
    }
    async delete(id) {
        await resilience_1.dbCircuitBreaker.execute(() => prismaClient_1.prisma.saleRecording.delete({
            where: { id },
        }));
    }
}
exports.RecordingPrismaRepository = RecordingPrismaRepository;
