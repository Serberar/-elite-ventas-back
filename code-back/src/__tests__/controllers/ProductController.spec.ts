import { ProductController } from '@infrastructure/express/controllers/ProductController';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '@application/shared/AppError';

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    listProductsUseCase: { execute: jest.fn() },
    getProductUseCase: { execute: jest.fn() },
    createProductUseCase: { execute: jest.fn() },
    updateProductUseCase: { execute: jest.fn() },
    toggleProductActiveUseCase: { execute: jest.fn() },
    productRepository: { findAllPaginated: jest.fn() },
  },
}));

describe('ProductController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const currentUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin', empresaId: '00000000-0000-0000-0000-000000000001' };

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    next = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = { user: currentUser, params: {}, body: {}, query: {} };
    jest.clearAllMocks();
  });

  describe('listProducts', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.listProducts(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with products list', async () => {
      const products = [{ id: 'product-1', name: 'Product 1' }];
      (serviceContainer.listProductsUseCase.execute as jest.Mock).mockResolvedValue(products);

      await ProductController.listProducts(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(products);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.listProductsUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.listProducts(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      const error = new Error('Database error');
      (serviceContainer.listProductsUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.listProducts(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProduct', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.getProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next with error if product not found', async () => {
      req.body = { id: 'product-1' };
      const error = new NotFoundError('Producto', 'product-1');
      (serviceContainer.getProductUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.getProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should return 200 with product', async () => {
      const product = { id: 'product-1', name: 'Product 1' };
      req.body = { id: 'product-1' };
      (serviceContainer.getProductUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.getProduct(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(product);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.body = { id: 'product-1' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.getProductUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.getProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createProduct', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.createProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 201 with created product', async () => {
      const product = { id: 'product-1', name: 'New Product' };
      req.body = { name: 'New Product', price: 100 };
      (serviceContainer.createProductUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.createProduct(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Producto creado correctamente',
        product,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.body = { name: 'New Product' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.createProductUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.createProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.body = { name: 'New Product' };
      const error = new Error('Database error');
      (serviceContainer.createProductUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.createProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateProduct', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.updateProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should call next with ValidationError if id not provided', async () => {
      req.params = {};
      req.body = { name: 'Updated Product' };

      await ProductController.updateProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should return 200 with updated product', async () => {
      const product = { id: 'product-1', name: 'Updated Product' };
      req.params = { id: 'product-1' };
      req.body = { name: 'Updated Product' };
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.updateProduct(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Producto actualizado correctamente',
        product,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.params = { id: 'product-1' };
      req.body = { name: 'Updated Product' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.updateProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for not found errors', async () => {
      req.params = { id: 'product-1' };
      req.body = { name: 'Updated Product' };
      const error = new NotFoundError('Producto', 'product-1');
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.updateProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for other errors', async () => {
      req.params = { id: 'product-1' };
      req.body = { name: 'Updated Product' };
      const error = new Error('Database error');
      (serviceContainer.updateProductUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.updateProduct(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('toggleActive', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await ProductController.toggleActive(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with activated product', async () => {
      const product = { id: 'product-1', name: 'Product', active: true };
      req.params = { id: 'product-1' };
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.toggleActive(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Producto activado correctamente',
        product,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 200 with deactivated product', async () => {
      const product = { id: 'product-1', name: 'Product', active: false };
      req.params = { id: 'product-1' };
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockResolvedValue(product);

      await ProductController.toggleActive(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Producto desactivado correctamente',
        product,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error for permission errors', async () => {
      req.params = { id: 'product-1' };
      const error = new AuthorizationError('No tiene permiso');
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.toggleActive(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with error for not found errors', async () => {
      req.params = { id: 'product-1' };
      const error = new NotFoundError('Producto', 'product-1');
      (serviceContainer.toggleProductActiveUseCase.execute as jest.Mock).mockRejectedValue(error);

      await ProductController.toggleActive(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
