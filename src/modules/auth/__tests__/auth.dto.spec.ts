import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UserRole } from '@lemobici/lemobici-shared';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto }    from '../dto/login.dto';

async function getErrors<T extends object>(Cls: new () => T, data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(Cls, data) as object);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

const validRegister = {
  email: 'kouame@lemobici.ci', password: 'Password123!',
  firstName: 'Kouamé', lastName: 'Yao', role: UserRole.TENANT,
};

describe('RegisterDto', () => {
  it('valide avec des données correctes', async () => {
    expect(await getErrors(RegisterDto, validRegister)).toHaveLength(0);
  });
  it('rejette un email invalide', async () => {
    expect(await getErrors(RegisterDto, { ...validRegister, email: 'bad' })).not.toHaveLength(0);
  });
  it('rejette password < 8 chars', async () => {
    expect(await getErrors(RegisterDto, { ...validRegister, password: 'Ab1!' })).not.toHaveLength(0);
  });
  it('rejette password sans majuscule', async () => {
    expect(await getErrors(RegisterDto, { ...validRegister, password: 'password1!' })).not.toHaveLength(0);
  });
  it('rejette password sans chiffre', async () => {
    expect(await getErrors(RegisterDto, { ...validRegister, password: 'Password!!' })).not.toHaveLength(0);
  });
  it('rejette password sans caractère spécial', async () => {
    expect(await getErrors(RegisterDto, { ...validRegister, password: 'Password123' })).not.toHaveLength(0);
  });
  it('accepte les rôles TENANT, OWNER, AGENCY', async () => {
    for (const role of [UserRole.TENANT, UserRole.OWNER, UserRole.AGENCY]) {
      expect(await getErrors(RegisterDto, { ...validRegister, role })).toHaveLength(0);
    }
  });
  it('rejette le rôle ADMIN', async () => {
    expect(await getErrors(RegisterDto, { ...validRegister, role: UserRole.ADMIN })).not.toHaveLength(0);
  });
  it('rejette un rôle inconnu', async () => {
    expect(await getErrors(RegisterDto, { ...validRegister, role: 'HACKER' })).not.toHaveLength(0);
  });
});

describe('LoginDto', () => {
  const valid = { email: 'kouame@lemobici.ci', password: 'Password123!' };
  it('valide avec des données correctes', async () => {
    expect(await getErrors(LoginDto, valid)).toHaveLength(0);
  });
  it('rejette un email invalide', async () => {
    expect(await getErrors(LoginDto, { ...valid, email: 'bad@@ci' })).not.toHaveLength(0);
  });
  it('rejette si email absent', async () => {
    expect(await getErrors(LoginDto, { password: 'pass' })).not.toHaveLength(0);
  });
  it('rejette si password absent', async () => {
    expect(await getErrors(LoginDto, { email: 'k@ci.com' })).not.toHaveLength(0);
  });
});
