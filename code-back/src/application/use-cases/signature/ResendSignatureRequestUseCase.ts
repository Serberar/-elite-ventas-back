import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { PdfGenerator } from '@infrastructure/signature/PdfGenerator';
import { generatePdfFromDocx } from '@infrastructure/signature/DocxPdfGenerator';
import { ContractTemplateController } from '@infrastructure/express/controllers/ContractTemplateController';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError, ValidationError, AuthorizationError } from '@application/shared/AppError';

export interface ResendSignatureRequestDTO {
  saleId: string;
  signerEmail?: string; // si se cambia el email del firmante
}

export class ResendSignatureRequestUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private signatureRepo: ISignatureRequestRepository,
    private signatureProvider: ISignatureProvider,
    private pdfGenerator: PdfGenerator,
  ) {}

  async execute(dto: ResendSignatureRequestDTO, currentUser: CurrentUser): Promise<SignatureRequest> {
    checkRolePermission(
      currentUser,
      rolePermissions.signature.ResendSignatureRequestUseCase,
      'reenviar solicitud de firma'
    );

    const saleWithRelations = await this.saleRepo.findWithRelations(dto.saleId);
    if (!saleWithRelations) throw new NotFoundError('Venta', dto.saleId);

    const sale = saleWithRelations.sale;

    if (sale.empresaId !== currentUser.empresaId) {
      throw new AuthorizationError('No tienes permisos para operar sobre esta venta');
    }

    const existing = await this.signatureRepo.findBySaleIdAndType(dto.saleId, 'contract');
    if (!existing) {
      throw new ValidationError('No existe solicitud de firma para esta venta. Usa "Enviar contrato" primero.');
    }

    if (existing.status === 'signed') {
      throw new ValidationError('El contrato ya está firmado. No es necesario reenviar.');
    }

    const signerEmail = dto.signerEmail ?? existing.signerEmail;

    // Cancelar documento anterior en el proveedor (si existe)
    if (existing.providerDocumentId) {
      await this.signatureProvider.cancelDocument(existing.providerDocumentId);
    }

    // Reconstruir datos del cliente desde snapshot
    const clientSnapshot = sale.clientSnapshot as Record<string, any> | null;
    const addressSnapshot = sale.addressSnapshot as Record<string, any> | null;

    const clientData = {
      firstName: clientSnapshot?.firstName ?? 'Cliente',
      lastName: clientSnapshot?.lastName ?? '',
      dni: clientSnapshot?.dni ?? '',
      email: clientSnapshot?.email,
      phones: clientSnapshot?.phones,
      address: addressSnapshot ? {
        address: addressSnapshot.address,
        cupsLuz: addressSnapshot.cupsLuz,
        cupsGas: addressSnapshot.cupsGas,
      } : undefined,
    };

    // Cargar plantilla de la empresa y generar PDF
    const contractConfig = await ContractTemplateController.loadForPdf(undefined, currentUser.empresaId);
    const contractData = {
      saleId: sale.id,
      createdAt: sale.createdAt,
      client: clientData,
      items: saleWithRelations.items.map((i) => ({
        nameSnapshot: i.nameSnapshot,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        finalPrice: Number(i.finalPrice),
        tipoSnapshot: (i as any).tipoSnapshot ?? null,
        periodoSnapshot: (i as any).periodoSnapshot ?? null,
        precioBaseSnapshot: (i as any).precioBaseSnapshot != null ? Number((i as any).precioBaseSnapshot) : null,
        precioConsumoSnapshot: (i as any).precioConsumoSnapshot != null ? Number((i as any).precioConsumoSnapshot) : null,
        unidadConsumoSnapshot: (i as any).unidadConsumoSnapshot ?? null,
      })),
      totalAmount: Number(sale.totalAmount),
      comercial: sale.comercial ?? undefined,
    };

    const pdf = contractConfig.docxPath
      ? await generatePdfFromDocx(contractConfig.docxPath, contractData)
      : await this.pdfGenerator.generate(contractData, contractConfig);

    const clientFullName = `${clientData.firstName} ${clientData.lastName}`.trim();
    const { documentId } = await this.signatureProvider.sendDocument(pdf, signerEmail, {
      saleId: sale.id,
      clientName: clientFullName,
      signerEmail,
    });

    const updated = await this.signatureRepo.update(existing.id, {
      status: 'pending',
      signerEmail,
      providerDocumentId: documentId,
      sentAt: new Date(),
      signedAt: undefined,
      signedDocumentUrl: undefined,
      rejectionReason: undefined,
      rejectedAt: undefined,
    });

    await this.saleRepo.addHistory({
      saleId: sale.id,
      userId: currentUser.id,
      action: 'signature_resent',
      payload: {
        signerEmail,
        newProviderDocumentId: documentId,
        previousProviderDocumentId: existing.providerDocumentId,
      },
    });

    return updated;
  }
}
