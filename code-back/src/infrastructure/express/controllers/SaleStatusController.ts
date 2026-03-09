import { Request, Response, NextFunction } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError } from '@application/shared/AppError';

export class SaleStatusController {
  static async listSaleStatuses(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const statuses = await serviceContainer.listSaleStatusUseCase.execute(currentUser);
      res.status(200).json(statuses);
    } catch (error) {
      next(error);
    }
  }

  static async createSaleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const status = await serviceContainer.createSaleStatusUseCase.execute(req.body, currentUser);
      res.status(201).json({ message: 'Estado de venta creado correctamente', status });
    } catch (error) {
      next(error);
    }
  }

  static async updateSaleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { id } = req.params;
      const status = await serviceContainer.updateSaleStatusUseCase.execute(
        { ...req.body, id },
        currentUser
      );

      res.status(200).json({ message: 'Estado de venta actualizado correctamente', status });
    } catch (error) {
      next(error);
    }
  }

  static async reorderSaleStatuses(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const statuses = await serviceContainer.reorderSaleStatusesUseCase.execute(req.body, currentUser);
      res.status(200).json(statuses);
    } catch (error) {
      next(error);
    }
  }

  static async deleteSaleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { id } = req.params;
      await serviceContainer.deleteSaleStatusUseCase.execute(id, currentUser);
      res.status(200).json({ message: 'Estado de venta eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
