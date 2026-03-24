import PDFDocument from 'pdfkit';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { ContractTemplateController } from '@infrastructure/express/controllers/ContractTemplateController';
import { generatePdfFromDocx } from '@infrastructure/signature/DocxPdfGenerator';
import { ContractData } from '@infrastructure/signature/PdfGenerator';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError, ValidationError, AuthorizationError } from '@application/shared/AppError';

export interface GenerateAndSendConsentDTO {
  saleId: string;
  signerEmail: string;
  signerPhone?: string;
  deliveryMethod?: 'email' | 'sms';
  /** ID de la plantilla de consentimiento a usar; si se omite se genera el PDF interno */
  templateId?: string;
}

/** Genera un PDF simple de autorización de llamada */
async function generateConsentPdf(data: {
  clientName: string;
  clientDni: string;
  saleId: string;
  date: Date;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const dateStr = data.date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    doc.fontSize(18).font('Helvetica-Bold').text('AUTORIZACIÓN DE GRABACIÓN DE LLAMADA', {
      align: 'center',
    });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#888')
      .text(`Referencia de venta: ${data.saleId}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica').fillColor('#000');
    doc.text(
      `D./Dña. ${data.clientName}, con DNI/NIE ${data.clientDni}, en adelante "el CLIENTE", ` +
      `mediante el presente documento AUTORIZA expresamente a la empresa a:`,
      { align: 'justify' }
    );
    doc.moveDown(0.8);

    const clausulas = [
      'Grabar las conversaciones telefónicas mantenidas con sus representantes o agentes comerciales, con el único fin de acreditar la prestación del consentimiento informado y garantizar la calidad del servicio.',
      'Conservar dichas grabaciones durante el tiempo necesario para cumplir con las obligaciones legales y contractuales derivadas de la relación comercial.',
      'Utilizar las grabaciones exclusivamente para los fines indicados, en cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).',
    ];

    clausulas.forEach((c, i) => {
      doc.font('Helvetica-Bold').text(`${i + 1}. `, { continued: true });
      doc.font('Helvetica').text(c, { align: 'justify' });
      doc.moveDown(0.5);
    });

    doc.moveDown(0.5);
    doc.font('Helvetica').text(
      'El CLIENTE declara haber sido informado de sus derechos de acceso, rectificación, supresión, ' +
      'oposición, limitación del tratamiento y portabilidad de los datos, pudiendo ejercerlos mediante ' +
      'solicitud escrita dirigida a la empresa.',
      { align: 'justify' }
    );
    doc.moveDown(1.5);
    doc.text(`Fecha: ${dateStr}`, { align: 'right' });
    doc.moveDown(2.5);

    doc.font('Helvetica-Bold').text('Firma del cliente:', { continued: false });
    doc.moveDown(3);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).text(`${data.clientName} — DNI: ${data.clientDni}`, {
      align: 'center',
    });

    doc.end();
  });
}

export class GenerateAndSendConsentUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private signatureRepo: ISignatureRequestRepository,
    private signatureProvider: ISignatureProvider
  ) {}

  async execute(dto: GenerateAndSendConsentDTO, currentUser: CurrentUser): Promise<SignatureRequest> {
    checkRolePermission(
      currentUser,
      rolePermissions.signature.GenerateAndSendContractUseCase,
      'generar y enviar autorización de llamada'
    );

    const saleWithRelations = await this.saleRepo.findWithRelations(dto.saleId);
    if (!saleWithRelations) throw new NotFoundError('Venta', dto.saleId);

    // Verificar que la venta pertenece a la empresa del usuario
    if (saleWithRelations.sale.empresaId !== currentUser.empresaId) {
      throw new AuthorizationError('No tienes permisos para operar sobre esta venta');
    }

    const existing = await this.signatureRepo.findBySaleIdAndType(dto.saleId, 'consent');
    if (existing && existing.status === 'pending') {
      throw new ValidationError(
        'Ya existe una autorización de llamada pendiente de firma. Usa "Reenviar" si el cliente no la recibió.'
      );
    }

    const sale = saleWithRelations.sale;
    const clientSnapshot = sale.clientSnapshot as Record<string, any> | null;
    const clientName = `${clientSnapshot?.firstName ?? 'Cliente'} ${clientSnapshot?.lastName ?? ''}`.trim();
    const clientDni = clientSnapshot?.dni ?? '';

    let pdf: Buffer;
    if (dto.templateId) {
      const template = await ContractTemplateController.loadForPdf(dto.templateId, currentUser.empresaId);
      if (template.docxPath) {
        const contractData: ContractData = {
          saleId: sale.id,
          createdAt: new Date(),
          client: {
            firstName: clientSnapshot?.firstName ?? 'Cliente',
            lastName: clientSnapshot?.lastName ?? '',
            dni: clientSnapshot?.dni ?? '',
            email: clientSnapshot?.email ?? dto.signerEmail,
            phones: clientSnapshot?.phones ?? [],
            address: clientSnapshot?.address ?? undefined,
          },
          items: [],
          totalAmount: 0,
        };
        pdf = await generatePdfFromDocx(template.docxPath, contractData);
      } else {
        pdf = await generateConsentPdf({ clientName, clientDni, saleId: sale.id, date: new Date() });
      }
    } else {
      pdf = await generateConsentPdf({ clientName, clientDni, saleId: sale.id, date: new Date() });
    }

    const signerContact = dto.deliveryMethod === 'sms'
      ? (dto.signerPhone ?? dto.signerEmail)
      : dto.signerEmail;

    const { documentId } = await this.signatureProvider.sendDocument(pdf, signerContact, {
      saleId: sale.id,
      clientName,
      signerEmail: dto.signerEmail,
      signerPhone: dto.signerPhone,
      deliveryMethod: dto.deliveryMethod,
    });

    let consentRequest: SignatureRequest;
    if (existing) {
      consentRequest = await this.signatureRepo.update(existing.id, {
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
      consentRequest = await this.signatureRepo.create({
        saleId: sale.id,
        documentType: 'consent',
        status: 'pending',
        signerEmail: signerContact,
        providerDocumentId: documentId,
        sentAt: new Date(),
      });
    }

    await this.saleRepo.addHistory({
      saleId: sale.id,
      userId: currentUser.id,
      action: 'consent_sent',
      payload: {
        signerEmail: signerContact,
        deliveryMethod: dto.deliveryMethod ?? 'email',
        providerDocumentId: documentId,
        consentRequestId: consentRequest.id,
      },
    });

    return consentRequest;
  }
}
