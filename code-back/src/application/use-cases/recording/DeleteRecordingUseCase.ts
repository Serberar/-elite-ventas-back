import fs from 'fs';
import path from 'path';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError, AuthorizationError } from '@application/shared/AppError';

const RECORDS_DIR = process.env.RECORDS_PATH || './records';

export class DeleteRecordingUseCase {
  constructor(
    private recordingRepo: IRecordingRepository,
    private saleRepo: ISaleRepository
  ) {}

  async execute(recordingId: string, currentUser: CurrentUser): Promise<void> {
    checkRolePermission(
      currentUser,
      rolePermissions.recording.DeleteRecordingUseCase,
      'eliminar grabación'
    );

    const recording = await this.recordingRepo.findById(recordingId);
    if (!recording) {
      throw new NotFoundError('Grabación', recordingId);
    }

    // Validar path traversal: asegurar que el archivo está dentro de RECORDS_DIR
    const resolvedRecordsDir = path.resolve(RECORDS_DIR);
    const filePath = path.resolve(RECORDS_DIR, recording.storagePath);

    if (!filePath.startsWith(resolvedRecordsDir + path.sep)) {
      throw new AuthorizationError('Acceso denegado: ruta inválida');
    }

    // Eliminar archivo del filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar registro de BD
    await this.recordingRepo.delete(recordingId);

    // Registrar en historial
    await this.saleRepo.addHistory({
      saleId: recording.saleId,
      userId: currentUser.id,
      action: 'delete_recording',
      payload: {
        recordingId: recording.id,
        filename: recording.filename,
      },
    });
  }
}
