import { Injectable } from '@nestjs/common';
import { type AppEventPayload, OnAppEvent } from '../../events';
import { StorageService } from '../storage.service';

/** Prepara la carpeta de almacenamiento de cada cliente nuevo. */
@Injectable()
export class TenantStorageListener {
  constructor(private readonly storage: StorageService) {}

  @OnAppEvent('client.created', { channel: 'internal' })
  async createClientFolder({
    tenantId,
  }: AppEventPayload<'client.created'>): Promise<void> {
    await this.storage.createTenantFolder(tenantId);
  }
}
