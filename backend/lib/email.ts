import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface EmailService {
  sendVerification(email: string, code: string): Promise<void>;
}

// ==============================================
// 开发环境：
// ==============================================
class DevelopmentEmailService implements EmailService {
  private transporter: Transporter;

  constructor() {
    // 这里用 QQ 邮箱发信
    this.transporter = nodemailer.createTransport({
      service: "qq",
      auth: {
        user: "2212360065@qq.com",
        pass: "olelyynkjqcueaff", // 不是密码！是授权码！
      },
    });
  }

  async sendVerification(email: string, code: string): Promise<void> {
    const mailOptions = {
      from: `"ScholarBridge Verification" <2212360065@qq.com>`,
      to: email,
      subject: "Your ScholarBridge Verification Code",
      text: `
Your verification code is: ${code}

This code is valid for 15 minutes and can be used to complete your registration.
If you did not request this code, you can safely ignore this email.

The ScholarBridge Team
      `,
    };

    // 真实发送！
    await this.transporter.sendMail(mailOptions);

    console.log(`Verification email sent to ${email}. Code: ${code}`);
  }
}

// ==============================================
// 生产环境：腾讯云 SES
// ==============================================
class TencentEmailService implements EmailService {
  async sendVerification(
    email: string,
    code: string
  ): Promise<void> {
    // Todo:自己实现腾讯云 SES
    console.log(`Tencent Cloud email delivery: ${email}. Code: ${code}`);
  }
}


export const emailService: EmailService =
  process.env.NODE_ENV === "development"
    ? new DevelopmentEmailService()
    : new TencentEmailService();

export type { EmailService };
