import { CancelSignatureRequestUseCase } from '@application/use-cases/signature/CancelSignatureRequestUseCase';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

describe('CancelSignatureRequestUseCase', () => {
  let useCase: CancelSignatureRequestUseCase;
  let mockSignatureRepo: jest.Mocked<ISignatureRequestRepository>;
  let mockSignatureProvider: jest.Mocked<ISignatureProvider>;
  let mockSaleRepo: jest.Mocked<ISaleRepository>;

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

  const requestWithoutProvider = new SignatureRequest(
    'sig-2', 'sale-456', 'contract',
      'pending', 'client@example.com',
    null, null, null,
    new Date('2024-01-01'), null, null,
    new Date('2024-01-01'), new Date('2024-01-01')
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
      getDocumentStatus: jest.fn(),
      cancelDocument: jest.fn(),
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

    useCase = new CancelSignatureRequestUseCase(mockSignatureRepo, mockSignatureProvider, mockSaleRepo);
  });

  describe('execute', () => {
    it('should cancel signature request and call provider', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingRequest);
      mockSignatureProvider.cancelDocument.mockResolvedValue(undefined);
      mockSignatureRepo.delete.mockResolvedValue(undefined);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-123', mockUser);

      expect(mockSignatureRepo.findBySaleIdAndType).toHaveBeenCalledWith('sale-123', 'contract');
      expect(mockSignatureProvider.cancelDocument).toHaveBeenCalledWith('doc-provider-123');
      expect(mockSignatureRepo.delete).toHaveBeenCalledWith('sig-1');
      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(expect.objectContaining({
        action: 'signature_cancelled',
        saleId: 'sale-123',
      }));
    });

    it('should skip provider cancel when no providerDocumentId', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(requestWithoutProvider);
      mockSignatureRepo.delete.mockResolvedValue(undefined);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-456', mockUser);

      expect(mockSignatureProvider.cancelDocument).not.toHaveBeenCalled();
      expect(mockSignatureRepo.delete).toHaveBeenCalledWith('sig-2');
    });

    it('should throw NotFoundError when no signature request exists', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(null);

      await expect(useCase.execute('sale-123', mockUser)).rejects.toThrow(NotFoundError);
      expect(mockSignatureRepo.delete).not.toHaveBeenCalled();
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingRequest);
      mockSignatureProvider.cancelDocument.mockResolvedValue(undefined);
      mockSignatureRepo.delete.mockResolvedValue(undefined);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-123', coordinadorUser);

      expect(mockSignatureRepo.delete).toHaveBeenCalled();
    });

    it('should work with comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingRequest);
      mockSignatureProvider.cancelDocument.mockResolvedValue(undefined);
      mockSignatureRepo.delete.mockResolvedValue(undefined);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute('sale-123', comercialUser);

      expect(mockSignatureRepo.delete).toHaveBeenCalled();
    });

    it('should throw AuthorizationError for unknown role', async () => {
      const unknownUser: CurrentUser = { id: 'u5', role: 'unknown_role' as any, firstName: 'U', empresaId: '00000000-0000-0000-0000-000000000001' };

      await expect(useCase.execute('sale-123', unknownUser)).rejects.toThrow(AuthorizationError);
      expect(mockSignatureRepo.delete).not.toHaveBeenCalled();
    });

    it('should not return a value', async () => {
      mockSignatureRepo.findBySaleIdAndType.mockResolvedValue(pendingRequest);
      mockSignatureProvider.cancelDocument.mockResolvedValue(undefined);
      mockSignatureRepo.delete.mockResolvedValue(undefined);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      const result = await useCase.execute('sale-123', mockUser);

      expect(result).toBeUndefined();
    });
  });
});
