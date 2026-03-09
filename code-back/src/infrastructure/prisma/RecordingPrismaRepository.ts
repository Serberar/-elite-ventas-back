import { prisma } from '@infrastructure/prisma/prismaClient';
import { Recording } from '@domain/entities/Recording';
import { IRecordingRepository, RecordingCreateInput } from '@domain/repositories/IRecordingRepository';
import { dbCircuitBreaker } from '@infrastructure/resilience';

export class RecordingPrismaRepository implements IRecordingRepository {
  async create(data: RecordingCreateInput): Promise<Recording> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleRecording.create({
        data: {
          saleId: data.saleId,
          filename: data.filename,
          storagePath: data.storagePath,
          mimeType: data.mimeType,
          size: data.size,
          uploadedById: data.uploadedById ?? null,
        },
      })
    );
    return Recording.fromPrisma(row);
  }

  async findById(id: string): Promise<Recording | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.saleRecording.findUnique({
        where: { id },
      })
    );
    return row ? Recording.fromPrisma(row) : null;
  }

  async findBySaleId(saleId: string): Promise<Recording[]> {
    const rows = await dbCircuitBreaker.execute(() =>
      prisma.saleRecording.findMany({
        where: { saleId },
        orderBy: { createdAt: 'desc' },
      })
    );
    return rows.map((r) => Recording.fromPrisma(r));
  }

  async delete(id: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.saleRecording.delete({
        where: { id },
      })
    );
  }
}
