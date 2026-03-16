import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import redisConfig from './config/redis.config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisService } from './modules/redis/redis.service';
import { RedisModule } from './modules/redis/redis.module';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({

  imports: [
    // ──────────────── Modules ────────────────
    TerminusModule,

    // ──────────────── Configuration globale ────────────────
    ConfigModule.forRoot({
      isGlobal : true,
      envFilePath : '../.env',
      load : [ databaseConfig, jwtConfig, mailConfig, redisConfig],
    }),

    // ──────────────── Rate limiting global ────────────────
    // Les routes sensibles ont leur propre @Throttle() plus strict
    ThrottlerModule.forRoot([{
      ttl:   60000,  // fenêtre de 1 minute
      limit: 30,     // 30 req/min par défaut (override sur routes sensibles)
    }]),

    // ──────────────── TypeORM ────────────────
    TypeOrmModule.forRootAsync({
      imports : [ConfigModule],
      inject : [ConfigService],
      useFactory : (config : ConfigService) : TypeOrmModuleOptions =>
        config.get<TypeOrmModuleOptions>('database')!,
    }),
    
    AuthModule,
  ],

  controllers: [AppController, HealthController],

  providers: [AppService, RedisService],
})
export class AppModule {}
