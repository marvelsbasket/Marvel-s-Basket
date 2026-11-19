import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
}

export interface ReadinessResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
  };
}

export interface HealthSummaryResult {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
  memoryUsageMb: number;
}

@Injectable()
export class HealthService {
  private readonly processStartTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * General health summary.
   */
  getSummary(): HealthSummaryResult {
    const uptime = Math.floor((Date.now() - this.processStartTime) / 1000);
    const env = this.configService.get<string>('app.nodeEnv', 'development');
    const memory = process.memoryUsage();
    const memoryUsageMb = Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100;

    return {
      status: 'ok',
      service: 'marvels-basket-api',
      version: '1.0.0',
      environment: env,
      uptime,
      timestamp: new Date().toISOString(),
      memoryUsageMb,
    };
  }

  /**
   * Liveness probe — indicates process is alive and accepting connections.
   */
  getLiveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe — indicates application and all required infrastructure dependencies are ready.
   */
  async getReadiness(): Promise<ReadinessResult> {
    const uptime = Math.floor((Date.now() - this.processStartTime) / 1000);

    // 1. Check PostgreSQL
    const dbStart = Date.now();
    const isDbHealthy = await this.prismaService.isHealthy();
    const dbLatencyMs = Date.now() - dbStart;

    // 2. Check Redis
    const redisStart = Date.now();
    const isRedisHealthy = await this.redisService.isHealthy();
    const redisLatencyMs = Date.now() - redisStart;

    const allHealthy = isDbHealthy && isRedisHealthy;

    const result: ReadinessResult = {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime,
      checks: {
        database: {
          status: isDbHealthy ? 'healthy' : 'unhealthy',
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: isRedisHealthy ? 'healthy' : 'unhealthy',
          latencyMs: redisLatencyMs,
        },
      },
    };

    if (!allHealthy) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
