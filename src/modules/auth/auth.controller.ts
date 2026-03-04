import {
  Body, Controller, HttpCode,
  HttpStatus, Patch, Post, UseGuards,
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


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
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
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }


  /**
   * Mettre à jour le mot de passe d'un user connecté
   * POST /api/v1/auth/update-password
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
    console.log('Received updatePassword request for user:', user.id);
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
}
