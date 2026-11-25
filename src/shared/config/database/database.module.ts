import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { buildDatabaseOptions } from './database-options.factory';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        ...buildDatabaseOptions((key) => config.get<unknown>(key)),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
