import { Request, Response, NextFunction } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { parsePaginationOptions } from '@domain/types';
import { AuthenticationError, ValidationError, DatabaseError, NotFoundError } from '@application/shared/AppError';

// Helper para formatear respuesta de venta con relaciones
function formatSaleResponse(saleWithRelations: NonNullable<Awaited<ReturnType<typeof serviceContainer.saleRepository.findWithRelations>>>) {
  const salePrisma = saleWithRelations.sale.toPrisma();
  return {
    ...salePrisma,
    client: salePrisma.clientSnapshot ?? null,
    status: saleWithRelations.status ?? null,
    items: saleWithRelations.items.map((i) => i.toPrisma()),
    assignments: saleWithRelations.assignments.map((a) => a.toPrisma()),
    histories: saleWithRelations.histories.map((h) => h.toPrisma()),
    signatureRequest: saleWithRelations.signatureRequest ?? null,
  };
}

export class SaleController {
  static async createSaleWithProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const dto = {
        client: req.body.client,
        items: req.body.items,
        statusId: req.body.statusId,
        notes: req.body.notes,
        metadata: req.body.metadata,
        comercial: req.body.comercial,
      };

      const sale = await serviceContainer.createSaleWithProductsUseCase.execute(dto, currentUser);
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(sale.id);

      if (!saleWithRelations) throw new DatabaseError('Error al obtener la venta creada');

      res.status(201).json({ message: 'Venta creada correctamente', sale: formatSaleResponse(saleWithRelations) });
    } catch (error) {
      next(error);
    }
  }

  static async getSaleById(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(saleId);

      if (!saleWithRelations) {
        throw new NotFoundError('Venta', saleId);
      }

      res.status(200).json(formatSaleResponse(saleWithRelations));
    } catch (error) {
      next(error);
    }
  }

  static async listSalesWithFilters(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const filters = {
        clientId: req.query.clientId as string | undefined,
        statusId: req.query.statusId as string | undefined,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        comercial: req.query.comercial as string | undefined,
      };

      const salesWithRelations = await serviceContainer.saleRepository.listWithRelations(filters);
      const response = salesWithRelations.map(formatSaleResponse);

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async listSalesPaginated(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const pagination = parsePaginationOptions(
        req.query.page as string | undefined,
        req.query.limit as string | undefined
      );

      const filters = {
        clientId: req.query.clientId as string | undefined,
        statusId: req.query.statusId as string | undefined,
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        comercial: req.query.comercial as string | undefined,
      };

      const result = await serviceContainer.saleRepository.listPaginatedWithRelations(filters, pagination);
      const response = result.data.map(formatSaleResponse);

      res.status(200).json({ data: response, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  static async addSaleItem(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;
      const { name, price, quantity } = req.body;

      if (!name || price == null || quantity == null) {
        throw new ValidationError('Nombre, precio y cantidad son obligatorios');
      }

      const unitPrice = Number(price);
      const qty = Number(quantity);

      if (isNaN(unitPrice) || isNaN(qty)) {
        throw new ValidationError('Precio y cantidad deben ser números válidos');
      }

      const itemData = {
        productId: req.body.productId || null,
        nameSnapshot: name,
        skuSnapshot: req.body.sku || null,
        unitPrice,
        quantity: qty,
        finalPrice: unitPrice * qty,
      };

      await serviceContainer.addSaleItemUseCase.execute(saleId, itemData, currentUser);
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(saleId);

      if (!saleWithRelations) throw new DatabaseError('Error al obtener la venta actualizada');

      res.status(200).json({ message: 'Item añadido a la venta correctamente', sale: formatSaleResponse(saleWithRelations) });
    } catch (error) {
      next(error);
    }
  }

  static async updateSaleItem(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId, itemId } = req.params as Record<string, string>;
      const dto = {
        saleId,
        items: [{
          id: itemId,
          unitPrice: req.body.unitPrice,
          quantity: req.body.quantity,
          finalPrice: req.body.finalPrice,
        }],
      };

      await serviceContainer.updateSaleItemUseCase.execute(dto, currentUser);
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(saleId);

      if (!saleWithRelations) throw new DatabaseError('Error al obtener la venta actualizada');

      res.status(200).json({ message: 'Item actualizado correctamente', sale: formatSaleResponse(saleWithRelations) });
    } catch (error) {
      next(error);
    }
  }

  static async removeSaleItem(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId, itemId } = req.params as Record<string, string>;
      await serviceContainer.removeSaleItemUseCase.execute(saleId, itemId, currentUser);
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(saleId);

      if (!saleWithRelations) throw new DatabaseError('Error al obtener la venta actualizada');

      res.status(200).json({ message: 'Item eliminado correctamente', sale: formatSaleResponse(saleWithRelations) });
    } catch (error) {
      next(error);
    }
  }

  static async changeSaleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;
      const dto = {
        saleId,
        statusId: req.body.statusId,
        comment: req.body.comment,
      };

      const sale = await serviceContainer.changeSaleStatusUseCase.execute(dto, currentUser);
      const saleWithRelations = await serviceContainer.saleRepository.findWithRelations(sale.id);

      if (!saleWithRelations) throw new DatabaseError('Error al obtener la venta actualizada');

      res.status(200).json({ message: 'Estado de venta cambiado correctamente', sale: formatSaleResponse(saleWithRelations) });
    } catch (error) {
      next(error);
    }
  }

  static async updateClientSnapshot(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;
      const { clientSnapshot, comercial } = req.body;

      if (!clientSnapshot) throw new ValidationError('El clientSnapshot es requerido');

      const sale = await serviceContainer.updateClientSnapshotUseCase.execute(
        saleId,
        clientSnapshot,
        currentUser,
        comercial
      );

      res.status(200).json({ message: 'Datos del cliente actualizados correctamente', sale });
    } catch (error) {
      next(error);
    }
  }

  static async getSalesStats(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const stats = await serviceContainer.getSalesStatsUseCase.execute(currentUser);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  static async getComerciales(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const comerciales = await serviceContainer.saleRepository.getDistinctComerciales();
      res.status(200).json(comerciales);
    } catch (error) {
      next(error);
    }
  }
}
