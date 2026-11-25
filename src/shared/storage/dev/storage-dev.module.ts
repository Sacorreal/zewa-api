import { type DynamicModule, Module } from '@nestjs/common';
import { NodeEnv } from '../../config/environment';
import { StorageDevController } from './storage-dev.controller';

/** Ambientes donde se montan los endpoints de prueba (no tienen autenticación). */
const ENABLED_ENVIRONMENTS: readonly string[] = [NodeEnv.Local];

@Module({ controllers: [StorageDevController] })
class StorageDevControllerModule {}

/** Endpoints de prueba del storage: solo en ambientes explícitamente permitidos. */
export class StorageDevModule {
  static forEnvironment(nodeEnv: string | undefined): DynamicModule {
    const enabled =
      nodeEnv !== undefined && ENABLED_ENVIRONMENTS.includes(nodeEnv);

    return {
      module: StorageDevModule,
      imports: enabled ? [StorageDevControllerModule] : [],
    };
  }
}
