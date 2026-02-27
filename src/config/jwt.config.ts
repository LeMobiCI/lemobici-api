import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { StringValue } from 'ms';

/**
 * Configuration JWT chargée depuis les variables d'environnement.
 * Utilisée dans AuthModule via JwtModule.registerAsync().
 */
export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    secret:       process.env.JWT_SECRET     ?? 'lemobici_dev_secret_change_in_prod',
    signOptions: {
      expiresIn: (process.env.JWT_EXPIRES_IN as StringValue) ?? '7d',
    },
  }),
);