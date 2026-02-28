import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Préfix global pour toutes les routes de l'API
  app.setGlobalPrefix('api/v1');

  // Configuration CORS pour autoriser le frontend à accéder à l'API
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200', // Angular dev
    credentials: true,
  });

  // Demarrer l'API
  const port = process.env.API_PORT ?? 3000;
  await app.listen(port);
  console.log(`LeMobici API démarrée sur http://localhost:${port}/api/v1 •••`)
}
bootstrap();
