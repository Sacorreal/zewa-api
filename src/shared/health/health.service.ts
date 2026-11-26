import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type DependencyStatus = 'up' | 'down';

export interface HealthReport {
  status: 'ok' | 'error';
  checks: { database: DependencyStatus };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthReport> {
    const database = await this.checkDatabase();
    return {
      status: database === 'up' ? 'ok' : 'error',
      checks: { database },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }
}
