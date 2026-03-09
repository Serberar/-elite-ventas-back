import { SignatureRequestPrismaRepository } from '@infrastructure/prisma/SignatureRequestPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { SignatureRequest } from '@domain/entities/SignatureRequest';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    signatureRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@infrastructure/resilience', () => ({
  dbCircuitBreaker: {
    execute: jest.fn((fn: () => Promise<any>) => fn()),
  },
}));

describe('SignatureRequestPrismaRepository', () => {
  let repository: SignatureRequestPrismaRepository;

  const mockRow = {
    id: 'sig-1',
    saleId: 'sale-123',
    status: 'pending',
    signerEmail: 'john@example.com',
    providerDocumentId: 'doc-abc',
    signedDocumentUrl: null,
    rejectionReason: null,
    sentAt: new Date('2024-01-15'),
    signedAt: null,
    rejectedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SignatureRequestPrismaRepository();
  });

  describe('create', () => {
    it('should create and return a SignatureRequest entity', async () => {
      (prisma.signatureRequest.create as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.create({
        saleId: 'sale-123',
        status: 'pending',
        signerEmail: 'john@example.com',
        providerDocumentId: 'doc-abc',
        sentAt: new Date('2024-01-15'),
      });

      expect(prisma.signatureRequest.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-123',
          status: 'pending',
          signerEmail: 'john@example.com',
          providerDocumentId: 'doc-abc',
          sentAt: expect.any(Date),
        },
      });
      expect(result).toBeInstanceOf(SignatureRequest);
      expect(result.id).toBe('sig-1');
      expect(result.status).toBe('pending');
    });

    it('should set providerDocumentId to null when not provided', async () => {
      (prisma.signatureRequest.create as jest.Mock).mockResolvedValue({
        ...mockRow,
        providerDocumentId: null,
      });

      await repository.create({
        saleId: 'sale-123',
        status: 'pending',
        signerEmail: 'john@example.com',
      });

      expect(prisma.signatureRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ providerDocumentId: null }),
        })
      );
    });

    it('should propagate prisma errors', async () => {
      (prisma.signatureRequest.create as jest.Mock).mockRejectedValue(
        new Error('Unique constraint failed on saleId')
      );

      await expect(
        repository.create({ saleId: 'sale-dup', status: 'pending', signerEmail: 'x@x.com' })
      ).rejects.toThrow('Unique constraint failed on saleId');
    });
  });

  describe('findById', () => {
    it('should return a SignatureRequest when found', async () => {
      (prisma.signatureRequest.findUnique as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findById('sig-1');

      expect(prisma.signatureRequest.findUnique).toHaveBeenCalledWith({ where: { id: 'sig-1' } });
      expect(result).toBeInstanceOf(SignatureRequest);
      expect(result?.id).toBe('sig-1');
    });

    it('should return null when not found', async () => {
      (prisma.signatureRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findBySaleId', () => {
    it('should return a SignatureRequest for the sale', async () => {
      (prisma.signatureRequest.findUnique as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findBySaleId('sale-123');

      expect(prisma.signatureRequest.findUnique).toHaveBeenCalledWith({
        where: { saleId: 'sale-123' },
      });
      expect(result).toBeInstanceOf(SignatureRequest);
      expect(result?.saleId).toBe('sale-123');
    });

    it('should return null when no signature request exists for sale', async () => {
      (prisma.signatureRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findBySaleId('sale-no-sig');

      expect(result).toBeNull();
    });
  });

  describe('findByProviderDocumentId', () => {
    it('should return a SignatureRequest when found', async () => {
      (prisma.signatureRequest.findFirst as jest.Mock).mockResolvedValue(mockRow);

      const result = await repository.findByProviderDocumentId('doc-abc');

      expect(prisma.signatureRequest.findFirst).toHaveBeenCalledWith({
        where: { providerDocumentId: 'doc-abc' },
      });
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should return null when not found', async () => {
      (prisma.signatureRequest.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByProviderDocumentId('unknown-doc');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update status and return updated SignatureRequest', async () => {
      const updatedRow = { ...mockRow, status: 'signed', signedAt: new Date() };
      (prisma.signatureRequest.update as jest.Mock).mockResolvedValue(updatedRow);

      const result = await repository.update('sig-1', { status: 'signed', signedAt: new Date() });

      expect(prisma.signatureRequest.update).toHaveBeenCalledWith({
        where: { id: 'sig-1' },
        data: expect.objectContaining({ status: 'signed' }),
      });
      expect(result).toBeInstanceOf(SignatureRequest);
      expect(result.status).toBe('signed');
    });

    it('should only include fields that are defined in update data', async () => {
      (prisma.signatureRequest.update as jest.Mock).mockResolvedValue(mockRow);

      await repository.update('sig-1', { status: 'pending', providerDocumentId: 'new-doc' });

      const callData = (prisma.signatureRequest.update as jest.Mock).mock.calls[0][0].data;
      expect(callData).toHaveProperty('status', 'pending');
      expect(callData).toHaveProperty('providerDocumentId', 'new-doc');
      expect(callData).not.toHaveProperty('signerEmail');
      expect(callData).not.toHaveProperty('signedAt');
    });

    it('should allow setting optional fields to null (via "in data" check)', async () => {
      (prisma.signatureRequest.update as jest.Mock).mockResolvedValue({
        ...mockRow,
        signedDocumentUrl: null,
        rejectionReason: null,
      });

      await repository.update('sig-1', {
        signedDocumentUrl: undefined,
        rejectionReason: undefined,
      });

      const callData = (prisma.signatureRequest.update as jest.Mock).mock.calls[0][0].data;
      expect(callData).toHaveProperty('signedDocumentUrl', null);
      expect(callData).toHaveProperty('rejectionReason', null);
    });

    it('should propagate prisma errors', async () => {
      (prisma.signatureRequest.update as jest.Mock).mockRejectedValue(new Error('Record not found'));

      await expect(repository.update('non-existent', { status: 'pending' })).rejects.toThrow(
        'Record not found'
      );
    });
  });

  describe('delete', () => {
    it('should delete a signature request by id', async () => {
      (prisma.signatureRequest.delete as jest.Mock).mockResolvedValue(undefined);

      await repository.delete('sig-1');

      expect(prisma.signatureRequest.delete).toHaveBeenCalledWith({ where: { id: 'sig-1' } });
    });

    it('should resolve without error on success', async () => {
      (prisma.signatureRequest.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(repository.delete('sig-1')).resolves.toBeUndefined();
    });

    it('should propagate prisma errors', async () => {
      (prisma.signatureRequest.delete as jest.Mock).mockRejectedValue(new Error('Record not found'));

      await expect(repository.delete('non-existent')).rejects.toThrow('Record not found');
    });
  });
});
