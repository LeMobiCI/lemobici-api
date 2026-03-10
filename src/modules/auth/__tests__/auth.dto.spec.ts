import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UserRole } from '@lemobici/lemobici-shared';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto }    from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-passord.dto';
import { ResetPasswordDto } from '../dto/reset-passord.dto';
import { UpdatePasswordDto } from '../dto/update-password.dto';

async function getErrors<T extends object>(Cls: new () => T, data: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(Cls, data) as object);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

const validRegister = {
  email: 'kouame@lemobici.ci', password: 'Password123!',
  firstName: 'Kouamé', lastName: 'Yao', role: UserRole.TENANT,
};


// —————————————— RegisterDto —————————————

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


// —————————————— LoginDto —————————————

describe('LoginDto', () => {

  const validData = { email: 'kouame@lemobici.ci', password: 'Password123!' };
  
  it('valide avec des données correctes', async () => {
    expect(await getErrors(LoginDto, validData)).toHaveLength(0);
  });
  
  it('rejette un email invalide', async () => {
    expect(await getErrors(LoginDto, { ...validData, email: 'bad@@ci' })).not.toHaveLength(0);
  });

  it('rejette si email absent', async () => {
    expect(await getErrors(LoginDto, { password: 'pass' })).not.toHaveLength(0);
  });

  it('rejette si password absent', async () => {
    expect(await getErrors(LoginDto, { email: 'k@ci.com' })).not.toHaveLength(0);
  });
});


// —————————————— ForgotPasswordDto —————————————

describe('ForgotPasswordDto', () => {

  it('valide avec des données correctes', async () => {
    expect(await getErrors(ForgotPasswordDto, { email: 'kouame@lemobici.ci' })).toHaveLength(0);
  });

  it('rejette si email absent', async () => {
    expect(await getErrors(ForgotPasswordDto, {})).not.toHaveLength(0);
  });

  it('rejette si email invalide', async () => {
    expect(await getErrors(ForgotPasswordDto, { email: 'bad' })).not.toHaveLength(0);
  });
});


// —————————————— IResetPasswordDto —————————————

describe('ResetPasswordDto', () => {
  
  const validData = { token: 'token', newPassword: 'Password123!' };

  it('valide avec des données correctes', async () => {
    expect(await getErrors(ResetPasswordDto, validData)).toHaveLength(0);
  });

  it('rejette si token absent', async () => {
    expect(await getErrors(ResetPasswordDto, { newPassword: 'pass' })).not.toHaveLength(0);
  });

  it('rejette si password absent', async () => {
    expect(await getErrors(ResetPasswordDto, { token: 'token' })).not.toHaveLength(0);
  });

  it('rejette si password invalide', async () => {
    expect(await getErrors(ResetPasswordDto, { token: 'token', newPassword: 'pass' })).not.toHaveLength(0);
  });
});


// —————————————— IResetPasswordDto —————————————

describe('UpdatePasswordDto', () => {

  const validData = { currentPassword: 'OldPass1!', newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' };

  it('valide avec des données correctes', async () => {
    expect(await getErrors(UpdatePasswordDto, validData)).toHaveLength(0);
  });

  it('rejette si currentPassword absent', async () => {
    expect(await getErrors(UpdatePasswordDto, { newPassword: 'pass', confirmPassword: 'pass' })).not.toHaveLength(0);
  });

  it('rejette si newPassword absent', async () => {
    expect(await getErrors(UpdatePasswordDto, { currentPassword: 'pass', confirmPassword: 'pass' })).not.toHaveLength(0);
  });

  it('rejette si confirmPassword absent', async () => {
    expect(await getErrors(UpdatePasswordDto, { currentPassword: 'pass', newPassword: 'pass' })).not.toHaveLength(0);
  });

  it('rejette si currentPassword invalide', async () => {
    expect(await getErrors(UpdatePasswordDto, { currentPassword: 'pass', newPassword: 'pass', confirmPassword: 'pass' })).not.toHaveLength(0);
  });

  it('rejette si newPassword invalide', async () => {
    expect(await getErrors(UpdatePasswordDto, { currentPassword: 'OldPass1!', newPassword: 'pass', confirmPassword: 'pass' })).not.toHaveLength(0);
  });

  it('rejette si confirmPassword invalide', async () => {
    expect(await getErrors(UpdatePasswordDto, { currentPassword: 'OldPass1!', newPassword: 'NewPass1!', confirmPassword: 'pass' })).not.toHaveLength(0);
  });

  it('rejette si les mots de passe ne correspondent pas', async () => {
    expect(await getErrors(UpdatePasswordDto, { currentPassword: 'OldPass1!', newPassword: 'NewPass1!', confirmPassword: 'NewPass2!' })).not.toHaveLength(0);
  });
});