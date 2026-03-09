import { z } from 'zod';

export const sendContractSchema = z.object({
  body: z.object({
    signerEmail: z.string().optional(),
    signerPhone: z.string().optional(),
    deliveryMethod: z.enum(['email', 'sms']).optional().default('email'),
    templateId: z.string().optional(),
  }).superRefine((data, ctx) => {
    const method = data.deliveryMethod ?? 'email';
    if (method === 'email') {
      if (!data.signerEmail) {
        ctx.addIssue({ code: 'custom', path: ['signerEmail'], message: 'El email del firmante es obligatorio' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.signerEmail)) {
        ctx.addIssue({ code: 'custom', path: ['signerEmail'], message: 'El email del firmante no es válido' });
      }
    } else {
      if (!data.signerPhone) {
        ctx.addIssue({ code: 'custom', path: ['signerPhone'], message: 'El teléfono del firmante es obligatorio para envío por SMS' });
      }
    }
  }),
});

export const resendContractSchema = z.object({
  body: z.object({
    signerEmail: z.string().email('El email del firmante no es válido').optional(),
  }),
});

export const webhookPayloadSchema = z.object({
  body: z.object({
    providerDocumentId: z.string().min(1, 'El providerDocumentId es obligatorio'),
    event: z.enum(['signed', 'rejected'], 'El evento debe ser "signed" o "rejected"'),
    signedUrl: z.string().url().optional(),
    rejectionReason: z.string().optional(),
  }),
});

export type SendContractBody = z.infer<typeof sendContractSchema>['body'];
export type ResendContractBody = z.infer<typeof resendContractSchema>['body'];
export type WebhookBody = z.infer<typeof webhookPayloadSchema>['body'];
