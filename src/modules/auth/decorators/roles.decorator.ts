import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@lemobici/lemobici-shared';

export const ROLES_KEY = 'roles';

/**
 * Restreint l'accès à un ou plusieurs rôles.
 * @example @Roles(UserRole.OWNER, UserRole.AGENCY)
 */
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_KEY, roles);
