import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Module({
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService], // Exporter pour l'injecter dans AuthService
})
export class MailModule {}
