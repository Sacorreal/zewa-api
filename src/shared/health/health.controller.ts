import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../http/public.decorator';
import { type HealthReport, HealthService } from './health.service';

/** Sonda para balanceadores y monitoreo: 200 si las dependencias responden, 503 si no. */
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthReport> {
    const report = await this.healthService.check();
    if (report.status !== 'ok') throw new ServiceUnavailableException(report);
    return report;
  }
}
