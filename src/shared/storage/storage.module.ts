import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './contracts/storage-provider';
import type { StorageOptions } from './contracts/storage.types';
import { TenantStorageListener } from './listeners/tenant-storage.listener';
import {
  createSpacesClient,
  SpacesStorageProvider,
} from './providers/spaces-storage.provider';
import { buildStorageOptions } from './storage.config';
import { StorageService } from './storage.service';
import { SPACES_CLIENT, STORAGE_OPTIONS } from './storage.tokens';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageOptions =>
        buildStorageOptions((key) => config.get<unknown>(key)),
    },
    {
      provide: SPACES_CLIENT,
      inject: [STORAGE_OPTIONS],
      useFactory: createSpacesClient,
    },
    { provide: StorageProvider, useClass: SpacesStorageProvider },
    StorageService,
    TenantStorageListener,
  ],
  exports: [StorageService],
})
export class StorageModule {}
