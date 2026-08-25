import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type {
  InvitationNotification,
  NotificationGateway,
  PasswordResetNotification,
} from '../interfaces/notification-gateway.interface';
import { renderInvitationEmail, renderPasswordResetEmail } from './email.templates';
import { SmtpEmailClient } from './smtp-email.client';

/**
 * SMTP-backed NotificationGateway for M02 auth emails (invitation + password reset).
 * Reliable async/retry delivery remains M13 debt — failures are logged, not retried.
 *
 * Optional EMAIL_CAPTURE_DIR writes full rendered messages for local smoke testing
 * (includes one-time URL tokens; never enable in shared/prod environments).
 */
@Injectable()
export class EmailNotificationAdapter implements NotificationGateway {
  private readonly logger = new Logger(EmailNotificationAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mailer: SmtpEmailClient,
  ) {}

  async sendInvitation(notification: InvitationNotification): Promise<void> {
    const webAppUrl = this.config.getOrThrow<string>('email.webAppUrl');
    const acceptUrl = `${webAppUrl}/invitations/accept?token=${encodeURIComponent(notification.invitationToken)}`;
    const productName = this.config.get<string>('app.name') ?? 'Workforce Cloud OS';

    const rendered = renderInvitationEmail({
      productName,
      to: notification.to,
      acceptUrl,
      tenantName: notification.tenantName,
      inviterName: notification.inviterName,
      expiresAt: notification.expiresAt,
    });

    await this.dispatch({
      kind: 'invitation',
      to: notification.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  async sendPasswordReset(notification: PasswordResetNotification): Promise<void> {
    const webAppUrl = this.config.getOrThrow<string>('email.webAppUrl');
    const resetUrl = `${webAppUrl}/password-reset/confirm?token=${encodeURIComponent(notification.resetToken)}`;
    const productName = this.config.get<string>('app.name') ?? 'Workforce Cloud OS';

    const rendered = renderPasswordResetEmail({
      productName,
      to: notification.to,
      resetUrl,
      expiresAt: notification.expiresAt,
    });

    await this.dispatch({
      kind: 'password_reset',
      to: notification.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  private async dispatch(input: {
    kind: 'invitation' | 'password_reset';
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const enabled = this.config.get<boolean>('email.enabled') === true;
    const captureDir = this.config.get<string>('email.captureDir')?.trim();

    if (captureDir) {
      await this.captureLocally(captureDir, input);
    }

    if (!enabled) {
      this.logger.warn(
        `Email delivery disabled (EMAIL_ENABLED=false); ${input.kind} email not sent to ${input.to}`,
      );
      return;
    }

    try {
      await this.mailer.send({
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      this.logger.log(`Email sent kind=${input.kind} to=${input.to} subject="${input.subject}"`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      // Do not include tokens, passwords, or SMTP credentials.
      this.logger.error(
        `Email delivery failed kind=${input.kind} to=${input.to} error=${message}`,
      );
      throw error;
    }
  }

  private async captureLocally(
    captureDir: string,
    input: {
      kind: 'invitation' | 'password_reset';
      to: string;
      subject: string;
      html: string;
      text: string;
    },
  ): Promise<void> {
    try {
      await mkdir(captureDir, { recursive: true });
      const safeTo = input.to.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}-${input.kind}-${safeTo}.json`;
      const path = join(captureDir, filename);
      await writeFile(
        path,
        JSON.stringify(
          {
            kind: input.kind,
            to: input.to,
            subject: input.subject,
            html: input.html,
            text: input.text,
            capturedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        { encoding: 'utf8' },
      );
      this.logger.debug(`Email captured locally kind=${input.kind} to=${input.to}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      this.logger.warn(`Email local capture failed kind=${input.kind} error=${message}`);
    }
  }
}
