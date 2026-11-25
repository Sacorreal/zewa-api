import type {
  EmailDeliveryResult,
  EmailMessage,
} from '../../src/shared/notifications/email/contracts/email.types';
import { EmailProvider } from '../../src/shared/notifications/email/contracts/email-provider';
import type { PutObjectInput } from '../../src/shared/storage/contracts/storage.types';
import { StorageProvider } from '../../src/shared/storage/contracts/storage-provider';

/** Storage en memoria: evita depender de DigitalOcean Spaces en las pruebas. */
export class InMemoryStorageProvider extends StorageProvider {
  readonly objects = new Map<string, PutObjectInput>();

  putObject(input: PutObjectInput): Promise<void> {
    this.objects.set(input.key, input);
    return Promise.resolve();
  }

  deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  objectExists(key: string): Promise<boolean> {
    return Promise.resolve(this.objects.has(key));
  }

  getSignedReadUrl(key: string): Promise<string> {
    return Promise.resolve(`https://signed.test/${key}`);
  }

  getPublicUrl(key: string): string {
    return `https://cdn.test/${key}`;
  }
}

/** Buzón en memoria; `failNext` simula una caída del proveedor de correo. */
export class InMemoryEmailProvider extends EmailProvider {
  readonly sent: EmailMessage[] = [];
  private failuresPending = 0;

  failNext(times = 1): void {
    this.failuresPending = times;
  }

  send(message: EmailMessage): Promise<EmailDeliveryResult> {
    if (this.failuresPending > 0) {
      this.failuresPending -= 1;
      return Promise.reject(new Error('Proveedor de correo no disponible'));
    }
    this.sent.push(message);
    return Promise.resolve({ messageId: `msg-${this.sent.length}` });
  }

  /** Token de activación del último correo enviado a `email`. */
  lastActivationTokenFor(email: string): string {
    const message = [...this.sent]
      .reverse()
      .find(({ to }) => to.includes(email));
    const token = message?.text.match(/token=([\w-]+)/)?.[1];
    if (!token) throw new Error(`No hay invitación enviada a ${email}`);
    return token;
  }
}
