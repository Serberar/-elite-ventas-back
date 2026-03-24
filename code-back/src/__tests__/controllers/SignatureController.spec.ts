import { SignatureController } from '@infrastructure/express/controllers/SignatureController';
import { Request, Response, NextFunction } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, NotFoundError, ValidationError } from '@application/shared/AppError';
import { SignatureRequest } from '@domain/entities/SignatureRequest';

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    generateAndSendContractUseCase: { execute: jest.fn() },
    resendSignatureRequestUseCase: { execute: jest.fn() },
    getSignatureStatusUseCase: { execute: jest.fn() },
    cancelSignatureRequestUseCase: { execute: jest.fn() },
    handleSignatureWebhookUseCase: { execute: jest.fn() },
    signatureRequestRepository: { findByProviderDocumentId: jest.fn().mockResolvedValue(null) },
  },
}));

describe('SignatureController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const currentUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin', empresaId: '00000000-0000-0000-0000-000000000001' };

  const mockSignatureRequest = new SignatureRequest(
    'sig-1', 'sale-123', 'contract',
    'pending', 'john@example.com',
    'doc-provider-abc', null, null,
    new Date('2024-01-15'), null, null,
    new Date('2024-01-15'), new Date('2024-01-15')
  );

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    next = jest.fn();
    res = { status: statusMock, json: jsonMock };
    req = { user: currentUser, params: { saleId: 'sale-123' }, body: {}, query: {} };
    jest.clearAllMocks();
  });

  describe('sendContract', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SignatureController.sendContract(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 201 with signatureRequest on success', async () => {
      req.body = { signerEmail: 'john@example.com' };
      (serviceContainer.generateAndSendContractUseCase.execute as jest.Mock).mockResolvedValue(
        mockSignatureRequest
      );

      await SignatureController.sendContract(req as any, res as any, next);

      expect(serviceContainer.generateAndSendContractUseCase.execute).toHaveBeenCalledWith(
        { saleId: 'sale-123', signerEmail: 'john@example.com' },
        currentUser
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Contrato enviado al firmante correctamente',
        signatureRequest: mockSignatureRequest.toPrisma(),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with ValidationError when pending request already exists', async () => {
      req.body = { signerEmail: 'john@example.com' };
      const error = new ValidationError('Ya existe solicitud pendiente');
      (serviceContainer.generateAndSendContractUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.sendContract(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with NotFoundError when sale does not exist', async () => {
      req.body = { signerEmail: 'john@example.com' };
      const error = new NotFoundError('Venta', 'sale-123');
      (serviceContainer.generateAndSendContractUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.sendContract(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with generic errors', async () => {
      req.body = { signerEmail: 'john@example.com' };
      const error = new Error('Provider unavailable');
      (serviceContainer.generateAndSendContractUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.sendContract(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('resendContract', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SignatureController.resendContract(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with signatureRequest on success', async () => {
      req.body = { signerEmail: 'john@example.com' };
      (serviceContainer.resendSignatureRequestUseCase.execute as jest.Mock).mockResolvedValue(
        mockSignatureRequest
      );

      await SignatureController.resendContract(req as any, res as any, next);

      expect(serviceContainer.resendSignatureRequestUseCase.execute).toHaveBeenCalledWith(
        { saleId: 'sale-123', signerEmail: 'john@example.com' },
        currentUser
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Contrato reenviado correctamente',
        signatureRequest: mockSignatureRequest.toPrisma(),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with ValidationError when contract is signed', async () => {
      const error = new ValidationError('El contrato ya está firmado');
      (serviceContainer.resendSignatureRequestUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.resendContract(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with generic errors', async () => {
      const error = new Error('Provider unavailable');
      (serviceContainer.resendSignatureRequestUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.resendContract(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getStatus', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SignatureController.getStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with signatureRequest when it exists', async () => {
      (serviceContainer.getSignatureStatusUseCase.execute as jest.Mock).mockResolvedValue(
        mockSignatureRequest
      );

      await SignatureController.getStatus(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(mockSignatureRequest.toPrisma());
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 200 with null when no signature request exists', async () => {
      (serviceContainer.getSignatureStatusUseCase.execute as jest.Mock).mockResolvedValue(null);

      await SignatureController.getStatus(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(null);
    });

    it('should call next with errors', async () => {
      const error = new Error('DB error');
      (serviceContainer.getSignatureStatusUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.getStatus(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cancelSignature', () => {
    it('should call next with AuthenticationError if user is not authenticated', async () => {
      req.user = undefined;

      await SignatureController.cancelSignature(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should return 200 with success message on cancel', async () => {
      (serviceContainer.cancelSignatureRequestUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      await SignatureController.cancelSignature(req as any, res as any, next);

      expect(serviceContainer.cancelSignatureRequestUseCase.execute).toHaveBeenCalledWith(
        'sale-123',
        currentUser
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Solicitud de firma cancelada correctamente',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError when sale does not exist', async () => {
      const error = new NotFoundError('Venta', 'sale-123');
      (serviceContainer.cancelSignatureRequestUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.cancelSignature(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call next with generic errors', async () => {
      const error = new Error('DB error');
      (serviceContainer.cancelSignatureRequestUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.cancelSignature(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('handleWebhook', () => {
    it('should return 200 with processed signature on signed event', async () => {
      const signedSignature = new SignatureRequest(
        'sig-1', 'sale-123', 'contract',
    'signed', 'john@example.com',
        'doc-abc', 'https://signed.pdf', null,
        new Date(), new Date(), null,
        new Date(), new Date()
      );
      req.body = {
        providerDocumentId: 'doc-abc',
        event: 'signed',
        signedUrl: 'https://signed.pdf',
        rejectionReason: null,
      };
      req.user = undefined; // webhook is unauthenticated
      (serviceContainer.handleSignatureWebhookUseCase.execute as jest.Mock).mockResolvedValue(
        signedSignature
      );

      await SignatureController.handleWebhook(req as any, res as any, next);

      expect(serviceContainer.handleSignatureWebhookUseCase.execute).toHaveBeenCalledWith({
        providerDocumentId: 'doc-abc',
        event: 'signed',
        signedUrl: undefined,
        rejectionReason: null,
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Webhook procesado correctamente',
        signatureRequest: signedSignature.toPrisma(),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 200 on rejection event', async () => {
      const rejectedSignature = new SignatureRequest(
        'sig-1', 'sale-123', 'contract',
    'rejected', 'john@example.com',
        'doc-abc', null, 'No estoy de acuerdo',
        new Date(), null, new Date(),
        new Date(), new Date()
      );
      req.body = {
        providerDocumentId: 'doc-abc',
        event: 'rejected',
        rejectionReason: 'No estoy de acuerdo',
      };
      (serviceContainer.handleSignatureWebhookUseCase.execute as jest.Mock).mockResolvedValue(
        rejectedSignature
      );

      await SignatureController.handleWebhook(req as any, res as any, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Webhook procesado correctamente' })
      );
    });

    it('should call next with errors from webhook processing', async () => {
      req.body = { providerDocumentId: 'unknown-doc', event: 'signed' };
      const error = new NotFoundError('Documento', 'unknown-doc');
      (serviceContainer.handleSignatureWebhookUseCase.execute as jest.Mock).mockRejectedValue(error);

      await SignatureController.handleWebhook(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
