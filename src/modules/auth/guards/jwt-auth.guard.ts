import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Guard d'authentification basée sur JWT.
 * Vérifie la présence et la validité du token JWT dans l'en-tête Authorization.
 * Si le token est valide, attache le payload à request.user.
 * Sinon, rejette la requête avec une 401 Unauthorized.
 * NB : Ce Guard doit être utilisé avant tout autre guard qui dépend de request.user (ex: RolesGuard).
 */
@Injectable()
export class JwtAuthGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      Request & { user: unknown; headers: Record<string, string> }
    >();

    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant ou format invalide');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}