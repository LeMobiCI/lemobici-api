import { 
  Injectable, 
  UnauthorizedException 
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { JwtPayload } from '@lemobici/lemobici-shared';

import { User } from '../entities/user.entity';

/**
 * Stratégie d'authentificationn basée sur JWT.
 * Vérifie si le token est valide et si l'utilisateur est actif.
 * Si oui, attache l'utilisateur à request.user.
 * Sinon, rejette la requête avec une 401 Unauthorized.
 * NB : Cette Stratégie est utilisée par JwtAuthGuard pour valider les tokens JWT dans les requêtes entrantes.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    // Lire JWT_SECRET directement (pas via namespace 'jwt.secret')
    // car registerAs('jwt') n'est pas garanti d'être résolu avant super()
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error(
        'JWT_SECRET est manquant dans les variables d\'environnement',
      );
    }

    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      secret,
    });
  }

  /**
   * Appelée par Passport après vérification de la signature JWT.
   * La valeur retournée est attachée à request.user.
   */
  async validate(payload: JwtPayload): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id: payload.id, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Session invalide ou compte désactivé');
    }

    return user;
  }
}
