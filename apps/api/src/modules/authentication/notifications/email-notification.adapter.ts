import { Injectable } from '@nestjs/common';
import type {
  InvitationNotification,
  NotificationGateway,
  PasswordResetNotification,
} from '../interfaces/notification-gateway.interface';

// Stub adapter — SMTP/provider integration implemented in M13 (Notifications module).
// Business services depend only on NotificationGateway; swap this class in M13 without changing callers.
@Injectable()
export class EmailNotificationAdapter implements NotificationGateway {
  async sendInvitation(_notification: InvitationNotification): Promise<void> {
    // TODO (M13): send invitation email via configured SMTP/provider.
  }

  async sendPasswordReset(_notification: PasswordResetNotification): Promise<void> {
    // TODO (M13): send password-reset email via configured SMTP/provider.
  }
}
