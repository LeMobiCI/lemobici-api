import {
  IsEmail,
  IsEnum,
  IsNotIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IRegisterPayload, UserRole } from '@lemobici/lemobici-shared';

/**
 * DTO pour l'inscription d'un nouvel utilisateur.
 */
export class RegisterDto implements IRegisterPayload {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, un chiffre et un caractère spécial',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsEnum(UserRole, { message: 'Rôle invalide' })
  @IsNotIn([UserRole.ADMIN], {
    message: "Le rôle ADMIN ne peut pas être assigné lors de l'inscription",
  })
  role: UserRole;
}