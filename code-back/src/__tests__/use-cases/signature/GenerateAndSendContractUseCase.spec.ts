import { GenerateAndSendContractUseCase } from '@application/use-cases/signature/GenerateAndSendContractUseCase';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { PdfGenerator } from '@infrastructure/signature/PdfGenerator';
import { SystemSettingPrismaRepository } from '@infrastructure/prisma/SystemSettingPrismaRepository';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError, ValidationError } from '@application/shared/AppError';

jest.mock('@infrastructure/express/controllers/ContractTemplateController', () => ({
  ContractTemplateController: {
    loadForPdf: jest.fn().mockResolvedValue({
      docxPath: null,
      logoPath: null,
      companyName: 'Test Company',
      address: 'Test Address',
      phone: '123456789',
      email: 'test@test.com',
      nif: 'B12345678',
    }),
  },
}));

describe('GenerateAndSendContractUseCase', () => {
  let useCase: GenerateAndSendContractUseCase;
  let mockSaleRepo: jest.Mocked<ISaleRepository>;
  let mockSignatureRepo: jest.Mocked<ISignatureRequestRepository>;
  let mockSignatureProvider: jest.Mocked<ISignatureProvider>;
  let mockPdfGenerator: jest.Mocked<PdfGenerator>;
  let mockSettingRepo: jest.Mocked<SystemSettingPrismaRepository>;

  const adminUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin', empresaId: '00000000-0000-0000-0000-000000000001' };
  const comercialUser: CurrentUser = { id: 'user-2', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };

  const mockPdfBuffer = Buffer.from('pdf-content');

  const baseSaleWithRelations = {
    sale: {
      id: 'sale-123',
      clientId: 'client-1',
      statusId: 'status-1',
      totalAmount: 500,
      empresaId: '00000000-0000-0000-0000-000000000001',
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

  const mockSignatureRequest = new SignatureRequest(
    'sig-1', 'sale-123', 'contract',
      'pending', 'john@example.com',
    'doc-provider-abc', null, null,
    new Date('2024-01-15'), null, null,
    new Date('2024-01-15'), new Date('2024-01-15')
  );

  const mockSignedConsent = new SignatureRequest(
    'consent-1', 'sale-123', 'consent',
    'signed', 'john@example.com',
    'consent-doc-id', null, null,
    new Date('2024-01-10'), new Date('2024-01-11'), null,
    new Date('2024-01-10'), new Date('2024-01-11')
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

    mockSettingRepo = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      getBool: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<SystemSettingPrismaRepository>;

    useCase = new GenerateAndSendContractUseCase(
      mockSaleRepo,
      mockSignatureRepo,
      mockSignatureProvider,
      mockPdfGenerator,
      mockSettingRepo
    );

    // Defaults
    mockSaleRepo.findWithRelations.mockResolvedValue(baseSaleWithRelations as never);
    mockSignatureRepo.findBySaleId.mockResolvedValue(null);
    // By default: consent is signed, no existing contract
    mockSignatureRepo.findBySaleIdAndType.mockImplementation(async (_saleId, type) => {
      if (type === 'consent') return mockSignedConsent;
      return null;
    });
    mockPdfGenerator.generate.mockResolvedValue(mockPdfBuffer);
    mockSignatureProvider.sendDocument.mockResolvedValue({ documentId: 'doc-provider-abc' });
    mockSignatureRepo.create.mockResolvedValue(mockSignatureRequest);
    mockSaleRepo.addHistory.mockResolvedValue(undefined as never);
  });

  describe('autorización', () => {
    it('should execute for administrador', async () => {
      const result = await useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser);
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should execute for comercial', async () => {
      const result = await useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, comercialUser);
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should throw AuthorizationError for unknown role', async () => {
      const unknownUser: CurrentUser = { id: 'u', role: 'unknown' as never, firstName: 'X', empresaId: '00000000-0000-0000-0000-000000000001' };
      await expect(
        useCase.execute({ saleId: 'sale-123', signerEmail: 'x@x.com' }, unknownUser)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('happy path — nueva solicitud (sin existente)', () => {
    it('should create a new SignatureRequest when none exists', async () => {
      const result = await useCase.execute(
        { saleId: 'sale-123', signerEmail: 'john@example.com' },
        adminUser
      );

      expect(mockPdfGenerator.generate).toHaveBeenCalledTimes(1);
      expect(mockSignatureProvider.sendDocument).toHaveBeenCalledWith(
        mockPdfBuffer,
        'john@example.com',
        expect.objectContaining({ saleId: 'sale-123', signerEmail: 'john@example.com' })
      );
      expect(mockSignatureRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          saleId: 'sale-123',
          status: 'pending',
          signerEmail: 'john@example.com',
          providerDocumentId: 'doc-provider-abc',
        })
      );
      expect(mockSignatureRepo.update).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(SignatureRequest);
    });

    it('should add sale history after creating', async () => {
      await useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser);

      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          saleId: 'sale-123',
          userId: adminUser.id,
          action: 'signature_sent',
        })
      );
    });
  });

  describe('happy path — actualiza existente no pendiente (rechazado/cancelado)', () => {
    it('should update existing non-pending signature request', async () => {
      const rejectedRequest = new SignatureRequest(
        'sig-old', 'sale-123', 'contract',
      'rejected', 'old@example.com',
        'old-doc-id', null, 'Rechazado',
        new Date(), null, new Date(),
        new Date(), new Date()
      );
      const updatedRequest = new SignatureRequest(
        'sig-old', 'sale-123', 'contract',
      'pending', 'john@example.com',
        'doc-provider-abc', null, null,
        new Date(), null, null,
        new Date(), new Date()
      );

      mockSignatureRepo.findBySaleIdAndType.mockImplementation(async (_saleId, type) => {
        if (type === 'consent') return mockSignedConsent;
        return rejectedRequest; // existing rejected contract
      });
      mockSignatureRepo.update.mockResolvedValue(updatedRequest);

      const result = await useCase.execute(
        { saleId: 'sale-123', signerEmail: 'john@example.com' },
        adminUser
      );

      expect(mockSignatureRepo.update).toHaveBeenCalledWith(
        'sig-old',
        expect.objectContaining({ status: 'pending', providerDocumentId: 'doc-provider-abc' })
      );
      expect(mockSignatureRepo.create).not.toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });
  });

  describe('errores de validación', () => {
    it('should throw NotFoundError when sale does not exist', async () => {
      mockSaleRepo.findWithRelations.mockResolvedValue(null);

      await expect(
        useCase.execute({ saleId: 'no-existe', signerEmail: 'x@x.com' }, adminUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when pending signature request already exists', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockImplementation(async (_saleId, type) => {
        if (type === 'consent') return mockSignedConsent;
        return mockSignatureRequest; // existing contract with status: 'pending'
      });

      await expect(
        useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser)
      ).rejects.toThrow(ValidationError);

      expect(mockPdfGenerator.generate).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when consent is not signed', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockImplementation(async (_saleId, type) => {
        if (type === 'consent') return null; // no consent
        return null;
      });

      await expect(
        useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser)
      ).rejects.toThrow(ValidationError);

      expect(mockPdfGenerator.generate).not.toHaveBeenCalled();
    });
  });

  describe('construcción del snapshot del cliente', () => {
    it('should use clientSnapshot data in PDF generation', async () => {
      await useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.client.firstName).toBe('John');
      expect(pdfCall.client.lastName).toBe('Doe');
      expect(pdfCall.client.dni).toBe('12345678A');
    });

    it('should use address snapshot when present', async () => {
      await useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser);

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

      await useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.client.address).toBeUndefined();
    });

    it('should use default "Cliente" when clientSnapshot is null', async () => {
      const saleWithoutSnapshot = {
        ...baseSaleWithRelations,
        sale: { ...baseSaleWithRelations.sale, clientSnapshot: null, addressSnapshot: null },
      };
      mockSaleRepo.findWithRelations.mockResolvedValue(saleWithoutSnapshot as never);

      await useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.client.firstName).toBe('Cliente');
      expect(pdfCall.client.lastName).toBe('');
    });

    it('should pass items to PDF generator', async () => {
      await useCase.execute({ saleId: 'sale-123', signerEmail: 'john@example.com' }, adminUser);

      const pdfCall = mockPdfGenerator.generate.mock.calls[0][0];
      expect(pdfCall.items).toHaveLength(2);
      expect(pdfCall.items[0].nameSnapshot).toBe('Luz Hogar');
    });
  });

  describe('manejo de errores', () => {
    it('should propagate PDF generation errors', async () => {
      mockPdfGenerator.generate.mockRejectedValue(new Error('PDF generation failed'));

      await expect(
        useCase.execute({ saleId: 'sale-123', signerEmail: 'x@x.com' }, adminUser)
      ).rejects.toThrow('PDF generation failed');
    });

    it('should propagate provider send errors', async () => {
      mockSignatureProvider.sendDocument.mockRejectedValue(new Error('Provider unavailable'));

      await expect(
        useCase.execute({ saleId: 'sale-123', signerEmail: 'x@x.com' }, adminUser)
      ).rejects.toThrow('Provider unavailable');
    });
  });
});
