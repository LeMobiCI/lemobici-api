import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { UserRole } from '@lemobici/lemobici-shared';
import { AuthService } from '../auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { User } from '../entities/user.entity';

// ───────── Factories ──────────

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const expectJwtSignedWithUser = (
  jwt: jest.Mocked<JwtService>,
  user: User,
) => {
  expect(jwt.sign).toHaveBeenCalledWith(
    expect.objectContaining({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
  );
};

const makeUser = (o: Partial<User> = {}): User => ({
  id: 'uuid-1234', email: 'kouame@lemobici.ci',
  password: '$2b$10$hashed', firstName: 'Kouamé', lastName: 'Yao',
  role: UserRole.TENANT, isActive: true,
  createdAt: new Date(), updatedAt: new Date(), ...o,
} as User);

const makeRegisterDto = (o: Partial<RegisterDto> = {}): RegisterDto => ({
  email: 'kouame@lemobici.ci', password: 'Password123!',
  firstName: 'Kouamé', lastName: 'Yao', role: UserRole.TENANT, ...o,
});

const makeLoginDto = (o: Partial<LoginDto> = {}): LoginDto => ({
  email: 'kouame@lemobici.ci', password: 'Password123!', ...o,
});

const makeQB = (result: User | null) => ({
  addSelect: jest.fn().mockReturnThis(),
  where:     jest.fn().mockReturnThis(),
  getOne:    jest.fn().mockResolvedValue(result),
});

const mockRepo = () => ({
  findOne:            jest.fn(),
  create:             jest.fn(),
  save:               jest.fn(),
  createQueryBuilder: jest.fn(),
});

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
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock.token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test_secret') } },
      ],
    }).compile();

    service = module.get(AuthService);
    repo    = module.get(getRepositoryToken(User));
    jwt     = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── register ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('devrait créer un utilisateur et retourner un accessToken', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      const result = await service.register(makeRegisterDto());

      expect(result.accessToken).toBe('mock.token');
      expect(result.user).not.toHaveProperty('password');
    });

    it("devrait lever ConflictException si l'email existe déjà", async () => {
      repo.findOne.mockResolvedValue(makeUser());
      await expect(service.register(makeRegisterDto())).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('devrait hasher le mot de passe avec BCRYPT_SALT_ROUNDS', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(makeUser());
      repo.save.mockResolvedValue(makeUser());
      const spy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      await service.register(makeRegisterDto({ password: 'Secret123!' }));
      expect(spy).toHaveBeenCalledWith('Secret123!', 10);
    });

    it('devrait signer le JWT avec sub, email et role', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(user);
      repo.save.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      await service.register(makeRegisterDto());
      
      expectJwtSignedWithUser(jwt, user);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('devrait retourner un accessToken pour des identifiants valides', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(makeUser()));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login(makeLoginDto());
      expect(result.accessToken).toBe('mock.token');
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

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('devrait retourner un message de confirmation', async () => {
      expect(await service.logout('uuid-1234')).toEqual({ message: 'Déconnexion réussie' });
    });
  });

  // ── validateUser ──────────────────────────────────────────────────────────

  describe('validateUser()', () => {
    it("devrait retourner l'utilisateur sans password si valide", async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(makeUser()));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const result = await service.validateUser('kouame@lemobici.ci', 'pass');
      expect(result).not.toHaveProperty('password');
    });

    it("devrait retourner null si l'utilisateur est introuvable", async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(null));
      expect(await service.validateUser('ghost@ci', 'pass')).toBeNull();
    });

    it('devrait retourner null si mot de passe incorrect', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQB(makeUser()));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      expect(await service.validateUser('kouame@lemobici.ci', 'bad')).toBeNull();
    });
  });
});