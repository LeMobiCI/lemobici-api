import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@lemobici/lemobici-shared';

import { AuthController } from '../auth.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService }    from '../auth.service';
import { RegisterDto }    from '../dto/register.dto';
import { LoginDto }       from '../dto/login.dto';
import { User }           from '../entities/user.entity';

// ───────── Factories ──────────

const mockService = { 
  register: jest.fn(), 
  login: jest.fn(), 
  logout: jest.fn() 
};

const mockGuard = {
  canActive: jest.fn(() => true),
}

const makeResponse = () => ({
  accessToken: 'mock.token',
  user: { id: 'uuid-1234', email: 'kouame@lemobici.ci', role: UserRole.TENANT, isActive: true },
});

// ───────── Suite ──────────

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockService }],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue(mockGuard)
    .compile();

    controller = module.get(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /auth/register', () => {
    it('devrait déléguer au service et retourner le résultat', async () => {
      const dto: RegisterDto = {
        email: 'kouame@lemobici.ci', password: 'Password123!',
        firstName: 'Kouamé', lastName: 'Yao', role: UserRole.TENANT,
      };
      mockService.register.mockResolvedValue(makeResponse());
      const result = await controller.register(dto);
      expect(mockService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(makeResponse());
    });

    it('devrait propager les exceptions du service', async () => {
      mockService.register.mockRejectedValue(new Error('Email déjà utilisé'));
      await expect(controller.register({} as RegisterDto)).rejects.toThrow('Email déjà utilisé');
    });
  });
  
  describe('POST /auth/login', () => {
    it('devrait déléguer au service et retourner le token', async () => {
      const dto: LoginDto = { email: 'kouame@lemobici.ci', password: 'Password123!' };
      mockService.login.mockResolvedValue(makeResponse());
      const result = await controller.login(dto);
      expect(mockService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(makeResponse());
    });

    it('devrait propager UnauthorizedException', async () => {
      mockService.login.mockRejectedValue(new UnauthorizedException());
      await expect(controller.login({} as LoginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/logout', () => {
    it("devrait appeler logout avec l'id de l'utilisateur", async () => {
      const user = { id: 'uuid-1234', role: UserRole.TENANT } as User;
      mockService.logout.mockResolvedValue({ message: 'Déconnexion réussie' });
      const result = await controller.logout(user);
      expect(mockService.logout).toHaveBeenCalledWith('uuid-1234');
      expect(result).toEqual({ message: 'Déconnexion réussie' });
    });
  });
});