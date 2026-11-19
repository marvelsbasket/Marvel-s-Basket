import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthStatusResponse } from '@marvels-basket/shared';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  @Get()
  getHealth(): HealthStatusResponse {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const env = this.configService.get<string>('NODE_ENV', 'development');

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      service: 'marvels-basket-api',
      version: '1.0.0',
      environment: env,
    };
  }
}
