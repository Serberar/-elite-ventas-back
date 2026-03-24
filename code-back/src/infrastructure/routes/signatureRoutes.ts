import { Router, urlencoded } from 'express';
import { SignatureController } from '@infrastructure/express/controllers/SignatureController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { validateRequest } from '@infrastructure/express/middleware/validateRequest';
import {
  sendContractSchema,
  resendContractSchema,
  webhookPayloadSchema,
} from '@infrastructure/express/validation/signatureSchemas';

const saleSignatureRouter = Router({ mergeParams: true });

// GET /api/sales/:saleId/signature — consultar estado de firma
saleSignatureRouter.get(
  '/:saleId/signature',
  authMiddleware,
  SignatureController.getStatus.bind(SignatureController)
);

// POST /api/sales/:saleId/signature/send — generar y enviar contrato
saleSignatureRouter.post(
  '/:saleId/signature/send',
  authMiddleware,
  validateRequest(sendContractSchema),
  SignatureController.sendContract.bind(SignatureController)
);

// POST /api/sales/:saleId/signature/resend — reenviar contrato
saleSignatureRouter.post(
  '/:saleId/signature/resend',
  authMiddleware,
  validateRequest(resendContractSchema),
  SignatureController.resendContract.bind(SignatureController)
);

// DELETE /api/sales/:saleId/signature — cancelar solicitud de firma
saleSignatureRouter.delete(
  '/:saleId/signature',
  authMiddleware,
  SignatureController.cancelSignature.bind(SignatureController)
);

// GET /api/sales/:saleId/signature/evidence — descargar evidencia PDF de firma
saleSignatureRouter.get(
  '/:saleId/signature/evidence',
  authMiddleware,
  SignatureController.getEvidence.bind(SignatureController)
);

// POST /api/sales/:saleId/signature/evidence/fetch — descargar evidencia desde Lleida.net manualmente
saleSignatureRouter.post(
  '/:saleId/signature/evidence/fetch',
  authMiddleware,
  SignatureController.fetchEvidenceFromProvider.bind(SignatureController)
);

// ─── CONSENT (Autorización de llamada) ─────────────────────────────────────

// GET /api/sales/:saleId/consent — consultar estado de autorización de llamada
saleSignatureRouter.get(
  '/:saleId/consent',
  authMiddleware,
  SignatureController.getConsentStatus.bind(SignatureController)
);

// POST /api/sales/:saleId/consent/send — enviar autorización de llamada
saleSignatureRouter.post(
  '/:saleId/consent/send',
  authMiddleware,
  validateRequest(sendContractSchema),
  SignatureController.sendConsent.bind(SignatureController)
);

// POST /api/sales/:saleId/consent/resend — reenviar autorización de llamada
saleSignatureRouter.post(
  '/:saleId/consent/resend',
  authMiddleware,
  validateRequest(resendContractSchema),
  SignatureController.resendConsent.bind(SignatureController)
);

// DELETE /api/sales/:saleId/consent — cancelar autorización de llamada
saleSignatureRouter.delete(
  '/:saleId/consent',
  authMiddleware,
  SignatureController.cancelConsent.bind(SignatureController)
);

// POST /api/sales/:saleId/consent/evidence/fetch — descargar evidencia desde Lleida.net manualmente
saleSignatureRouter.post(
  '/:saleId/consent/evidence/fetch',
  authMiddleware,
  SignatureController.fetchConsentEvidenceFromProvider.bind(SignatureController)
);

// GET /api/sales/:saleId/consent/evidence — descargar evidencia de autorización
saleSignatureRouter.get(
  '/:saleId/consent/evidence',
  authMiddleware,
  SignatureController.getConsentEvidence.bind(SignatureController)
);

// ── Webhook (sin autenticación JWT, verificación por secret opcional) ──
const webhookRouter = Router();

// POST /api/signature/webhook
webhookRouter.post(
  '/webhook',
  validateRequest(webhookPayloadSchema),
  SignatureController.handleWebhook.bind(SignatureController)
);

// POST /api/signature/lleida-callback
// Callback de Lleida.net Click & Sign (application/x-www-form-urlencoded)
webhookRouter.post(
  '/lleida-callback',
  urlencoded({ extended: false }),
  SignatureController.handleLleidaCallback.bind(SignatureController)
);

export { saleSignatureRouter, webhookRouter };
