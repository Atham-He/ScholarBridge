import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface EmailService {
  sendVerification(email: string, code: string): Promise<void>;
}

// ==============================================
// Development transport:
// ==============================================
class DevelopmentEmailService implements EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "qq",
      auth: {
        user: "2212360065@qq.com",
        pass: "olelyynkjqcueaff",
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

    await this.transporter.sendMail(mailOptions);

    console.log(`Verification email sent to ${email}. Code: ${code}`);
  }
}

// ==============================================
// Production transport: Tencent Cloud SES.
// ==============================================
class TencentEmailService implements EmailService {
  async sendVerification(
    email: string,
    code: string
  ): Promise<void> {
    // TODO: Implement Tencent Cloud SES delivery.
    console.log(`Tencent Cloud email delivery: ${email}. Code: ${code}`);
  }
}


export const emailService: EmailService =
  process.env.NODE_ENV === "development"
    ? new DevelopmentEmailService()
    : new TencentEmailService();

export type { EmailService };
