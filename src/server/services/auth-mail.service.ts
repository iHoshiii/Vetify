import { env } from '../config/env';
import {
  deliverMail,
  sendMail,
  type MailDelivery,
  type MailMessage,
  type MailProvider,
} from './mail.service';

function authMailProvider(): MailProvider {
  return {
    transport: env.AUTH_MAIL_TRANSPORT,
    apiUrl: env.AUTH_MAIL_API_URL ?? env.MAIL_API_URL,
    apiKey: env.AUTH_MAIL_API_KEY,
    from: env.AUTH_MAIL_FROM ?? env.MAIL_FROM,
    fromName: env.AUTH_MAIL_FROM ? 'AUTH_MAIL_FROM' : 'MAIL_FROM',
    transportName: 'AUTH_MAIL_TRANSPORT',
    keyName: 'AUTH_MAIL_API_KEY',
  };
}

export function sendAuthMail(message: MailMessage): Promise<void> {
  return sendMail(message, authMailProvider());
}

export function deliverAuthMail(message: MailMessage): Promise<MailDelivery> {
  return deliverMail(message, authMailProvider());
}
