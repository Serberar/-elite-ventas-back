import { prisma } from '@infrastructure/prisma/prismaClient';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import {
  ISignatureRequestRepository,
  CreateSignatureRequestData,
  UpdateSignatureRequestData,
} from '@domain/repositories/ISignatureRequestRepository';
import { dbCircuitBreaker } from '@infrastructure/resilience';

export class SignatureRequestPrismaRepository implements ISignatureRequestRepository {
  async create(data: CreateSignatureRequestData): Promise<SignatureRequest> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.signatureRequest.create({
        data: {
          saleId: data.saleId,
          documentType: data.documentType ?? 'contract',
          status: data.status,
          signerEmail: data.signerEmail,
          providerDocumentId: data.providerDocumentId ?? null,
          sentAt: data.sentAt ?? null,
        },
      })
    );
    return SignatureRequest.fromPrisma(row);
  }

  async findById(id: string): Promise<SignatureRequest | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.signatureRequest.findUnique({ where: { id } })
    );
    return row ? SignatureRequest.fromPrisma(row) : null;
  }

  async findBySaleId(saleId: string): Promise<SignatureRequest | null> {
    return this.findBySaleIdAndType(saleId, 'contract');
  }

  async findBySaleIdAndType(saleId: string, documentType: 'contract' | 'consent'): Promise<SignatureRequest | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.signatureRequest.findUnique({
        where: { saleId_documentType: { saleId, documentType } },
      })
    );
    return row ? SignatureRequest.fromPrisma(row) : null;
  }

  async findByProviderDocumentId(providerDocumentId: string): Promise<SignatureRequest | null> {
    const row = await dbCircuitBreaker.execute(() =>
      prisma.signatureRequest.findFirst({ where: { providerDocumentId } })
    );
    return row ? SignatureRequest.fromPrisma(row) : null;
  }

  async update(id: string, data: UpdateSignatureRequestData): Promise<SignatureRequest> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (data.status !== undefined) updateData['status'] = data.status;
    if (data.signerEmail !== undefined) updateData['signerEmail'] = data.signerEmail;
    if (data.providerDocumentId !== undefined) updateData['providerDocumentId'] = data.providerDocumentId;
    if ('signedDocumentUrl' in data) updateData['signedDocumentUrl'] = data.signedDocumentUrl ?? null;
    if ('rejectionReason' in data) updateData['rejectionReason'] = data.rejectionReason ?? null;
    if (data.sentAt !== undefined) updateData['sentAt'] = data.sentAt;
    if ('signedAt' in data) updateData['signedAt'] = data.signedAt ?? null;
    if ('rejectedAt' in data) updateData['rejectedAt'] = data.rejectedAt ?? null;

    const row = await dbCircuitBreaker.execute(() =>
      prisma.signatureRequest.update({
        where: { id },
        data: updateData,
      })
    );
    return SignatureRequest.fromPrisma(row);
  }

  async delete(id: string): Promise<void> {
    await dbCircuitBreaker.execute(() =>
      prisma.signatureRequest.delete({ where: { id } })
    );
  }
}
