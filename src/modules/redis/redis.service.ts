import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    this.client = createClient({
      socket: {
        host: configService.get<string>('redis.host') ?? 'localhost',
        port: configService.get<number>('redis.port') ?? 6379,
      },
      password: configService.get<string>('redis.password'),
    }) as RedisClientType;

    this.client.on('error', (err) =>
      this.logger.error('Redis client error', err),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Connexion Redis établie');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { EX: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }
}