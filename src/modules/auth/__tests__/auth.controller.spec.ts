import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@lemobici/lemobici-shared';

import { CookieOptions, Response } from 'express';

import { AuthController } from '../auth.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService }    from '../auth.service';
import { RegisterDto }    from '../dto/register.dto';
import { LoginDto }       from '../dto/login.dto';
import { User }           from '../entities/user.entity';
import { RefreshAuthGuard } from '../guards/refresh-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UpdatePasswordDto } from '../dto/update-password.dto';

// ───────── Factories ──────────

const makeUser = (o: Partial<User> = {}): User => ({
  id: 'uuid-1234', email: 'kouame@lemobici.ci',
  firstName: 'Kouamé', lastName: 'Yao',
  role: UserRole.TENANT, isActive: true,
  resetPasswordToken: null, resetPasswordExpiry: null,
  createdAt: new Date(), updatedAt: new Date(), ...o,
} as User);

const mockRes = () => ({
  cookie:      jest.fn(),
  clearCookie: jest.fn(),
} as unknown as Response);

const mockService = { 
  register: jest.fn(), 
  login: jest.fn(), 
  logout: jest.fn(),
  refresh: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => key === 'NODE_ENV' ? 'test' : undefined),
};

const mockGuard = {
  canActive: jest.fn(() => true),
}

const makeResponse = () => ({
  accessToken:  'mock.access.token',
  refreshToken: 'mock.refresh.token',
  user: makeUser(),
});

// ───────── Suite ──────────

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockService },
        { provide: ConfigService, useValue: mockConfigService }
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue(mockGuard)
    .overrideGuard(RefreshAuthGuard).useValue(mockGuard)
    .overrideGuard(ThrottlerGuard).useValue(mockGuard)
    .compile();

    controller = module.get(AuthController);
  });

  afterEach(() => jest.clearAllMocks());


  // ───────── register ──────────

  describe('POST /auth/register', () => {
    it('devrait poser le cookie et retourner { accessToken, user } sans refreshToken', async () => {
      const dto: RegisterDto = {
        email: 'kouame@lemobici.ci', password: 'Password123!',
        firstName: 'Kouamé', lastName: 'Yao', role: UserRole.TENANT,
      };
      mockService.register.mockResolvedValue(makeResponse());
      const res    = mockRes();
      const result = await controller.register(dto, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token', 'mock.refresh.token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('accessToken');
    });
  });
  

  // ───────── login ──────────

  describe('POST /auth/login', () => {
    it('devrait poser le cookie et retourner { accessToken, user } sans refreshToken', async () => {
      const dto: LoginDto = { email: 'kouame@lemobici.ci', password: 'Password123!' };
      mockService.login.mockResolvedValue(makeResponse());
      const res    = mockRes();
      const result = await controller.login(dto, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token', 'mock.refresh.token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('devrait propager UnauthorizedException', async () => {
      mockService.login.mockRejectedValue(new UnauthorizedException());
      await expect(controller.login({} as LoginDto, mockRes())).rejects.toThrow(UnauthorizedException);
    });
  });
  

  // ───────── refresh ──────────

  describe('POST /auth/refresh', () => {
    it('devrait retourner un nouvel accessToken', async () => {
      const user = { payload: { sub: 'uuid-1234', email: 'k@ci.com', role: UserRole.TENANT }, refreshToken: 'raw' };
      mockService.refresh.mockResolvedValue({ accessToken: 'new.access.token' });
      const result = await controller.refresh(user);
      expect(mockService.refresh).toHaveBeenCalledWith(user.payload, user.refreshToken);
      expect(result).toEqual({ accessToken: 'new.access.token' });
    });
  });


  // ───────── logout ──────────

  describe('POST /auth/logout', () => {
    it('devrait effacer le cookie et appeler logout', async () => {
      const user = makeUser();
      mockService.logout.mockResolvedValue({ message: 'Déconnexion réussie' });
      const res    = mockRes();
      const result = await controller.logout(user, res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token', expect.objectContaining({ httpOnly: true }),
      );
      expect(mockService.logout).toHaveBeenCalledWith('uuid-1234');
      expect(result).toEqual({ message: 'Déconnexion réussie' });
    });
  });


  // ───────── getProfile ──────────

  describe('GET /auth/me', () => {
    it("devrait retourner l'utilisateur connecté", () => {
      const user = makeUser({ role: UserRole.OWNER });
      expect(controller.getProfile(user)).toEqual(user);
    });
  });


  // ───────── forgotPassword ──────────

  describe('POST /auth/forgot-password', () => {
    it('devrait retourner le message générique', async () => {
      const msg = { message: 'Si un compte existe...' };
      mockService.forgotPassword.mockResolvedValue(msg);
      expect(await controller.forgotPassword({ email: 'k@ci.com' })).toEqual(msg);
    });
  });


  // ───────── resetPassword ──────────

  describe('POST /auth/reset-password', () => {
    it('devrait retourner un message de succès', async () => {
      mockService.resetPassword.mockResolvedValue({ message: 'Mot de passe réinitialisé avec succès' });
      expect(await controller.resetPassword({ token: 'tok', newPassword: 'P1!' }))
        .toEqual({ message: 'Mot de passe réinitialisé avec succès' });
    });
  });


  // ───────── updatePassword ──────────

  describe('PATCH /auth/update-password', () => {
    it("devrait appeler updatePassword avec l'id de l'utilisateur", async () => {
      const user = makeUser();
      const dto: UpdatePasswordDto = {
        currentPassword: 'OldPass1!',
        newPassword:     'NewPass1!',
        confirmPassword: 'NewPass1!',
      };
      mockService.updatePassword.mockResolvedValue({ message: 'Mot de passe mis à jour avec succès' });
      const result = await controller.updatePassword(user, dto);
      expect(mockService.updatePassword).toHaveBeenCalledWith('uuid-1234', dto);
      expect(result).toEqual({ message: 'Mot de passe mis à jour avec succès' });
    });
  });
});