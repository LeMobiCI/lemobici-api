import { Module }                      from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule }      from '@nestjs/jwt';
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
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MailModule,
    RedisModule,

    // JwtModule async : lit le secret depuis ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: (config.get<string>('jwt.signOptions.expiresIn')) as StringValue ?? '15m' },
      }),
    }),
  ],

  // Controllers : routes
  controllers: [AuthController],

  // Providers : services, stratégies, guards
  providers: [
    AuthService, 
    JwtStrategy, 
    RefreshStrategy, 
    JwtAuthGuard, 
    RolesGuard, 
    RefreshAuthGuard
  ],

  // Export des guards pour utilisation dans les autres modules
  exports: [
    AuthService, 
    JwtModule, 
    JwtAuthGuard, 
    RolesGuard, 
    RefreshAuthGuard
  ],
})
export class AuthModule {}