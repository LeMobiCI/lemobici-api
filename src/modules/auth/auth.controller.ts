import {
  Body, Controller, Get, HttpCode,
  HttpStatus, Patch, Post, Res, UseGuards,
} from '@nestjs/common';
import { RegisterDto }    from './dto/register.dto';
import { LoginDto }       from './dto/login.dto';
import { AuthService }    from './auth.service';
import { JwtAuthGuard }   from './guards/jwt-auth.guard';
import { CurrentUser }    from './decorators/current-user.decorator';
import { User }           from './entities/user.entity';
import { ForgotPasswordDto } from './dto/forgot-passord.dto';
import { ResetPasswordDto } from './dto/reset-passord.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { JwtPayload } from '@lemobici/lemobici-shared';
import { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService:   AuthService,
    private readonly configService: ConfigService,
  ) {}

  /** 
   * Inscrire un nouvel utilisateur
   * POST /api/v1/auth/register 
   * 
   * @param registerDto
   * @returns - les infos du user créé + token JWT
   * 
   * Note : Cette route n'a pas besoin de token JWT pour être accessible.
   * */
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...response } = await this.authService.register(dto);
    res.cookie('refresh_token', refreshToken, this.cookieOptions());
    return response;
  }


  /** 
   * Authentifier un utilisateur existant et lui fournir un JWT
   * POST /api/v1/auth/login 
   * 
   * @param loginDto
   * @returns - les infos du user créé + token JWT
   * 
   * Note : Cette route n'a pas besoin de token JWT pour être accessible.
   * */
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...response } = await this.authService.login(dto);
    res.cookie('refresh_token', refreshToken, this.cookieOptions());
    return response;
  }


  /**
   * Refresh le token JWT en utilisant un refresh token valide (cookie httpOnly)
   * POST /api/v1/auth/refresh
   * 
   * @param user - Injecté par le RefreshAuthGuard, contient le payload du JWT et le refresh token brut
   * @returns - les infos du user + un nouveau token JWT valide
   *
   */
  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentUser() user: { payload: JwtPayload; refreshToken: string },
  ) {
    return this.authService.refresh(user.payload, user.refreshToken);
  }

  /**
   * Get le user connecté (décodé du token JWT)
   * GET /api/v1/auth/me
   *
   *  @param user - Le user connecté (injecté via le décorateur @CurrentUser())
   *  @return - Les infos du user connecté (sans le mot de passe)
   * 
   * Note : Cette route doit être protégée par le JwtAuthGuard pour s'assurer que seul un utilisateur authentifié peut y accéder
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: User) {
    return user;
  }


  /** 
   * Déconnecter le user en invalidant son token JWT côté serveur 
   * ex: via une blacklist Redis ou en changeant un champ "tokenVersion" dans la BD 
   * POST /api/v1/auth/logout 
   * 
   * @param user - Le user connecté (injecté via le décorateur @CurrentUser())
   * @return - Un message de succès ou une erreur si la déconnexion échoue
   * 
   * Note : Cette route doit être protégée par le JwtAuthGuard pour s'assurer que seul un utilisateur authentifié peut y accéder
   * */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('refresh_token', this.cookieOptions());
    return this.authService.logout(user.id);
  }


  /**
   * Mettre à jour le mot de passe d'un user connecté
   * Patch /api/v1/auth/update-password
   * 
   * @param user - Le user connecté (injecté via le décorateur @CurrentUser())
   * @param updatePasswordDto : L'ancien mot de passe et le nouveau mot de passe
   * @return - Un message de succès ou une erreur si le mdp ne respecte pas les règles de validation 
   * 
   * Note : Cette route doit être protégée par le JwtAuthGuard pour s'assurer que seul un utilisateur authentifié peut y accéder
   */
  @Patch('update-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updatePassword(
    @CurrentUser() user: User,
    @Body() updatePasswordDto: UpdatePasswordDto
  ) {
    return this.authService.updatePassword(user.id, updatePasswordDto);
  }


  /** 
   * Génère et envoie le token de réinitialisation du password
   * POST /api/v1/auth/forgot-password
   * 
   * @param forgotPasswordDto : L'email de l'utilisateur qui a oublié son mot de passe
   * @return : Un message de succès ou une erreur si le mdp ne respecte pas les règles de validation
   * */
  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }


  /** 
   * Valide le token et change le password
   * POST /api/v1/auth/reset-password
   * 
   * @param resetPasswordDto : Le token de réinitialisation et le nouveau mot de passe
   * @return : Un message de succès ou une erreur si le mdp ne respecte pas les règles de validation
   * */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // ─────────────── helpers ─────────────────

  private cookieOptions(): CookieOptions {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure:   isProd,
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 jours en ms
      path:     '/api/v1/auth',
    };
  }
}
