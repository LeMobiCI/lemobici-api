import { registerAs } from '@nestjs/config';

/**
 * Namespace 'jwt' — chargé dans AppModule.
 * Dans JwtStrategy et JwtModule.registerAsync(), on lit JWT_SECRET
 * directement via configService.get<string>('JWT_SECRET') car passport-jwt
 * appelle super() de façon synchrone avant que le namespace soit résolu.
 */
export default registerAs( 'jwt', () => ({
  secret:           process.env.JWT_SECRET              ?? '',
  expiresIn:        process.env.JWT_EXPIRES_IN          ?? '15m',
  refreshSecret:    process.env.JWT_REFRESH_SECRET      ?? '',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN  ?? '7d',
}));