interface EmailService {
  sendVerification(email: string, code: string, role: 'MENTOR' | 'STUDENT'): Promise<void>;
}

class DevelopmentEmailService implements EmailService {
  async sendVerification(email: string, code: string, role: 'MENTOR' | 'STUDENT'): Promise<void> {
    const roleText = role === 'MENTOR' ? '导师' : '学生';
    console.log(`📧 [DEV MODE] Email Verification Code`);
    console.log(`  Email: ${email}`);
    console.log(`  Role: ${roleText}`);
    console.log(`  Code: ${code}`);
    console.log(`  Valid for: 15 minutes`);
  }
}

class TencentEmailService implements EmailService {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.TENCENT_EMAIL_API_KEY || '';
    this.endpoint = process.env.TENCENT_EMAIL_ENDPOINT || 'https://ses.tencentcloudapi.com';
  }

  async sendVerification(email: string, code: string, role: 'MENTOR' | 'STUDENT'): Promise<void> {
    const roleText = role === 'MENTOR' ? '导师' : '学生';
    const subject = `ScholarBridge 验证码 - ${roleText}身份注册`;
    const body = `
您的验证码是: ${code}

此验证码用于注册${roleText}账号，15分钟内有效。
如果这不是您的操作，请忽略此邮件。

ScholarBridge 团队
    `.trim();

    // TODO: Implement Tencent Cloud SES API call
    // For now, log to console
    console.log(`📧 [Tencent Email] Sending to ${email}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Code: ${code}`);
  }
}

// Factory based on environment
export const emailService: EmailService =
  process.env.NODE_ENV === 'development'
    ? new DevelopmentEmailService()
    : new TencentEmailService();

export type { EmailService };
