import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { StringValue } from 'ms';

import {
  IAuthResponse,
  IMessageResponse,
  BCRYPT_SALT_ROUNDS,
  JwtPayload,
} from '@lemobici/lemobici-shared';

import { RegisterDto } from './dto/register.dto';
import { LoginDto }    from './dto/login.dto';
import { User }        from './entities/user.entity';
import { ForgotPasswordDto } from './dto/forgot-passord.dto';
import { ResetPasswordDto } from './dto/reset-passord.dto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RedisService } from '../redis/redis.service';


// Clé Redis pour les refresh tokens : "refresh:<userId>"
const refreshKey = (userId: string) => `refresh:${userId}`;


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
  ) {}

  // ───────── register ──────────

  async register(dto: RegisterDto): Promise<IAuthResponse> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Cet email est déjà associé à un compte');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user  = this.userRepository.create({ ...dto, password: hashedPassword });
    const saved = await this.userRepository.save(user);

    return this.buildResponse(saved);
  }

  // ───────── login ──────────

  async login(dto: LoginDto): Promise<IAuthResponse> {
    // addSelect obligatoire : password a select:false sur l'entité
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte a été désactivé');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.buildResponse(user);
  }

  // ───────── refresh ──────────

  async refresh(
    payload: JwtPayload,
    refreshToken: string
  ): Promise<{ accessToken: string }> {
    // Récupérer le hash stocké dans Redis
    const stored = await this.redisService.get(refreshKey(payload.sub));

    if (!stored) {
      throw new ForbiddenException('Session expirée, veuillez vous reconnecter');
    }

    // Comparer le token reçu avec le hash en Redis
    const isValid = await bcrypt.compare(refreshToken, stored);
    if (!isValid) {
      // Token potentiellement volé — invalider toute la session
      await this.redisService.del(refreshKey(payload.sub));
      throw new ForbiddenException('Refresh token invalide');
    }

    // Émettre un nouvel access token
    const accessToken = this.signAccessToken(payload.sub, payload.email, payload.role);

    return { accessToken };
  }

  // ───────── logout ──────────
  async logout(userId: string): Promise<IMessageResponse> {
    // Invalider le refresh token en Redis
    await this.redisService.del(refreshKey(userId));
    return { message: 'Déconnexion réussie' };
  }

  // ───────── updatePassword ──────────

  async updatePassword(userId: string, dto: UpdatePasswordDto): Promise<IMessageResponse> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Mot de passe actuel incorrect');

    // confirmPassword déjà validé par le DTO — inutile de le revérifier ici
    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.save(user);

    return { message: 'Mot de passe mis à jour avec succès' };
  }

  // ───────── forgotPassword ──────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<IMessageResponse> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    // Réponse identique que l'email existe ou non
    // → empêche l'énumération d'emails (user enumeration attack)
    const genericMessage = {
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    };

    if (!user || !user.isActive) {
      return genericMessage;
    }

    // Générer un token aléatoire cryptographiquement sûr (32 bytes → 64 chars hex)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Stocker le hash en DB (jamais le token brut)
    // → si la DB est compromise, les tokens ne peuvent pas être utilisés
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiryMinutes =
      this.configService.get<number>('mail.resetPasswordExpiryMinutes') ?? 60;

    user.resetPasswordToken  = hashedToken;
    user.resetPasswordExpiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
    await this.userRepository.save(user);

    // Envoyer l'email avec le token BRUT (pas le hash)
    await this.mailService.sendResetPassword({
      to:         user.email,
      firstName:  user.firstName,
      resetToken: rawToken,
    });

    return genericMessage;
  }

  // ───────── resetPassword ──────────
  async resetPassword(dto: ResetPasswordDto): Promise<IMessageResponse> {
    // Hasher le token reçu pour comparer avec celui en DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordToken')
      .addSelect('user.resetPasswordExpiry')
      .where('user.resetPasswordToken = :token', { token: hashedToken })
      .getOne();

    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    // Vérifier l'expiration
    if (!user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      // Nettoyer le token expiré
      user.resetPasswordToken = null as any;
      user.resetPasswordExpiry = null as any;
      await this.userRepository.save(user);
      throw new BadRequestException('Token invalide ou expiré');
    }

    // Mettre à jour le mot de passe
    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    user.resetPasswordToken  = null as any;   // invalider le token après usage
    user.resetPasswordExpiry = null as any;
    await this.userRepository.save(user);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  // ───────── Helpers ──────────

  private async buildResponse(user: User): Promise<IAuthResponse> {
    const accessToken  = this.signAccessToken(user.id, user.email, user.role);
    const refreshToken = this.signRefreshToken(user.id, user.email, user.role);

    // Hasher le refresh token avant de le stocker dans Redis
    const hashedRefresh = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
    await this.redisService.set(refreshKey(user.id), hashedRefresh, 7 * 24 * 60 * 60);

    const { password: _pwd, ...userWithoutPassword } = user;
    return { accessToken, refreshToken, user: userWithoutPassword };
  }

  private signAccessToken(sub: string, email: string, role: string): string {
    return this.jwtService.sign(
      { sub, email, role },
      {
        secret:    this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m' as string) as StringValue,
      },
    );
  }

  private signRefreshToken(sub: string, email: string, role: string): string {
    return this.jwtService.sign(
      { sub, email, role },
      {
        secret:    this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as StringValue,
      },
    );
  }
}