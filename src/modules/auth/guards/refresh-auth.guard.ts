import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard pour les routes nécessitant un refresh token valide (cookie httpOnly).
 * Utilise RefreshStrategy ('jwt-refresh').
 */
@Injectable()
export class RefreshAuthGuard extends AuthGuard('jwt-refresh') {}