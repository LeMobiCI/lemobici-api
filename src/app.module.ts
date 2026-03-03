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

@Module({

  imports: [
    // Configuration des variables d'environnement
    ConfigModule.forRoot({
      isGlobal : true,
      envFilePath : '.env',
      load : [ databaseConfig, jwtConfig, mailConfig],
    }),
    // Configuration de TypeORM avec les options chargées depuis ConfigService
    TypeOrmModule.forRootAsync({
      imports : [ConfigModule],
      inject : [ConfigService],
      useFactory : (config : ConfigService) : TypeOrmModuleOptions =>
        config.get<TypeOrmModuleOptions>('database')!,
    }),
    AuthModule,
    MailModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
