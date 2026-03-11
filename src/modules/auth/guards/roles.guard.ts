import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@lemobici/lemobici-shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard de contrôle d'accès basé sur les rôles d'utilisateur.
 * Utilise les métadonnées définies par @Roles() pour déterminer les rôles requis.
 * Vérifie si l'utilisateur authentifié a l'un des rôles requis ou est ADMIN.
 * Si oui, autorise l'accès, sinon rejette la requête avec une 403 Forbidden.
 * si aucune métadonnée @Roles() n'est définie, autorise l'accès à tous les utilisateurs authentifiés.
 * NB : Ce Guard doit être utilisé après JwtAuthGuard pour garantir que request.user est défini.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Pas de @Roles() → accessible à tout utilisateur authentifié
    if (!requiredRoles) return true;

    const user = context.switchToHttp().getRequest().user as {
      role: UserRole;
    } | null;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // ADMIN a accès à toutes les routes protégées
    if (user.role === UserRole.ADMIN) return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Accès refusé. Rôles requis : ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}