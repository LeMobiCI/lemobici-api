import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService }     from '@nestjs/jwt';
import { ConfigService }  from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken }  from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { UserRole }     from '@lemobici/lemobici-shared';
import { AuthService }  from '../auth.service';
import { RegisterDto }  from '../dto/register.dto';
import { LoginDto }     from '../dto/login.dto';
import { User }         from '../entities/user.entity';
import { MailService }  from '../../mail/mail.service';
import { RedisService } from '../../redis/redis.service';

// ────────── Mocks & Factories ──────────

const makeUser = (o: Partial<User> = {}): User => ({
  id: 'uuid-1234', email: 'kouame@lemobici.ci',
  password: '$2b$10$hashed', firstName: 'Kouamé', lastName: 'Yao',
  role: UserRole.TENANT, isActive: true,
  resetPasswordToken: null, resetPasswordExpiry: null,
  createdAt: new Date(), updatedAt: new Date(), ...o,
} as User);

const makeRegisterDto = (o: Partial<RegisterDto> = {}): RegisterDto => ({
  email: 'kouame@lemobici.ci', password: 'Password123!',
  firstName: 'Kouamé', lastName: 'Yao', role: UserRole.TENANT, ...o,
});

const makeLoginDto = (o: Partial<LoginDto> = {}): LoginDto => ({
  email: 'kouame@lemobici.ci', password: 'Password123!', ...o,
});

// Mock de bcrypt 
jest.mock('bcrypt', () => ({
  hash:    jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock de la QueryBuilder
const makeQB = (result: User | null) => ({
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(result),
});

// Mock du repository TypeORM
const mockRepo = () => ({
  findOne:            jest.fn(),
  create:             jest.fn(),
  save:               jest.fn(),
  createQueryBuilder: jest.fn(),
});

// Mock des services externes
const mockMailService  = { 
  sendResetPassword: jest.fn().mockResolvedValue(undefined) 
};
const mockRedisService = {
  get:    jest.fn(),
  set:    jest.fn().mockResolvedValue(undefined),
  del:    jest.fn().mockResolvedValue(undefined),
  exists: jest.fn(),
};

// ───────── Suite ──────────

describe('AuthService', () => {
  let service: AuthService;
  let repo:    ReturnType<typeof mockRepo>;
  let jwt:     jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockRepo() },
        { provide: JwtService,    useValue: { sign: jest.fn().mockReturnValue('mock.token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test_value') } },
        { provide: MailService,   useValue: mockMailService },
        { provide: RedisService,  useValue: mockRedisService },
      ],
    }).compile();

    service = module.get(AuthService);
    repo    = module.get(getRepositoryToken(User));
    jwt     = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── register ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('devrait retourner accessToken + refreshToken et stocker dans Redis', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      const result = await service.register(makeRegisterDto());

      expect(result.accessToken).toBe('mock.token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user).not.toHaveProperty('password');
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `refresh:${user.id}`, expect.any(String), 604800,
      );
    });

    it("devrait lever ConflictException si l'email existe déjà", async () => {
      repo.findOne.mockResolvedValue(makeUser());
      await expect(service.register(makeRegisterDto())).rejects.toThrow(ConflictException);
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('devrait hasher le mot de passe avec SALT_ROUNDS=10', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(makeUser());
      repo.save.mockResolvedValue(makeUser());
      const spy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      await service.register(makeRegisterDto({ password: 'Secret123!' }));
      expect(spy).toHaveBeenCalledWith('Secret123!', 10);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('devrait retourner accessToken + refreshToken', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(makeUser()));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      const result = await service.login(makeLoginDto());
      expect(result.accessToken).toBe('mock.token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user).not.toHaveProperty('password');
    });

    it("devrait lever UnauthorizedException si l'utilisateur est introuvable", async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(null));
      await expect(service.login(makeLoginDto())).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lever UnauthorizedException si mot de passe incorrect', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(makeUser()));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(service.login(makeLoginDto())).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lever UnauthorizedException si compte désactivé', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(makeUser({ isActive: false })));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      await expect(service.login(makeLoginDto())).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    const payload      = { sub: 'uuid-1234', email: 'k@lemobici.ci', role: UserRole.TENANT };
    const refreshToken = 'raw.refresh.token';

    it('devrait retourner un nouvel accessToken si valide', async () => {
      mockRedisService.get.mockResolvedValue('stored_hash');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.refresh(payload, refreshToken);
      expect(result.accessToken).toBe('mock.token');
    });

    it('devrait lever ForbiddenException si session expirée (Redis vide)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      await expect(service.refresh(payload, refreshToken)).rejects.toThrow(ForbiddenException);
    });

    it('devrait invalider Redis et lever ForbiddenException si token ne correspond pas', async () => {
      mockRedisService.get.mockResolvedValue('stored_hash');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.refresh(payload, refreshToken)).rejects.toThrow(ForbiddenException);
      expect(mockRedisService.del).toHaveBeenCalledWith(`refresh:${payload.sub}`);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('devrait supprimer la clé Redis et retourner le message', async () => {
      const result = await service.logout('uuid-1234');
      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:uuid-1234');
      expect(result).toEqual({ message: 'Déconnexion réussie' });
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    const dto = { email: 'kouame@lemobici.ci' };
    const genericMessage = {
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    };

    it('devrait envoyer un email et retourner le message générique', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue(user);
      expect(await service.forgotPassword(dto)).toEqual(genericMessage);
      expect(mockMailService.sendResetPassword).toHaveBeenCalled();
    });

    it("devrait retourner le message générique si compte inexistant", async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.forgotPassword(dto)).toEqual(genericMessage);
      expect(mockMailService.sendResetPassword).not.toHaveBeenCalled();
    });

    it('devrait stocker un hash SHA-256 en DB', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue(user);
      await service.forgotPassword(dto);
      const saved = repo.save.mock.calls[0][0] as User;
      expect(saved.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    const rawToken    = 'abc123rawtoken';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    it('devrait changer le mot de passe et effacer le token', async () => {
      const user = makeUser({
        resetPasswordToken:  hashedToken,
        resetPasswordExpiry: new Date(Date.now() + 3600_000),
      });
      repo.createQueryBuilder.mockReturnValue(makeQB(user));
      repo.save.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newHashed' as never);

      const result = await service.resetPassword({ token: rawToken, newPassword: 'NewPass1!' });
      expect(result).toEqual({ message: 'Mot de passe réinitialisé avec succès' });
      expect((repo.save.mock.calls[0][0] as User).resetPasswordToken).toBeNull();
    });

    it('devrait lever BadRequestException si token invalide', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(null));
      await expect(service.resetPassword({ token: 'bad', newPassword: 'P1!' }))
        .rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si token expiré', async () => {
      const user = makeUser({
        resetPasswordToken:  hashedToken,
        resetPasswordExpiry: new Date(Date.now() - 1000),
      });
      repo.createQueryBuilder.mockReturnValue(makeQB(user));
      repo.save.mockResolvedValue(user);
      await expect(service.resetPassword({ token: rawToken, newPassword: 'P1!' }))
        .rejects.toThrow(BadRequestException);
    });
  });
});
