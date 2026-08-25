import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Infrastructure SMTP client. Domain services must not import this —
 * they depend on NotificationGateway only.
 */
@Injectable()
export class SmtpEmailClient implements OnModuleDestroy {
  private readonly logger = new Logger(SmtpEmailClient.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const transporter = this.getTransporter();
    const fromName = this.config.getOrThrow<string>('email.from.name');
    const fromAddress = this.config.getOrThrow<string>('email.from.address');

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.transporter && typeof this.transporter.close === 'function') {
      this.transporter.close();
      this.transporter = null;
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.getOrThrow<string>('email.smtp.host');
    const port = this.config.getOrThrow<number>('email.smtp.port');
    const secure = this.config.getOrThrow<boolean>('email.smtp.secure');
    const user = this.config.get<string>('email.smtp.user') ?? '';
    const password = this.config.get<string>('email.smtp.password') ?? '';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
    });

    this.logger.log(`SMTP transport initialised (host=${host}, port=${port}, secure=${secure})`);
    return this.transporter;
  }
}
