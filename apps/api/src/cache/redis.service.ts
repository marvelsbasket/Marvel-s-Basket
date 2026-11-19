import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('redis.url');
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6380);
    const password = this.configService.get<string>('redis.password');

    const options = {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    if (redisUrl) {
      this.client = new Redis(redisUrl, options);
    } else {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        ...options,
      });
    }

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log(`Redis connection established successfully at ${host}:${port}`);
    });

    this.client.on('ready', () => {
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.warn(`Redis client warning/error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis client disconnected gracefully.');
      } catch {
        this.client.disconnect();
      }
    }
  }

  /**
   * Probes Redis server with PING command.
   */
  async ping(): Promise<string> {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }
    return this.client.ping();
  }

  /**
   * Healthcheck helper verifying whether Redis is reachable and responding to PING.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Get value by key.
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    return this.client.get(key);
  }

  /**
   * Set value by key with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (!this.client) {
      return null;
    }
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  /**
   * Delete key.
   */
  async del(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.del(key);
  }

  /**
   * Check if key exists.
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    const result = await this.client.exists(key);
    return result > 0;
  }

  /**
   * Increment value of a key.
   */
  async incr(key: string): Promise<number> {
    if (!this.client) {
      return 0;
    }
    return this.client.incr(key);
  }

  /**
   * Set a timeout on key in seconds.
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Returns the remaining time to live of a key that has a timeout, in seconds.
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) {
      return -2;
    }
    return this.client.ttl(key);
  }

  /**
   * Access raw ioredis instance if specialized operations are required.
   */
  getClient(): Redis | null {
    return this.client;
  }
}
