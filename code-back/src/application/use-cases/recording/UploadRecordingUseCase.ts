import { Recording } from '@domain/entities/Recording';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError } from '@application/shared/AppError';

export interface UploadRecordingDTO {
  saleId: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  size: number;
}

export class UploadRecordingUseCase {
  constructor(
    private recordingRepo: IRecordingRepository,
    private saleRepo: ISaleRepository
  ) {}

  async execute(dto: UploadRecordingDTO, currentUser: CurrentUser): Promise<Recording> {
    checkRolePermission(
      currentUser,
      rolePermissions.recording.UploadRecordingUseCase,
      'subir grabación'
    );

    // Verificar que la venta existe
    const sale = await this.saleRepo.findById(dto.saleId);
    if (!sale) {
      throw new NotFoundError('Venta', dto.saleId);
    }

    // Crear registro en BD
    const recording = await this.recordingRepo.create({
      saleId: dto.saleId,
      filename: dto.filename,
      storagePath: dto.storagePath,
      mimeType: dto.mimeType,
      size: dto.size,
      uploadedById: currentUser.id,
    });

    // Registrar en historial de la venta
    await this.saleRepo.addHistory({
      saleId: dto.saleId,
      userId: currentUser.id,
      action: 'upload_recording',
      payload: {
        recordingId: recording.id,
        filename: dto.filename,
      },
    });

    return recording;
  }
}
