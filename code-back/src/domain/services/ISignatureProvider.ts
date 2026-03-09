export interface SignatureMetadata {
  saleId: string;
  clientName: string;
  signerEmail: string;
  signerPhone?: string;
  deliveryMethod?: 'email' | 'sms';
}

export interface SendDocumentResult {
  documentId: string;
}

export interface DocumentStatusResult {
  status: 'pending' | 'signed' | 'rejected';
  signedUrl?: string;
  rejectionReason?: string;
}

export interface ISignatureProvider {
  sendDocument(
    pdf: Buffer,
    signerEmail: string,
    metadata: SignatureMetadata
  ): Promise<SendDocumentResult>;

  getDocumentStatus(documentId: string): Promise<DocumentStatusResult>;

  cancelDocument(documentId: string): Promise<void>;
}
