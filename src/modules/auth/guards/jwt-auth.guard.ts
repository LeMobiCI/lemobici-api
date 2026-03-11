import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT basé sur Passport.
 * Délègue la vérification du token à JwtStrategy.validate()
 * qui charge l'entité User complète depuis la DB et l'attache à request.user.
 *
 * @CurrentUser() retournera un User avec user.id correctement défini.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}