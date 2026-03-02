import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { UserRole } from '@lemobici/lemobici-shared';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard }   from '../guards/roles.guard';
import { ROLES_KEY }    from '../decorators/roles.decorator';

const makeCtx = (opts: {
  headers?: Record<string, string>;
  user?: Record<string, unknown> | null;
} = {}): ExecutionContext => {
  const req = { headers: opts.headers ?? {}, user: opts.user ?? null };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: jest.fn(), getClass: jest.fn(),
  } as unknown as ExecutionContext;
};

// ── JwtAuthGuard ──────────────────────────────────────────────────────────────

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt:   jest.Mocked<JwtService>;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService,    useValue: { verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
      ],
    }).compile();
    guard = m.get(JwtAuthGuard);
    jwt   = m.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  it('devrait autoriser un token valide et attacher le payload à request.user', () => {
    const payload = { sub: 'uuid-1234', email: 'k@lemobici.ci', role: UserRole.TENANT };
    jwt.verify.mockReturnValue(payload);
    const ctx = makeCtx({ headers: { authorization: 'Bearer valid.token' } });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toEqual(payload);
  });

  it('devrait lever UnauthorizedException si header manquant', () => {
    expect(() => guard.canActivate(makeCtx({ headers: {} }))).toThrow(UnauthorizedException);
  });

  it('devrait lever UnauthorizedException si préfixe "Bearer" absent', () => {
    expect(() => guard.canActivate(makeCtx({ headers: { authorization: 'token' } }))).toThrow(UnauthorizedException);
  });

  it('devrait lever UnauthorizedException si token expiré', () => {
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });
    expect(() => guard.canActivate(makeCtx({ headers: { authorization: 'Bearer bad' } }))).toThrow(UnauthorizedException);
  });
});

// ── RolesGuard ────────────────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard:     RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    }).compile();
    guard     = m.get(RolesGuard);
    reflector = m.get(Reflector);
  });

  afterEach(() => jest.clearAllMocks());

  it("devrait autoriser si aucun rôle n'est requis", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeCtx({ user: { role: UserRole.TENANT } }))).toBe(true);
  });

  it('devrait vérifier via ROLES_KEY', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.OWNER]);
    const ctx = makeCtx({ user: { role: UserRole.OWNER } });
    guard.canActivate(ctx);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
  });

  it("devrait autoriser l'ADMIN sur toute route protégée", () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.OWNER]);
    expect(guard.canActivate(makeCtx({ user: { role: UserRole.ADMIN } }))).toBe(true);
  });

  it('devrait autoriser le bon rôle', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.OWNER, UserRole.AGENCY]);
    expect(guard.canActivate(makeCtx({ user: { role: UserRole.OWNER } }))).toBe(true);
  });

  it('devrait lever ForbiddenException si rôle insuffisant', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.OWNER]);
    expect(() => guard.canActivate(makeCtx({ user: { role: UserRole.TENANT } }))).toThrow(ForbiddenException);
  });

  it('devrait lever ForbiddenException si user est null', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.TENANT]);
    expect(() => guard.canActivate(makeCtx({ user: null }))).toThrow(ForbiddenException);
  });
});
