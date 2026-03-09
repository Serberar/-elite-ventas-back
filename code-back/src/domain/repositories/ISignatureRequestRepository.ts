import { SignatureRequest, SignatureStatus } from '@domain/entities/SignatureRequest';

export interface CreateSignatureRequestData {
  saleId: string;
  status: SignatureStatus;
  signerEmail: string;
  providerDocumentId?: string;
  sentAt?: Date;
}

export interface UpdateSignatureRequestData {
  status?: SignatureStatus;
  signerEmail?: string;
  providerDocumentId?: string;
  signedDocumentUrl?: string | null;
  rejectionReason?: string | null;
  sentAt?: Date;
  signedAt?: Date | null;
  rejectedAt?: Date | null;
}

export interface ISignatureRequestRepository {
  create(data: CreateSignatureRequestData): Promise<SignatureRequest>;
  findById(id: string): Promise<SignatureRequest | null>;
  findBySaleId(saleId: string): Promise<SignatureRequest | null>;
  findByProviderDocumentId(providerDocumentId: string): Promise<SignatureRequest | null>;
  update(id: string, data: UpdateSignatureRequestData): Promise<SignatureRequest>;
  delete(id: string): Promise<void>;
}
