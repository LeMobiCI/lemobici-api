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
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      configService.get<string>('jwt.secret')!,
    });
  }

  /**
   * Appelée par Passport après vérification de la signature JWT.
   * La valeur retournée est attachée à request.user.
   */
  async validate(payload: JwtPayload): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Session invalide ou compte désactivé');
    }

    return user;
  }
}
