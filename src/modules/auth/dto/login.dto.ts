import {
  IsEmail,
  IsString,
  MinLength
} from 'class-validator';
import { ILoginPayload } from '@lemobici/lemobici-shared';

/**
 * DTO pour la connexion d'un utilisateur existant.
 */
export class LoginDto implements ILoginPayload {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis' })
  password: string;
}








