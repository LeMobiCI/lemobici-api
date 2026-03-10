import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@lemobici/lemobici-shared';

/**
 * Stratégie Passport pour valider le refresh token depuis le cookie httpOnly.
 * Nommée 'jwt-refresh' pour la distinguer de la stratégie 'jwt' (access token).
 */
@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET est manquant dans les variables d\'environnement');
    }

    super({
      // Extrait le token depuis le cookie httpOnly 'refresh_token'
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] as string ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey:      refreshSecret,
      // Passe la requête complète à validate() pour accéder au cookie brut
      passReqToCallback: true,
    });
  }

  /**
   * Passport appelle validate() après avoir vérifié la signature du token.
   * On retourne le payload — le guard attachera { payload, refreshToken } à request.user.
   */
  validate(req: Request, payload: JwtPayload): { payload: JwtPayload; refreshToken: string } {
    const refreshToken = req.cookies?.['refresh_token'] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    return { payload, refreshToken };
  }
}