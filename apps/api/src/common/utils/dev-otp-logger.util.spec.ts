import { formatDevOtpBox, logDevEmailOtp } from './dev-otp-logger.util';

describe('DevOtpLogger Utility', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('formatDevOtpBox', () => {
    it('should format the terminal OTP box with all required fields', () => {
      const expiresAt = new Date('2026-11-20T09:35:00');
      const box = formatDevOtpBox({
        purpose: 'Email Verification',
        email: 'test@example.com',
        otp: '483921',
        expiresAt,
      });

      expect(box).toContain('==================================================');
      expect(box).toContain('[DEV EMAIL OTP]');
      expect(box).toContain('Purpose: Email Verification');
      expect(box).toContain('Email: test@example.com');
      expect(box).toContain('OTP: 483921');
      expect(box).toContain('Expires At: 2026-11-20 09:35:00');
    });

    it('should default purpose to Email Verification if not specified', () => {
      const expiresAt = new Date('2026-11-20T09:35:00');
      const box = formatDevOtpBox({
        email: 'test@example.com',
        otp: '123456',
        expiresAt,
      });

      expect(box).toContain('Purpose: Email Verification');
    });
  });

  describe('logDevEmailOtp', () => {
    const defaultParams = {
      purpose: 'Email Verification',
      email: 'dev@marvelsbasket.com',
      otp: '654321',
      expiresAt: new Date('2026-11-20T10:00:00'),
      nodeEnv: 'development',
      devLogEnabled: true,
    };

    it('should output OTP to console in development when devLogEnabled is true', () => {
      const logged = logDevEmailOtp(defaultParams);

      expect(logged).toBe(true);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('[DEV EMAIL OTP]');
      expect(output).toContain('Email: dev@marvelsbasket.com');
      expect(output).toContain('OTP: 654321');
    });

    it('CRITICAL SECURITY: should NEVER log OTP in production, even if devLogEnabled is true', () => {
      const logged = logDevEmailOtp({
        ...defaultParams,
        nodeEnv: 'production',
        devLogEnabled: true,
      });

      expect(logged).toBe(false);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should NOT log OTP in test environment', () => {
      const logged = logDevEmailOtp({
        ...defaultParams,
        nodeEnv: 'test',
        devLogEnabled: true,
      });

      expect(logged).toBe(false);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should NOT log OTP in development if devLogEnabled is false', () => {
      const logged = logDevEmailOtp({
        ...defaultParams,
        nodeEnv: 'development',
        devLogEnabled: false,
      });

      expect(logged).toBe(false);
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
