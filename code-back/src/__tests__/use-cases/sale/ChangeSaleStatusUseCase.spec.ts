import { ChangeSaleStatusUseCase } from '@application/use-cases/sale/ChangeSaleStatusUseCase';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { Sale } from '@domain/entities/Sale';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
  businessSaleStatusChanged: {
    inc: jest.fn(),
  },
}));

describe('ChangeSaleStatusUseCase', () => {
  let useCase: ChangeSaleStatusUseCase;
  let mockSaleRepo: jest.Mocked<ISaleRepository>;
  let mockStatusRepo: jest.Mocked<ISaleStatusRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
  };

  const mockSale = new Sale(
    'sale-123', 'client-1', 'status-1', 100, null, null, null, null, null,
    new Date('2024-01-01'), new Date('2024-01-01'), null
  );

  const regularStatus = new SaleStatus('status-2', 'En proceso', 2, '#00FF00', false, false, false);
  const finalStatus = new SaleStatus('status-final', 'Finalizado', 5, '#00FFFF', true, false, false);
  const previousStatus = new SaleStatus('status-1', 'Inicial', 1, '#FFFFFF', false, false, true);

  const updatedSale = new Sale(
    'sale-123', 'client-1', 'status-2', 100, null, null, null, null, null,
    new Date('2024-01-01'), new Date('2024-01-02'), null
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

    mockStatusRepo = {
      findById: jest.fn(),
      list: jest.fn(),
      findInitialStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new ChangeSaleStatusUseCase(mockSaleRepo, mockStatusRepo);
  });

  describe('execute', () => {
    it('should change sale status successfully', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockStatusRepo.findById
        .mockResolvedValueOnce(regularStatus)
        .mockResolvedValueOnce(previousStatus);
      mockSaleRepo.update.mockResolvedValue(updatedSale);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      const result = await useCase.execute(
        { saleId: 'sale-123', statusId: 'status-2' },
        mockUser
      );

      expect(result).toEqual(updatedSale);
      expect(mockSaleRepo.update).toHaveBeenCalledWith('sale-123', expect.objectContaining({
        statusId: 'status-2',
        closedAt: null,
      }));
    });

    it('should set closedAt when moving to final status as admin (no signatureRepo)', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockStatusRepo.findById
        .mockResolvedValueOnce(finalStatus)
        .mockResolvedValueOnce(previousStatus);
      mockSaleRepo.update.mockResolvedValue(updatedSale);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute({ saleId: 'sale-123', statusId: 'status-final' }, mockUser);

      expect(mockSaleRepo.update).toHaveBeenCalledWith('sale-123', expect.objectContaining({
        closedAt: expect.any(Date),
      }));
    });

    it('should add history with status change details', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockStatusRepo.findById
        .mockResolvedValueOnce(regularStatus)
        .mockResolvedValueOnce(previousStatus);
      mockSaleRepo.update.mockResolvedValue(updatedSale);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute({ saleId: 'sale-123', statusId: 'status-2' }, mockUser);

      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(expect.objectContaining({
        saleId: 'sale-123',
        userId: 'user-123',
        action: 'change_status',
      }));
    });

    it('should throw NotFoundError when sale does not exist', async () => {
      mockSaleRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ saleId: 'non-existent', statusId: 'status-2' }, mockUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when target status does not exist', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockStatusRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ saleId: 'sale-123', statusId: 'non-existent' }, mockUser)
      ).rejects.toThrow(NotFoundError);
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C' };
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockStatusRepo.findById
        .mockResolvedValueOnce(regularStatus)
        .mockResolvedValueOnce(previousStatus);
      mockSaleRepo.update.mockResolvedValue(updatedSale);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      const result = await useCase.execute(
        { saleId: 'sale-123', statusId: 'status-2' },
        coordinadorUser
      );

      expect(result).toEqual(updatedSale);
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com' };

      await expect(
        useCase.execute({ saleId: 'sale-123', statusId: 'status-2' }, comercialUser)
      ).rejects.toThrow(AuthorizationError);
    });

    it('should increment metrics on status change', async () => {
      const { businessSaleStatusChanged } = require('@infrastructure/observability/metrics/prometheusMetrics');
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockStatusRepo.findById
        .mockResolvedValueOnce(regularStatus)
        .mockResolvedValueOnce(previousStatus);
      mockSaleRepo.update.mockResolvedValue(updatedSale);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute({ saleId: 'sale-123', statusId: 'status-2' }, mockUser);

      expect(businessSaleStatusChanged.inc).toHaveBeenCalled();
    });

    it('should include comment in history payload', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockStatusRepo.findById
        .mockResolvedValueOnce(regularStatus)
        .mockResolvedValueOnce(previousStatus);
      mockSaleRepo.update.mockResolvedValue(updatedSale);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute(
        { saleId: 'sale-123', statusId: 'status-2', comment: 'Approved' },
        mockUser
      );

      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(expect.objectContaining({
        payload: expect.objectContaining({ comment: 'Approved' }),
      }));
    });
  });
});
