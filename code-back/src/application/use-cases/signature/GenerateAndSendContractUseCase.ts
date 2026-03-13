import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { PdfGenerator } from '@infrastructure/signature/PdfGenerator';
import { generatePdfFromDocx } from '@infrastructure/signature/DocxPdfGenerator';
import { SystemSettingPrismaRepository } from '@infrastructure/prisma/SystemSettingPrismaRepository';
import { ContractConfig } from '@domain/types/ContractConfig';
import { ContractTemplateController } from '@infrastructure/express/controllers/ContractTemplateController';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError, ValidationError } from '@application/shared/AppError';

export interface GenerateAndSendContractDTO {
  saleId: string;
  signerEmail: string;
  /** Número de teléfono del firmante (requerido cuando deliveryMethod es 'sms') */
  signerPhone?: string;
  /** Método de entrega del contrato */
  deliveryMethod?: 'email' | 'sms';
  /** ID de la plantilla a usar; si se omite se usa la plantilla por defecto */
  templateId?: string;
}

export interface PreviewContractData {
  client: {
    firstName: string;
    lastName: string;
    dni: string;
    email?: string;
    phones?: string[];
    bankAccounts?: string[];
    address?: { address?: string; cupsLuz?: string; cupsGas?: string };
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    tipo?: string | null;
    periodo?: string | null;
    precioBase?: number | null;
    precioConsumo?: number | null;
    unidadConsumo?: string | null;
  }>;
  comercial?: string;
}

export class GenerateAndSendContractUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private signatureRepo: ISignatureRequestRepository,
    private signatureProvider: ISignatureProvider,
    private pdfGenerator: PdfGenerator,
    private settingRepo: SystemSettingPrismaRepository
  ) {}

  /** Genera el PDF de previsualización sin enviarlo. Usa la misma config que execute(). */
  async generatePreviewPdf(templateId: string | undefined, data: PreviewContractData): Promise<Buffer> {
    const contractConfig = await ContractTemplateController.loadForPdf(templateId);
    const totalAmount = data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const contractData = {
      saleId: 'PREVISUALIZACIÓN',
      createdAt: new Date(),
      client: data.client,
      items: data.items.map((i) => ({
        nameSnapshot: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        finalPrice: i.price * i.quantity,
        tipoSnapshot: i.tipo ?? null,
        periodoSnapshot: i.periodo ?? null,
        precioBaseSnapshot: i.precioBase ?? null,
        precioConsumoSnapshot: i.precioConsumo ?? null,
        unidadConsumoSnapshot: i.unidadConsumo ?? null,
      })),
      totalAmount,
      comercial: data.comercial,
    };
    if (contractConfig.docxPath) {
      return generatePdfFromDocx(contractConfig.docxPath, contractData);
    }
    return this.pdfGenerator.generate(contractData, contractConfig);
  }

  async execute(dto: GenerateAndSendContractDTO, currentUser: CurrentUser): Promise<SignatureRequest> {
    checkRolePermission(
      currentUser,
      rolePermissions.signature.GenerateAndSendContractUseCase,
      'generar y enviar contrato'
    );

    const saleWithRelations = await this.saleRepo.findWithRelations(dto.saleId);
    if (!saleWithRelations) throw new NotFoundError('Venta', dto.saleId);

    const sale = saleWithRelations.sale;

    // Si ya hay una solicitud pendiente, rechazar
    const existing = await this.signatureRepo.findBySaleId(dto.saleId);
    if (existing && existing.status === 'pending') {
      throw new ValidationError(
        'Ya existe un contrato pendiente de firma para esta venta. Usa "Reenviar" si el cliente no lo recibió.'
      );
    }

    // Construir datos del cliente desde snapshot
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

    // Cargar configuración de contrato y generar PDF
    const contractConfig = await ContractTemplateController.loadForPdf(dto.templateId);
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

    // Enviar al proveedor
    const clientFullName = `${clientData.firstName} ${clientData.lastName}`.trim();
    // Para SMS el contacto del firmante es el teléfono; para email, el correo
    const signerContact = dto.deliveryMethod === 'sms'
      ? (dto.signerPhone ?? dto.signerEmail)
      : dto.signerEmail;
    const { documentId } = await this.signatureProvider.sendDocument(pdf, signerContact, {
      saleId: sale.id,
      clientName: clientFullName,
      signerEmail: dto.signerEmail,
      signerPhone: dto.signerPhone,
      deliveryMethod: dto.deliveryMethod,
    });

    // Crear o actualizar SignatureRequest
    let signatureRequest: SignatureRequest;
    if (existing) {
      signatureRequest = await this.signatureRepo.update(existing.id, {
        status: 'pending',
        signerEmail: signerContact,
        providerDocumentId: documentId,
        sentAt: new Date(),
        signedAt: undefined,
        signedDocumentUrl: undefined,
        rejectionReason: undefined,
        rejectedAt: undefined,
      });
    } else {
      signatureRequest = await this.signatureRepo.create({
        saleId: sale.id,
        status: 'pending',
        signerEmail: signerContact,
        providerDocumentId: documentId,
        sentAt: new Date(),
      });
    }

    await this.saleRepo.addHistory({
      saleId: sale.id,
      userId: currentUser.id,
      action: 'signature_sent',
      payload: {
        signerEmail: signerContact,
        deliveryMethod: dto.deliveryMethod ?? 'email',
        providerDocumentId: documentId,
        signatureRequestId: signatureRequest.id,
      },
    });

    return signatureRequest;
  }
}
