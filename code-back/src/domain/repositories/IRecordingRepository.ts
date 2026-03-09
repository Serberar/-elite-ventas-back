import { Recording } from '@domain/entities/Recording';

export interface RecordingCreateInput {
  saleId: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  size: number;
  uploadedById?: string;
}

export interface IRecordingRepository {
  create(data: RecordingCreateInput): Promise<Recording>;
  findById(id: string): Promise<Recording | null>;
  findBySaleId(saleId: string): Promise<Recording[]>;
  delete(id: string): Promise<void>;
}
