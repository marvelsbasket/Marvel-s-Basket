import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockPrisma = {
      isHealthy: jest.fn(),
    };

    const mockRedis = {
      isHealthy: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'app.nodeEnv') return 'test';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  it('should return valid health summary', () => {
    const summary = service.getSummary();

    expect(summary.status).toBe('ok');
    expect(summary.service).toBe('marvels-basket-api');
    expect(summary.environment).toBe('test');
    expect(summary.version).toBe('1.0.0');
    expect(typeof summary.uptime).toBe('number');
    expect(typeof summary.memoryUsageMb).toBe('number');
  });

  it('should return valid liveness probe', () => {
    const liveness = service.getLiveness();

    expect(liveness.status).toBe('ok');
    expect(typeof liveness.timestamp).toBe('string');
  });

  it('should return ready when both PostgreSQL and Redis are healthy', async () => {
    prismaService.isHealthy.mockResolvedValue(true);
    redisService.isHealthy.mockResolvedValue(true);

    const readiness = await service.getReadiness();

    expect(readiness.status).toBe('ok');
    expect(readiness.checks.database.status).toBe('healthy');
    expect(readiness.checks.redis.status).toBe('healthy');
  });

  it('should throw ServiceUnavailableException when PostgreSQL is unhealthy', async () => {
    prismaService.isHealthy.mockResolvedValue(false);
    redisService.isHealthy.mockResolvedValue(true);

    await expect(service.getReadiness()).rejects.toThrow(ServiceUnavailableException);
  });

  it('should throw ServiceUnavailableException when Redis is unhealthy', async () => {
    prismaService.isHealthy.mockResolvedValue(true);
    redisService.isHealthy.mockResolvedValue(false);

    await expect(service.getReadiness()).rejects.toThrow(ServiceUnavailableException);
  });
});
