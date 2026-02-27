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

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule async : lit le secret depuis ConfigService
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.get<string>('jwt.secret'),
        signOptions: { expiresIn: (config.get<string>('jwt.signOptions.expiresIn')) as StringValue ?? '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  // Export des guards pour utilisation dans les autres modules
  exports:     [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}