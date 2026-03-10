import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ──────────────── Sécurité HTTP headers ────────────────
  app.use(helmet());

  // ──────────────── Cookie parser ────────────────
  // —> requis pour lire les httpOnly cookies 
  app.use(cookieParser());

  // ──────────────── Préfixe global API ────────────────
  app.setGlobalPrefix('api/v1');

  // ──────────────── Validation globale ────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
    }),
  );

  // ──────────────── CORS ────────────────
  app.enableCors({
    origin: process.env.LEMOBICI_FRONTEND_PORT ?? 'http://localhost:4200', // Angular dev
    credentials: true,
  });
  
  const port = process.env.LEMOBICI_API_PORT ?? 3000;
  await app.listen(port);
  console.log(`LeMobici API démarrée sur http://localhost:${port}/api/v1 •••`)
}
bootstrap();
