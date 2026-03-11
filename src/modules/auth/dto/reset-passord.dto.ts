import { IResetPasswordPayload } from "@lemobici/lemobici-shared";
import { 
  IsString,
  Matches, 
  MinLength 
} from "class-validator";

export class ResetPasswordDto implements IResetPasswordPayload {
  @IsString({ message: 'Le token est requis' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Le mot de passe doit contenir au moins 1 majuscule, 1 chiffre et 1 caractère spécial',
  })
  newPassword: string;
}