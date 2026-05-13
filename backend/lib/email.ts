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
      from: `"ScholarBridge 验证" <2212360065@qq.com>`,
      to: email,
      subject: "ScholarBridge 注册验证码",
      text: `
您的验证码是：${code}

此验证码15分钟内有效，用于账号注册。
如果不是你本人操作，请忽略。

ScholarBridge 团队
      `,
    };

    // 真实发送！
    await this.transporter.sendMail(mailOptions);

    console.log(`邮件已发送至 ${email}，验证码：${code}`);
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
    console.log(`腾讯云邮件发送：${email}，验证码：${code}`);
  }
}


export const emailService: EmailService =
  process.env.NODE_ENV === "development"
    ? new DevelopmentEmailService()
    : new TencentEmailService();

export type { EmailService };
