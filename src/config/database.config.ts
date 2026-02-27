import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Configuration TypeORM chargée depuis les variables d'environnement.
 * Utilisée dans AppModule via TypeOrmModule.forRootAsync().
 */
export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'lemobici',
    password: process.env.DB_PASSWORD ?? 'lemobici_password',
    database: process.env.DB_NAME     ?? 'lemobici_db',

    // Entités : chargement automatique de tous les fichiers *.entity.ts
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],

    // Migrations : à activer dès que le schéma se stabilise
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],

    // ⚠️ synchronize: true uniquement en développement
    // En production → utiliser les migrations TypeORM
    synchronize: process.env.NODE_ENV === 'development',

    // Logs SQL uniquement en développement
    logging: process.env.NODE_ENV === 'development',

    // Pool de connexions: Pour la performance et la gestion de connexions simultanées a la base de données 
    extra: {
      max: 10,                        // connexions simultanées max
      idleTimeoutMillis: 30000,       // fermer les connexions inactives après 30s
      connectionTimeoutMillis: 2000,  // timeout de connexion après 2s
    },
  }),
);