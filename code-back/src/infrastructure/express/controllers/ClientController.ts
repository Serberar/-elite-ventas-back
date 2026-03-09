import { Request, Response, NextFunction } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import logger from '@infrastructure/observability/logger/logger';
import { AuthenticationError } from '@application/shared/AppError';

// Tipos para los datos de entrada
interface CreateClientBody {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  birthday: string;
  phones?: string[];
  addresses?: { address: string; cupsLuz?: string; cupsGas?: string }[];
  bankAccounts?: string[];
  comments?: string[];
  authorized?: string;
  businessName?: string;
}

interface UpdateClientBody {
  firstName?: string;
  lastName?: string;
  dni?: string;
  email?: string;
  birthday?: string;
  phones?: string[];
  addresses?: { address: string; cupsLuz?: string; cupsGas?: string }[];
  bankAccounts?: string[];
  comments?: string[];
  authorized?: string;
  businessName?: string;
}

interface PushClientDataBody {
  phones?: string[];
  addresses?: { address: string; cupsLuz?: string; cupsGas?: string }[];
  bankAccounts?: string[];
  comments?: string[];
}

export class ClientController {
  static async getClient(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { value } = req.params;
      const clients = await serviceContainer.getClientUseCase.execute(value, currentUser);

      if (clients.length === 0) {
        return res.status(404).json({ message: 'No existen clientes con este teléfono o DNI' });
      }

      res.status(200).json(clients);
    } catch (error) {
      next(error);
    }
  }

  static async createClient(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      logger.debug('Client creation request received', {
        userId: currentUser.id,
        bodyKeys: Object.keys(req.body),
      });

      const clientData = req.body as CreateClientBody;
      const client = await serviceContainer.createClientUseCase.execute(clientData, currentUser);

      res.status(201).json({ message: 'Cliente creado correctamente', client });
    } catch (error) {
      next(error);
    }
  }

  static async updateClient(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const updateData = req.body as UpdateClientBody;
      const updatedClient = await serviceContainer.updateClientUseCase.execute(
        { id: req.params.id, ...updateData },
        currentUser
      );

      res.status(200).json({ message: 'Cliente editado correctamente', client: updatedClient });
    } catch (error) {
      next(error);
    }
  }

  // Solamente pushear datos
  static async pushClientData(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { id } = req.params;
      const pushData = req.body as PushClientDataBody;

      const updatedClient = await serviceContainer.pushDataClientUseCase.execute(
        { id, ...pushData },
        currentUser
      );

      res.status(200).json({
        message: 'Datos del cliente añadidos correctamente',
        client: updatedClient,
      });
    } catch (error) {
      next(error);
    }
  }
}
