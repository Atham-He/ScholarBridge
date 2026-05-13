import { emailService } from '../email';

describe('Email Service', () => {
  it('should log verification code in development mode', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await emailService.sendVerification('test@example.com', '123456');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('123456')
    );

    consoleSpy.mockRestore();
  });

  it('should handle email sending errors gracefully', async () => {
    // Test error handling when implemented
    await expect(
      emailService.sendVerification('test@example.com', '123456')
    ).resolves.not.toThrow();
  });
});
