export type SignatureStatus = 'pending' | 'signed' | 'rejected';

export class SignatureRequest {
  constructor(
    public readonly id: string,
    public readonly saleId: string,
    public readonly status: SignatureStatus,
    public readonly signerEmail: string,
    public readonly providerDocumentId: string | null,
    public readonly signedDocumentUrl: string | null,
    public readonly rejectionReason: string | null,
    public readonly sentAt: Date | null,
    public readonly signedAt: Date | null,
    public readonly rejectedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    saleId: string;
    status: string;
    signerEmail: string;
    providerDocumentId?: string | null;
    signedDocumentUrl?: string | null;
    rejectionReason?: string | null;
    sentAt?: Date | null;
    signedAt?: Date | null;
    rejectedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SignatureRequest {
    return new SignatureRequest(
      data.id,
      data.saleId,
      data.status as SignatureStatus,
      data.signerEmail,
      data.providerDocumentId ?? null,
      data.signedDocumentUrl ?? null,
      data.rejectionReason ?? null,
      data.sentAt ?? null,
      data.signedAt ?? null,
      data.rejectedAt ?? null,
      data.createdAt,
      data.updatedAt
    );
  }

  toPrisma() {
    return {
      id: this.id,
      saleId: this.saleId,
      status: this.status,
      signerEmail: this.signerEmail,
      providerDocumentId: this.providerDocumentId,
      signedDocumentUrl: this.signedDocumentUrl,
      rejectionReason: this.rejectionReason,
      sentAt: this.sentAt,
      signedAt: this.signedAt,
      rejectedAt: this.rejectedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
