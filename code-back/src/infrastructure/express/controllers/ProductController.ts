import { Request, Response, NextFunction } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { parsePaginationOptions } from '@domain/types';
import { AuthenticationError, ValidationError } from '@application/shared/AppError';

export class ProductController {
  static async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const products = await serviceContainer.listProductsUseCase.execute(currentUser);
      res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  }

  static async listProductsPaginated(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const pagination = parsePaginationOptions(
        req.query.page as string | undefined,
        req.query.limit as string | undefined
      );

      const result = await serviceContainer.productRepository.findAllPaginated(pagination);

      res.status(200).json({
        data: result.data.map((p) => p.toPrisma()),
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const product = await serviceContainer.getProductUseCase.execute(req.body, currentUser);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const product = await serviceContainer.createProductUseCase.execute(req.body, currentUser);
      res.status(201).json({ message: 'Producto creado correctamente', product });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const id = (req.params as Record<string, string>).id;
      if (!id) throw new ValidationError('ID de producto no proporcionado');

      const product = await serviceContainer.updateProductUseCase.execute(
        { id, ...req.body },
        currentUser
      );

      res.status(200).json({ message: 'Producto actualizado correctamente', product });
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const id = (req.params as Record<string, string>).id;
      const product = await serviceContainer.toggleProductActiveUseCase.execute(
        { id },
        currentUser
      );

      res.status(200).json({
        message: `Producto ${product.active ? 'activado' : 'desactivado'} correctamente`,
        product,
      });
    } catch (error) {
      next(error);
    }
  }
}
