import { GetSignatureStatusUseCase } from '@application/use-cases/signature/GetSignatureStatusUseCase';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { HandleSignatureWebhookUseCase } from '@application/use-cases/signature/HandleSignatureWebhookUseCase';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError } from '@application/shared/AppError';

describe('GetSignatureStatusUseCase', () => {
  let useCase: GetSignatureStatusUseCase;
  let mockSignatureRepo: jest.Mocked<ISignatureRequestRepository>;
  let mockSignatureProvider: jest.Mocked<ISignatureProvider>;
  let mockHandleWebhook: jest.Mocked<HandleSignatureWebhookUseCase>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const pendingRequest = new SignatureRequest(
    'sig-1', 'sale-123', 'contract',
      'pending', 'client@example.com',
    'doc-provider-123', null, null,
    new Date('2024-01-01'), null, null,
    new Date('2024-01-01'), new Date('2024-01-01')
  );

  const signedRequest = new SignatureRequest(
    'sig-2', 'sale-456', 'contract',
      'signed', 'client@example.com',
    'doc-123', 'https://signed-doc.url', null,
    new Date('2024-01-01'), new Date('2024-01-15'), null,
    new Date('2024-01-01'), new Date('2024-01-15')
  );

  beforeEach(() => {
    jest.clearAllMocks();

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
      getDocumentStatus: jest.fn().mockResolvedValue({ status: 'pending' }),
      cancelDocument: jest.fn(),
    };

    mockHandleWebhook = {
      execute: jest.fn(),
    } as any;

    useCase = new GetSignatureStatusUseCase(
      mockSignatureRepo,
      mockSignatureProvider,
      mockHandleWebhook
    );
  });

  describe('execute', () => {
    it('should return signature request when found (non-pending)', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(signedRequest);

      const result = await useCase.execute('sale-456', mockUser);

      expect(result).toEqual(signedRequest);
      expect(mockSignatureRepo.findBySaleIdAndType).toHaveBeenCalledWith('sale-456', 'contract');
      expect(mockSignatureProvider.getDocumentStatus).not.toHaveBeenCalled();
    });

    it('should return null when no signature request exists', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(null);

      const result = await useCase.execute('sale-123', mockUser);

      expect(result).toBeNull();
      expect(mockSignatureProvider.getDocumentStatus).not.toHaveBeenCalled();
    });

    it('should poll provider when status is pending and update DB if signed', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingRequest);
      mockSignatureProvider.getDocumentStatus.mockResolvedValue({ status: 'signed' });
      mockHandleWebhook.execute.mockResolvedValue(signedRequest);

      const result = await useCase.execute('sale-123', mockUser);

      expect(mockSignatureProvider.getDocumentStatus).toHaveBeenCalledWith('doc-provider-123');
      expect(mockHandleWebhook.execute).toHaveBeenCalledWith({
        providerDocumentId: 'doc-provider-123',
        event: 'signed',
        rejectionReason: undefined,
      });
      expect(result).toEqual(signedRequest);
    });

    it('should poll provider when status is pending and update DB if rejected', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingRequest);
      mockSignatureProvider.getDocumentStatus.mockResolvedValue({ status: 'rejected' });
      const rejectedRequest = new SignatureRequest(
        'sig-1', 'sale-123', 'contract',
      'rejected', 'client@example.com',
        'doc-provider-123', null, 'Rechazado',
        new Date('2024-01-01'), null, new Date('2024-01-02'),
        new Date('2024-01-01'), new Date('2024-01-02')
      );
      mockHandleWebhook.execute.mockResolvedValue(rejectedRequest);

      const result = await useCase.execute('sale-123', mockUser);

      expect(mockHandleWebhook.execute).toHaveBeenCalledWith({
        providerDocumentId: 'doc-provider-123',
        event: 'rejected',
        rejectionReason: 'Rechazado por el firmante',
      });
      expect(result).toEqual(rejectedRequest);
    });

    it('should return DB status if provider poll returns pending', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingRequest);
      mockSignatureProvider.getDocumentStatus.mockResolvedValue({ status: 'pending' });

      const result = await useCase.execute('sale-123', mockUser);

      expect(mockSignatureProvider.getDocumentStatus).toHaveBeenCalledWith('doc-provider-123');
      expect(mockHandleWebhook.execute).not.toHaveBeenCalled();
      expect(result).toEqual(pendingRequest);
    });

    it('should return DB status if provider poll fails', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingRequest);
      mockSignatureProvider.getDocumentStatus.mockRejectedValue(new Error('Network error'));

      const result = await useCase.execute('sale-123', mockUser);

      expect(result).toEqual(pendingRequest);
      expect(mockHandleWebhook.execute).not.toHaveBeenCalled();
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(signedRequest);

      const result = await useCase.execute('sale-456', coordinadorUser);

      expect(result).toEqual(signedRequest);
    });

    it('should work with coordinador role', async () => {
      const verificadorUser: CurrentUser = { id: 'u3', role: 'coordinador', firstName: 'V', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(null);

      const result = await useCase.execute('sale-123', verificadorUser);

      expect(result).toBeNull();
    });

    it('should work with comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(signedRequest);

      const result = await useCase.execute('sale-456', comercialUser);

      expect(result).toEqual(signedRequest);
    });

    it('should throw AuthorizationError for unknown role', async () => {
      const unknownUser: CurrentUser = { id: 'u5', role: 'unknown_role' as any, firstName: 'U', empresaId: '00000000-0000-0000-0000-000000000001' };

      await expect(useCase.execute('sale-123', unknownUser)).rejects.toThrow(AuthorizationError);
      expect(mockSignatureRepo.findBySaleId).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute('sale-123', mockUser)).rejects.toThrow('DB error');
    });
  });
});
