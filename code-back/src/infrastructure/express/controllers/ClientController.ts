import { Request, Response, NextFunction } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import logger from '@infrastructure/observability/logger/logger';
import { AuthenticationError } from '@application/shared/AppError';

interface DeleteClientBody {
  password: string;
}

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

      const { value } = req.params as Record<string, string>;
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
        { id: (req.params as Record<string, string>).id, ...updateData },
        currentUser
      );

      res.status(200).json({ message: 'Cliente editado correctamente', client: updatedClient });
    } catch (error) {
      next(error);
    }
  }

  static async verifyDeletePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { password } = req.body as DeleteClientBody;
      const isValid = await serviceContainer.deleteClientUseCase.verifyPassword(password);

      if (!isValid) {
        return res.status(403).json({ message: 'No tienes permiso para eliminar este cliente' });
      }

      res.status(200).json({ valid: true });
    } catch (error) {
      next(error);
    }
  }

  static async deleteClient(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { id } = req.params as Record<string, string>;
      const { password } = req.body as DeleteClientBody;

      logger.info(`Solicitud de eliminación de cliente ${id} por usuario ${currentUser.id}`);
      await serviceContainer.deleteClientUseCase.execute(id, password);

      res.status(200).json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // Solamente pushear datos
  static async pushClientData(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { id } = req.params as Record<string, string>;
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
