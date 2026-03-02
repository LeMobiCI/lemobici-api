import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import {
  IAuthResponse,
  ILogoutResponse,
  BCRYPT_SALT_ROUNDS,
} from '@lemobici/lemobici-shared';

import { RegisterDto } from './dto/register.dto';
import { LoginDto }    from './dto/login.dto';
import { User }        from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService:     JwtService,
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

  // ───────── logout ──────────

  async logout(_userId: string): Promise<ILogoutResponse> {
    // JWT stateless : la suppression du token est gérée côté client.
    // Pour une révocation serveur → implémenter une blacklist Redis.
    return { message: 'Déconnexion réussie' };
  }

  // ───────── validateUser (utilisé par LocalStrategy si ajouté) ──────────

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    const { password: _pwd, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ───────── Helpers ──────────

  private buildResponse(user: User): IAuthResponse {
    // Le JwtModule est déjà configuré avec secret + expiresIn via registerAsync.
    // On appelle sign() SANS options → il utilise la config du module directement.
    const accessToken = this.jwtService.sign({ 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    });

    const { password: _pwd, ...userWithoutPassword } = user;
    return { accessToken, user: userWithoutPassword };
  }
}