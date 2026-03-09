import { HandleSignatureWebhookUseCase } from '@application/use-cases/signature/HandleSignatureWebhookUseCase';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { Sale } from '@domain/entities/Sale';
import { NotFoundError, ValidationError } from '@application/shared/AppError';

describe('HandleSignatureWebhookUseCase', () => {
  let useCase: HandleSignatureWebhookUseCase;
  let mockSignatureRepo: jest.Mocked<ISignatureRequestRepository>;
  let mockSaleRepo: jest.Mocked<ISaleRepository>;
  let mockSaleStatusRepo: jest.Mocked<ISaleStatusRepository>;

  const pendingRequest = new SignatureRequest(
    'sig-1', 'sale-123', 'pending', 'client@example.com',
    'doc-provider-123', null, null,
    new Date('2024-01-01'), null, null,
    new Date('2024-01-01'), new Date('2024-01-01')
  );

  const signedRequest = new SignatureRequest(
    'sig-1', 'sale-123', 'signed', 'client@example.com',
    'doc-provider-123', 'https://signed.url', null,
    new Date('2024-01-01'), new Date('2024-01-15'), null,
    new Date('2024-01-01'), new Date('2024-01-15')
  );

  const rejectedRequest = new SignatureRequest(
    'sig-1', 'sale-123', 'rejected', 'client@example.com',
    'doc-provider-123', null, 'Client rejected',
    new Date('2024-01-01'), null, new Date('2024-01-10'),
    new Date('2024-01-01'), new Date('2024-01-10')
  );

  const firmadaStatus = new SaleStatus('status-firmada', 'Firmada', 10, '#28a745', true, false, false);
  const pendingFirmaStatus = new SaleStatus('status-pending', 'Pendiente de firma', 5, '#ffc107', false, false, false);

  const saleInPendingFirma = new Sale(
    'sale-123', 'client-1', 'status-pending', 0, null, null, null, null, null,
    new Date('2024-01-01'), new Date('2024-01-01'), null
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockSignatureRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySaleId: jest.fn(),
      findByProviderDocumentId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

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
    } as jest.Mocked<ISaleRepository>;

    mockSaleStatusRepo = {
      findById: jest.fn(),
      list: jest.fn(),
      findInitialStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ISaleStatusRepository>;

    useCase = new HandleSignatureWebhookUseCase(mockSignatureRepo, mockSaleRepo);
  });

  describe('execute', () => {
    it('should handle signed event', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(pendingRequest);
      mockSignatureRepo.update.mockResolvedValue(signedRequest);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      const result = await useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'signed',
        signedUrl: 'https://signed.url',
      });

      expect(result).toEqual(signedRequest);
      expect(mockSignatureRepo.update).toHaveBeenCalledWith('sig-1', expect.objectContaining({
        status: 'signed',
        signedDocumentUrl: 'https://signed.url',
      }));
      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(expect.objectContaining({
        action: 'signature_completed',
      }));
    });

    it('should handle rejected event', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(pendingRequest);
      mockSignatureRepo.update.mockResolvedValue(rejectedRequest);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      const result = await useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'rejected',
        rejectionReason: 'Client rejected',
      });

      expect(result).toEqual(rejectedRequest);
      expect(mockSignatureRepo.update).toHaveBeenCalledWith('sig-1', expect.objectContaining({
        status: 'rejected',
        rejectionReason: 'Client rejected',
      }));
      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(expect.objectContaining({
        action: 'signature_rejected',
      }));
    });

    it('should throw ValidationError when providerDocumentId is empty', async () => {
      await expect(useCase.execute({
        providerDocumentId: '',
        event: 'signed',
      })).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when signature request not found', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(null);

      await expect(useCase.execute({
        providerDocumentId: 'unknown-doc',
        event: 'signed',
      })).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when contract is already signed', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(signedRequest);

      await expect(useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'signed',
      })).rejects.toThrow(ValidationError);
      await expect(useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'signed',
      })).rejects.toThrow('El contrato ya estaba marcado como firmado');
    });

    it('should throw ValidationError for unknown event type', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(pendingRequest);

      await expect(useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'unknown_event' as any,
      })).rejects.toThrow(ValidationError);
    });

    it('should set signedDocumentUrl to null when not provided', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(pendingRequest);
      mockSignatureRepo.update.mockResolvedValue(signedRequest);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'signed',
      });

      expect(mockSignatureRepo.update).toHaveBeenCalledWith('sig-1', expect.objectContaining({
        signedDocumentUrl: null,
      }));
    });
  });

  describe('auto-status-change on signed event', () => {
    beforeEach(() => {
      useCase = new HandleSignatureWebhookUseCase(mockSignatureRepo, mockSaleRepo, mockSaleStatusRepo);
    });

    it('should change sale status to Firmada when signed', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(pendingRequest);
      mockSignatureRepo.update.mockResolvedValue(signedRequest);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);
      mockSaleRepo.update.mockResolvedValue({} as any);
      mockSaleStatusRepo.list.mockResolvedValue([pendingFirmaStatus, firmadaStatus]);
      mockSaleRepo.findById.mockResolvedValue(saleInPendingFirma);

      await useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'signed',
        signedUrl: 'https://signed.url',
      });

      expect(mockSaleRepo.update).toHaveBeenCalledWith('sale-123', expect.objectContaining({
        statusId: 'status-firmada',
        closedAt: expect.any(Date),
      }));
      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(expect.objectContaining({
        action: 'change_status',
        payload: expect.objectContaining({
          toName: 'Firmada',
          comment: 'Cambio automático por firma del contrato',
        }),
      }));
    });

    it('should not change status if sale is already Firmada', async () => {
      const alreadyFirmada = new Sale(
        'sale-123', 'client-1', 'status-firmada', 0, null, null, null, null, null,
        new Date('2024-01-01'), new Date('2024-01-01'), null
      );
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(pendingRequest);
      mockSignatureRepo.update.mockResolvedValue(signedRequest);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);
      mockSaleStatusRepo.list.mockResolvedValue([pendingFirmaStatus, firmadaStatus]);
      mockSaleRepo.findById.mockResolvedValue(alreadyFirmada);

      await useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'signed',
      });

      // update should not be called for the sale (only for signature)
      expect(mockSaleRepo.update).not.toHaveBeenCalled();
    });

    it('should not change status when no Firmada status exists', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(pendingRequest);
      mockSignatureRepo.update.mockResolvedValue(signedRequest);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);
      mockSaleStatusRepo.list.mockResolvedValue([pendingFirmaStatus]);

      await useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'signed',
      });

      expect(mockSaleRepo.update).not.toHaveBeenCalled();
    });

    it('should not change status on rejected event', async () => {
      mockSignatureRepo.findByProviderDocumentId.mockResolvedValue(pendingRequest);
      mockSignatureRepo.update.mockResolvedValue(rejectedRequest);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute({
        providerDocumentId: 'doc-provider-123',
        event: 'rejected',
      });

      expect(mockSaleStatusRepo.list).not.toHaveBeenCalled();
      expect(mockSaleRepo.update).not.toHaveBeenCalled();
    });
  });
});
