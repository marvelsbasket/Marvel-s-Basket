import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  const createServiceWithConfig = async (configValues: Record<string, any>) => {
    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        return configValues[key] !== undefined ? configValues[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    return module.get<EmailService>(EmailService);
  };

  it('should run in mock mode during test environment', async () => {
    service = await createServiceWithConfig({
      'email.resendApiKey': 're_real_looking_api_key_12345',
      'email.from': "Marvel's Basket <noreply@marvelsbasket.com>",
      'app.nodeEnv': 'test',
      'email.devSendRealEmails': false,
    });

    const result = await service.sendVerificationOtpEmail(
      'customer@test.com',
      'Test Customer',
      '123456',
      5,
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('mock-msg-');
  });

  it('should run in mock mode in development when DEV_SEND_REAL_EMAILS is false', async () => {
    service = await createServiceWithConfig({
      'email.resendApiKey': 're_real_looking_api_key_12345',
      'email.from': "Marvel's Basket <noreply@marvelsbasket.com>",
      'app.nodeEnv': 'development',
      'email.devSendRealEmails': false,
    });

    const result = await service.sendVerificationOtpEmail(
      'dev@example.com',
      'Dev User',
      '654321',
      5,
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('mock-msg-');
  });

  it('should run in mock mode in development when API key is a placeholder even if DEV_SEND_REAL_EMAILS is true', async () => {
    service = await createServiceWithConfig({
      'email.resendApiKey': 're_dev_placeholder_api_key',
      'email.from': "Marvel's Basket <noreply@marvelsbasket.com>",
      'app.nodeEnv': 'development',
      'email.devSendRealEmails': true,
    });

    const result = await service.sendVerificationOtpEmail(
      'dev@example.com',
      'Dev User',
      '654321',
      5,
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('mock-msg-');
  });

  it('should dispatch password reset email in mock mode without throwing', async () => {
    service = await createServiceWithConfig({
      'email.resendApiKey': 're_dev_placeholder_api_key',
      'email.from': "Marvel's Basket <noreply@marvelsbasket.com>",
      'app.nodeEnv': 'development',
      'email.devSendRealEmails': false,
    });

    const result = await service.sendPasswordResetEmail(
      'dev@example.com',
      'Dev User',
      'token123',
      15,
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('mock-msg-');
  });

  it('should dispatch seller lifecycle emails in mock mode without throwing', async () => {
    service = await createServiceWithConfig({
      'email.resendApiKey': 're_dev_placeholder_api_key',
      'email.from': "Marvel's Basket <noreply@marvelsbasket.com>",
      'app.nodeEnv': 'development',
      'email.devSendRealEmails': false,
    });

    const submitted = await service.sendSellerApplicationSubmittedEmail(
      'seller@example.com',
      'Seller',
      'Fresh Market',
      'app-1',
    );
    expect(submitted.success).toBe(true);

    const approved = await service.sendSellerApprovedEmail(
      'seller@example.com',
      'Seller',
      'Fresh Market',
    );
    expect(approved.success).toBe(true);

    const rejected = await service.sendSellerRejectedEmail(
      'seller@example.com',
      'Seller',
      'Fresh Market',
      'PAN blurry',
    );
    expect(rejected.success).toBe(true);

    const suspended = await service.sendSellerSuspendedEmail(
      'seller@example.com',
      'Seller',
      'Fresh Market',
      'Violations',
    );
    expect(suspended.success).toBe(true);

    const reactivated = await service.sendSellerReactivatedEmail(
      'seller@example.com',
      'Seller',
      'Fresh Market',
    );
    expect(reactivated.success).toBe(true);
  });
});
