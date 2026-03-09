import { RecordingPrismaRepository } from '@infrastructure/prisma/RecordingPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { Recording } from '@domain/entities/Recording';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    saleRecording: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@infrastructure/resilience', () => ({
  dbCircuitBreaker: {
    execute: jest.fn((fn: () => Promise<any>) => fn()),
  },
}));

describe('RecordingPrismaRepository', () => {
  let repository: RecordingPrismaRepository;

  const mockRecordingRow = {
    id: 'rec-1',
    saleId: 'sale-123',
    filename: 'llamada.mp3',
    storagePath: 'sale-123/llamada.mp3',
    mimeType: 'audio/mpeg',
    size: 2048,
    uploadedById: 'user-1',
    createdAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new RecordingPrismaRepository();
  });

  describe('create', () => {
    it('should create and return a Recording entity', async () => {
      (prisma.saleRecording.create as jest.Mock).mockResolvedValue(mockRecordingRow);

      const result = await repository.create({
        saleId: 'sale-123',
        filename: 'llamada.mp3',
        storagePath: 'sale-123/llamada.mp3',
        mimeType: 'audio/mpeg',
        size: 2048,
        uploadedById: 'user-1',
      });

      expect(prisma.saleRecording.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-123',
          filename: 'llamada.mp3',
          storagePath: 'sale-123/llamada.mp3',
          mimeType: 'audio/mpeg',
          size: 2048,
          uploadedById: 'user-1',
        },
      });
      expect(result).toBeInstanceOf(Recording);
      expect(result.id).toBe('rec-1');
      expect(result.filename).toBe('llamada.mp3');
    });

    it('should set uploadedById to null when not provided', async () => {
      (prisma.saleRecording.create as jest.Mock).mockResolvedValue({
        ...mockRecordingRow,
        uploadedById: null,
      });

      await repository.create({
        saleId: 'sale-123',
        filename: 'llamada.mp3',
        storagePath: 'sale-123/llamada.mp3',
        mimeType: 'audio/mpeg',
        size: 2048,
      });

      expect(prisma.saleRecording.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ uploadedById: null }) })
      );
    });

    it('should propagate prisma errors', async () => {
      (prisma.saleRecording.create as jest.Mock).mockRejectedValue(new Error('Foreign key error'));

      await expect(
        repository.create({
          saleId: 'non-existent',
          filename: 'f.mp3',
          storagePath: 's/f.mp3',
          mimeType: 'audio/mpeg',
          size: 100,
        })
      ).rejects.toThrow('Foreign key error');
    });
  });

  describe('findById', () => {
    it('should return a Recording entity when found', async () => {
      (prisma.saleRecording.findUnique as jest.Mock).mockResolvedValue(mockRecordingRow);

      const result = await repository.findById('rec-1');

      expect(prisma.saleRecording.findUnique).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
      expect(result).toBeInstanceOf(Recording);
      expect(result?.id).toBe('rec-1');
    });

    it('should return null when not found', async () => {
      (prisma.saleRecording.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should propagate prisma errors', async () => {
      (prisma.saleRecording.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.findById('rec-1')).rejects.toThrow('DB error');
    });
  });

  describe('findBySaleId', () => {
    it('should return list of recordings for a sale', async () => {
      const secondRow = { ...mockRecordingRow, id: 'rec-2', filename: 'llamada2.mp3' };
      (prisma.saleRecording.findMany as jest.Mock).mockResolvedValue([mockRecordingRow, secondRow]);

      const result = await repository.findBySaleId('sale-123');

      expect(prisma.saleRecording.findMany).toHaveBeenCalledWith({
        where: { saleId: 'sale-123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Recording);
      expect(result[1].filename).toBe('llamada2.mp3');
    });

    it('should return empty array when sale has no recordings', async () => {
      (prisma.saleRecording.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.findBySaleId('sale-empty');

      expect(result).toEqual([]);
    });

    it('should propagate prisma errors', async () => {
      (prisma.saleRecording.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(repository.findBySaleId('sale-123')).rejects.toThrow('DB error');
    });
  });

  describe('delete', () => {
    it('should delete a recording by id', async () => {
      (prisma.saleRecording.delete as jest.Mock).mockResolvedValue(undefined);

      await repository.delete('rec-1');

      expect(prisma.saleRecording.delete).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
    });

    it('should resolve without error on success', async () => {
      (prisma.saleRecording.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(repository.delete('rec-1')).resolves.toBeUndefined();
    });

    it('should propagate prisma errors', async () => {
      (prisma.saleRecording.delete as jest.Mock).mockRejectedValue(new Error('Record not found'));

      await expect(repository.delete('non-existent')).rejects.toThrow('Record not found');
    });
  });
});
