import { Module }                      from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions }      from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { StringValue }    from 'ms';

import { AuthController } from './auth.controller';
import { AuthService }    from './auth.service';
import { User }           from './entities/user.entity';
import { JwtAuthGuard }   from './guards/jwt-auth.guard';
import { RolesGuard }     from './guards/roles.guard';
import { JwtStrategy }    from './strategies/jwt.strategy';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule async : lit le secret depuis ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) : Promise<JwtModuleOptions>  => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET est manquant dans les variables d\'environnement');
        }
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '7d';
        return {
          secret,
          signOptions: {
            expiresIn: Number(expiresIn),
          },
        };
      },
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  // Export des guards pour utilisation dans les autres modules
  exports:     [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}