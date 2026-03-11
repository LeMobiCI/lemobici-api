import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { resetPasswordTemplate } from './templates/reset-password.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: configService.get<string>('mail.host'),
      port: configService.get<number>('mail.port'),
      secure: configService.get<boolean>('mail.secure'),
      auth: {
        user: configService.get<string>('mail.user'),
        pass: configService.get<string>('mail.password'),
      },
    });
  }

  // ── sendResetPassword ──────────────────────────────────────────────────────

  async sendResetPassword(params: {
    to:        string;
    firstName: string;
    resetToken: string;
  }): Promise<void> {
    const frontendUrl    = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const expiryMinutes  = this.configService.get<number>('mail.resetPasswordExpiryMinutes') ?? 60;
    const fromName       = this.configService.get<string>('mail.from.name');
    const fromAddress    = this.configService.get<string>('mail.from.address');

    const resetUrl = `${frontendUrl}/auth/reset-password?token=${params.resetToken}`;

    const { subject, html, text } = resetPasswordTemplate({
      firstName: params.firstName,
      resetUrl,
      expiryMinutes,
    });

    try {
      await this.transporter.sendMail({
        from:    `"${fromName}" <${fromAddress}>`,
        to:      params.to,
        subject,
        html,
        text,
      });

      this.logger.log(`Email de réinitialisation envoyé à ${params.to}`);
    } catch (error) {
      this.logger.error(
        `Échec de l'envoi de l'email à ${params.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      // On ne propage pas l'erreur au client pour ne pas révéler
      // si l'email existe en base ou non
    }
  }

  // ── verifyConnection ───────────────────────────────────────────────────────

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Connexion SMTP vérifiée avec succès');
      return true;
    } catch (error) {
      this.logger.error('Échec de la connexion SMTP', error);
      return false;
    }
  }
}