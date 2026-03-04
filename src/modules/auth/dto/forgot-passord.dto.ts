import { IForgotPasswordPayload } from "@lemobici/lemobici-shared";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto implements IForgotPasswordPayload {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  email: string;
}