import { ResendSignatureRequestUseCase } from '@application/use-cases/signature/ResendSignatureRequestUseCase';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { PdfGenerator } from '@infrastructure/signature/PdfGenerator';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError, ValidationError } from '@application/shared/AppError';

jest.mock('@infrastructure/express/controllers/ContractTemplateController', () => ({
  ContractTemplateController: {
    loadForPdf: jest.fn().mockResolvedValue({ docxPath: null, seccionesContrato: [], paginasExtra: [] }),
  },
}));

describe('ResendSignatureRequestUseCase', () => {
  let useCase: ResendSignatureRequestUseCase;
  let mockSaleRepo: jest.Mocked<ISaleRepository>;
  let mockSignatureRepo: jest.Mocked<ISignatureRequestRepository>;
  let mockSignatureProvider: jest.Mocked<ISignatureProvider>;
  let mockPdfGenerator: jest.Mocked<PdfGenerator>;

  const adminUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin', empresaId: '00000000-0000-0000-0000-000000000001' };
  const coordinadorUser: CurrentUser = { id: 'user-2', role: 'coordinador', firstName: 'Coord', empresaId: '00000000-0000-0000-0000-000000000001' };
  const verificadorUser: CurrentUser = { id: 'user-3', role: 'coordinador', firstName: 'Verif', empresaId: '00000000-0000-0000-0000-000000000001' };
  const comercialUser: CurrentUser = { id: 'user-4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };

  const mockPdfBuffer = Buffer.from('pdf-content');

  const baseSaleWithRelations = {
    sale: {
      id: 'sale-123',
      clientId: 'client-1',
      statusId: 'status-1',
      empresaId: '00000000-0000-0000-0000-000000000001',
      totalAmount: 500,
      clientSnapshot: {
        firstName: 'John',
        lastName: 'Doe',
        dni: '12345678A',
        email: 'john@example.com',
        phones: ['612345678'],
      },
      addressSnapshot: {
        address: 'Calle Mayor 1',
        cupsLuz: 'ES001234',
        cupsGas: null,
      },
      comercial: { id: 'user-1', firstName: 'Sales', lastName: 'Person' },
      createdAt: new Date('2024-01-15'),
    },
    items: [
      { nameSnapshot: 'Luz Hogar', quantity: 1, unitPrice: 300, finalPrice: 300 },
      { nameSnapshot: 'Gas Hogar', quantity: 1, unitPrice: 200, finalPrice: 200 },
    ],
    status: null,
    assignments: [],
    histories: [],
    signatureRequest: null,
  };

  const pendingSignature = new SignatureRequest(
    'sig-1', 'sale-123', 'contract',
      'pending', 'john@example.com',
    'doc-provider-old', null, null,
    new Date('2024-01-15'), null, null,
    new Date('2024-01-15'), new Date('2024-01-15')
  );

  const rejectedSignature = new SignatureRequest(
    'sig-1', 'sale-123', 'contract',
      'rejected', 'old@example.com',
    'doc-provider-old', null, 'Rechazado',
    new Date('2024-01-15'), null, new Date('2024-01-15'),
    new Date('2024-01-15'), new Date('2024-01-15')
  );

  const updatedSignature = new SignatureRequest(
    'sig-1', 'sale-123', 'contract',
      'pending', 'john@example.com',
    'doc-provider-new', null, null,
    new Date('2024-01-15'), null, null,
    new Date('2024-01-15'), new Date()
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockSaleRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findWithRelations: jest.fn(),
      update: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      addHistory: jest.fn(),
      list: jest.fn(),
      listPaginated: jest.fn(),
      listWithRelations: jest.fn(),
      listPaginatedWithRelations: jest.fn(),
      createWithItemsTransaction: jest.fn(),
      assignUser: jest.fn(),
      updateClientSnapshot: jest.fn(),
      getDistinctComerciales: jest.fn(),
    };

    mockSignatureRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySaleId: jest.fn(),
      findBySaleIdAndType: jest.fn(),
      findByProviderDocumentId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockSignatureProvider = {
      sendDocument: jest.fn(),
      getDocumentStatus: jest.fn(),
      cancelDocument: jest.fn(),
    };

    mockPdfGenerator = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<PdfGenerator>;

    useCase = new ResendSignatureRequestUseCase(
      mockSaleRepo,
      mockSignatureRepo,
      mockSignatureProvider,
      mockPdfGenerator,
    );

    // Defaults
    mockSaleRepo.findWithRelations.mockResolvedValue(baseSaleWithRelations as never);
    mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingSignature);
    mockPdfGenerator.generate.mockResolvedValue(mockPdfBuffer);
    mockSignatureProvider.cancelDocument.mockResolvedValue(undefined as never);
    mockSignatureProvider.sendDocument.mockResolvedValue({ documentId: 'doc-provider-new' });
    mockSignatureRepo.update.mockResolvedValue(updatedSignature);
    mockSaleRepo.addHistory.mockResolvedValue(undefined as never);
  });

  describe('autorización', () => {
    it('should execute for administrador', async () => {
      const result = await useCase.execute({ saleId: 'sale-123' }, adminUser);
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should execute for coordinador', async () => {
      const result = await useCase.execute({ saleId: 'sale-123' }, coordinadorUser);
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should execute for coordinador', async () => {
      const result = await useCase.execute({ saleId: 'sale-123' }, verificadorUser);
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should execute for comercial', async () => {
      const result = await useCase.execute({ saleId: 'sale-123' }, comercialUser);
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should throw AuthorizationError for unknown role', async () => {
      const unknownUser: CurrentUser = { id: 'u', role: 'unknown' as never, firstName: 'X', empresaId: '00000000-0000-0000-0000-000000000001' };
      await expect(
        useCase.execute({ saleId: 'sale-123' }, unknownUser)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('errores de validación', () => {
    it('should throw NotFoundError when sale does not exist', async () => {
      mockSaleRepo.findWithRelations.mockResolvedValue(null);

      await expect(
        useCase.execute({ saleId: 'no-existe' }, adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when no signature request exists', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(null);

      await expect(
        useCase.execute({ saleId: 'sale-123' }, adminUser)
      ).rejects.toThrow(ValidationError);

      expect(mockPdfGenerator.generate).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when contract is already signed', async () => {
      const signedSignature = new SignatureRequest(
        'sig-1', 'sale-123', 'contract',
      'signed', 'john@example.com',
        'doc-provider-old', 'https://signed-doc.pdf', null,
        new Date(), new Date(), null,
        new Date(), new Date()
      );
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(signedSignature);

      await expect(
        useCase.execute({ saleId: 'sale-123' }, adminUser)
      ).rejects.toThrow(ValidationError);

      expect(mockSignatureProvider.cancelDocument).not.toHaveBeenCalled();
      expect(mockPdfGenerator.generate).not.toHaveBeenCalled();
    });
  });

  describe('happy path — reenvío con documento anterior', () => {
    it('should cancel previous provider document and resend', async () => {
      const result = await useCase.execute({ saleId: 'sale-123' }, adminUser);

      expect(mockSignatureProvider.cancelDocument).toHaveBeenCalledWith('doc-provider-old');
      expect(mockPdfGenerator.generate).toHaveBeenCalledTimes(1);
      expect(mockSignatureProvider.sendDocument).toHaveBeenCalledWith(
        mockPdfBuffer,
        'john@example.com',
        expect.objectContaining({ saleId: 'sale-123' })
      );
      expect(mockSignatureRepo.update).toHaveBeenCalledWith(
        'sig-1',
        expect.objectContaining({
          status: 'pending',
          providerDocumentId: 'doc-provider-new',
          signerEmail: 'john@example.com',
        })
      );
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should add sale history with signature_resent action', async () => {
      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          saleId: 'sale-123',
          userId: adminUser.id,
          action: 'signature_resent',
          payload: expect.objectContaining({
            signerEmail: 'john@example.com',
            newProviderDocumentId: 'doc-provider-new',
            previousProviderDocumentId: 'doc-provider-old',
          }),
        })
      );
    });

    it('should update, not create, the signature request', async () => {
      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      expect(mockSignatureRepo.update).toHaveBeenCalledTimes(1);
      expect(mockSignatureRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('happy path — reenvío sin documento anterior', () => {
    it('should skip cancel when providerDocumentId is null', async () => {
      const signatureWithoutDoc = new SignatureRequest(
        'sig-1', 'sale-123', 'contract',
      'rejected', 'john@example.com',
        null, null, 'Error al enviar',
        new Date(), null, null,
        new Date(), new Date()
      );
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(signatureWithoutDoc);

      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      expect(mockSignatureProvider.cancelDocument).not.toHaveBeenCalled();
      expect(mockPdfGenerator.generate).toHaveBeenCalledTimes(1);
      expect(mockSignatureProvider.sendDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('email del firmante', () => {
    it('should use existing signerEmail when dto.signerEmail is not provided', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(rejectedSignature); // email: old@example.com

      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      expect(mockSignatureProvider.sendDocument).toHaveBeenCalledWith(
        expect.anything(),
        'old@example.com',
        expect.objectContaining({ signerEmail: 'old@example.com' })
      );
    });

    it('should use dto.signerEmail when provided, overriding existing', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(rejectedSignature); // email: old@example.com

      await useCase.execute({ saleId: 'sale-123', signerEmail: 'nuevo@example.com' }, adminUser);

      expect(mockSignatureProvider.sendDocument).toHaveBeenCalledWith(
        expect.anything(),
        'nuevo@example.com',
        expect.objectContaining({ signerEmail: 'nuevo@example.com' })
      );
    });
  });

  describe('construcción del snapshot del cliente', () => {
    it('should use clientSnapshot data in PDF generation', async () => {
      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.client.firstName).toBe('John');
      expect(pdfCall.client.lastName).toBe('Doe');
      expect(pdfCall.client.dni).toBe('12345678A');
    });

    it('should include address snapshot in PDF data', async () => {
      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.client.address).toEqual({
        address: 'Calle Mayor 1',
        cupsLuz: 'ES001234',
        cupsGas: null,
      });
    });

    it('should handle null address snapshot', async () => {
      const saleWithoutAddress = {
        ...baseSaleWithRelations,
        sale: { ...baseSaleWithRelations.sale, addressSnapshot: null },
      };
      mockSaleRepo.findWithRelations.mockResolvedValue(saleWithoutAddress as never);

      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.client.address).toBeUndefined();
    });

    it('should use default "Cliente" when clientSnapshot is null', async () => {
      const saleWithoutSnapshot = {
        ...baseSaleWithRelations,
        sale: { ...baseSaleWithRelations.sale, clientSnapshot: null, addressSnapshot: null },
      };
      mockSaleRepo.findWithRelations.mockResolvedValue(saleWithoutSnapshot as never);

      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.client.firstName).toBe('Cliente');
      expect(pdfCall.client.lastName).toBe('');
    });

    it('should pass items to PDF generator', async () => {
      await useCase.execute({ saleId: 'sale-123' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.items).toHaveLength(2);
      expect(pdfCall.items[0].nameSnapshot).toBe('Luz Hogar');
    });
  });

  describe('manejo de errores', () => {
    it('should propagate PDF generation errors', async () => {
      mockPdfGenerator.generate.mockRejectedValue(new Error('PDF generation failed'));

      await expect(
        useCase.execute({ saleId: 'sale-123' }, adminUser)
      ).rejects.toThrow('PDF generation failed');
    });

    it('should propagate provider send errors', async () => {
      mockSignatureProvider.sendDocument.mockRejectedValue(new Error('Provider unavailable'));

      await expect(
        useCase.execute({ saleId: 'sale-123' }, adminUser)
      ).rejects.toThrow('Provider unavailable');
    });

    it('should propagate provider cancel errors', async () => {
      mockSignatureProvider.cancelDocument.mockRejectedValue(new Error('Cancel failed'));

      await expect(
        useCase.execute({ saleId: 'sale-123' }, adminUser)
      ).rejects.toThrow('Cancel failed');
    });
  });
});
