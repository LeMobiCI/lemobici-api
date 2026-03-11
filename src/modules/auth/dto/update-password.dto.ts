import { IUpdatePasswordPayload } from "@lemobici/lemobici-shared";
import { IsString, Matches, MinLength } from "class-validator";
import { Match } from "../../../common/decorators/match.decorator";

export class UpdatePasswordDto implements IUpdatePasswordPayload {
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Le mot de passe doit contenir au moins 1 majuscule, 1 chiffre et 1 caractère spécial',
  })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Le nouveau mot de passe doit contenir au moins 1 majuscule, 1 chiffre et 1 caractère spécial',
  })
  newPassword: string;

  @IsString()
  @Match('newPassword', { message: 'Les mots de passe ne correspondent pas' })
  confirmPassword: string;
}