export class Recording {
  constructor(
    public readonly id: string,
    public readonly saleId: string,
    public readonly filename: string,
    public readonly storagePath: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly uploadedById: string | null,
    public readonly createdAt: Date
  ) {}

  static fromPrisma(data: {
    id: string;
    saleId: string;
    filename: string;
    storagePath: string;
    mimeType: string;
    size: number;
    uploadedById?: string | null;
    createdAt: Date;
  }): Recording {
    return new Recording(
      data.id,
      data.saleId,
      data.filename,
      data.storagePath,
      data.mimeType,
      data.size,
      data.uploadedById ?? null,
      data.createdAt
    );
  }

  toPrisma() {
    return {
      id: this.id,
      saleId: this.saleId,
      filename: this.filename,
      storagePath: this.storagePath,
      mimeType: this.mimeType,
      size: this.size,
      uploadedById: this.uploadedById,
      createdAt: this.createdAt,
    };
  }
}
