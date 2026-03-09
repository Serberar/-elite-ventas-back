import { SaleController } from '@infrastructure/express/controllers/SaleController';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, AuthorizationError, NotFoundError, DatabaseError } from '@application/shared/AppError';

const mockSaleWithRelations = {
  sale: {
    toPrisma: () => ({
      id: 'sale-1',
      clientId: 'client-1',
      statusId: 'status-1',
      totalAmount: 200,
      notes: null,
      metadata: null,
      clientSnapshot: { firstName: 'John', lastName: 'Doe' },
      addressSnapshot: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
    }),
  },
  status: { id: 'status-1', name: 'Pending' },
  items: [],
  assignments: [],
  histories: [],
};

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    createSaleWithProductsUseCase: { execute: jest.fn() },
    listSalesWithFiltersUseCase: { execute: jest.fn() },
    addSaleItemUseCase: { execute: jest.fn() },
    updateSaleItemUseCase: { execute: jest.fn() },
    removeSaleItemUseCase: { execute: jest.fn() },
    changeSaleStatusUseCase: { execute: jest.fn() },
    getSalesStatsUseCase: { execute: jest.fn() },
    updateClientSnapshotUseCase: { execute: jest.fn() },
    saleRepository: {
      findWithRelations: jest.fn(),
      listPaginated: jest.fn(),
      listWithRelations: jest.fn(),
      listPaginatedWithRelations: jest.fn(),
      getDistinctComerciales: jest.fn(),
    },
  },
}));

describe('SaleController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const currentUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin' };

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    next = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = { user: currentUser, params: {}, body: {}, query: {} };
    jest.clearAllMocks();
  });

  describe('createSaleWithProducts', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.createSaleWithProducts(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 201 with created sale', async () => {
      const sale = { id: 'sale-1', clientId: 'client-1' };
      req.body = { client: { firstName: 'John' }, items: [] };
      (serviceContainer.createSaleWithProductsUseCase.execute as jest.Mock).mockResolvedValue(sale);
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.createSaleWithProducts(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Venta creada correctamente',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.body = { client: { firstName: 'John' } };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.createSaleWithProductsUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.createSaleWithProducts(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.body = { client: { firstName: 'John' } };
      const error = new Error('Database error');
      (serviceContainer.createSaleWithProductsUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.createSaleWithProducts(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('listSalesWithFilters', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.listSalesWithFilters(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with sales list', async () => {
      const salesWithRelations = [mockSaleWithRelations];
      req.query = {};
      (serviceContainer.saleRepository.listWithRelations as jest.Mock).mockResolvedValue(salesWithRelations);

      await SaleController.listSalesWithFilters(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.query = {};
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.saleRepository.listWithRelations as jest.Mock).mockRejectedValue(error);

      await SaleController.listSalesWithFilters(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.query = {};
      const error = new Error('Database error');
      (serviceContainer.saleRepository.listWithRelations as jest.Mock).mockRejectedValue(error);

      await SaleController.listSalesWithFilters(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('addSaleItem', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.addSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with added item', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { name: 'Product 1', quantity: 2, price: 100 };
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.addSaleItem(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Item añadido a la venta correctamente',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { name: 'Product 1', price: 100, quantity: 2 };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.addSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for not found errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { name: 'Product 1', price: 100, quantity: 2 };
      const error = new NotFoundError('Venta', 'sale-1');
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.addSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { name: 'Product 1', price: 100, quantity: 2 };
      const error = new Error('Database error');
      (serviceContainer.addSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.addSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateSaleItem', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.updateSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with updated item', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      req.body = { quantity: 3 };
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.updateSaleItem(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Item actualizado correctamente',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      req.body = { quantity: 3 };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.updateSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for not found errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      req.body = { quantity: 3 };
      const error = new NotFoundError('Item', 'item-1');
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.updateSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      req.body = { quantity: 3 };
      const error = new Error('Database error');
      (serviceContainer.updateSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.updateSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('removeSaleItem', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.removeSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 after removing item', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockResolvedValue({});
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.removeSaleItem(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Item eliminado correctamente',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.removeSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for not found errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      const error = new NotFoundError('Item', 'item-1');
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.removeSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.params = { saleId: 'sale-1', itemId: 'item-1' };
      const error = new Error('Database error');
      (serviceContainer.removeSaleItemUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.removeSaleItem(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('changeSaleStatus', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SaleController.changeSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with updated sale', async () => {
      const sale = { id: 'sale-1', statusId: 'status-2' };
      req.params = { saleId: 'sale-1' };
      req.body = { statusId: 'status-2' };
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockResolvedValue(sale);
      (serviceContainer.saleRepository.findWithRelations as jest.Mock).mockResolvedValue(
        mockSaleWithRelations
      );

      await SaleController.changeSaleStatus(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Estado de venta cambiado correctamente',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { statusId: 'status-2' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.changeSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for not found errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { statusId: 'status-2' };
      const error = new NotFoundError('Venta', 'sale-1');
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.changeSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.params = { saleId: 'sale-1' };
      req.body = { statusId: 'status-2' };
      const error = new Error('Database error');
      (serviceContainer.changeSaleStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SaleController.changeSaleStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
