import { 
  createParamDecorator, 
  ExecutionContext 
} from '@nestjs/common';
import { User } from '../entities/user.entity';

/**
 * Injecte l'utilisateur authentifié depuis request.user.
 * @example @Get('profil') getProfil(@CurrentUser() user: User) {}
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    return ctx.switchToHttp().getRequest().user;
  },
);