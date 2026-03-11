import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../mail.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ───────── Factories ──────────

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, unknown> = {
      'mail.host': 'smtp.gmail.com', 'mail.port': 587, 'mail.secure': false,
      'mail.user': 'test@lemobici.ci', 'mail.password': 'password',
      'mail.from.name': 'LeMobici', 'mail.from.address': 'noreply@lemobici.ci',
      'mail.resetPasswordExpiryMinutes': 60, 'FRONTEND_URL': 'http://localhost:4200',
    };
    return config[key];
  }),
};

// ───────── Suite ──────────

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get(MailService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
