export const NOTIFICATION_GATEWAY = Symbol('NOTIFICATION_GATEWAY');

export interface InvitationNotification {
  to: string;
  invitationToken: string;
  tenantName?: string;
  inviterName?: string;
  expiresAt: Date;
}

export interface PasswordResetNotification {
  to: string;
  resetToken: string;
  expiresAt: Date;
}

// Business layer depends only on this interface; SMTP adapter wired for M02 auth emails.
// Broader notification platform (queues, multi-channel) remains M13.
export interface NotificationGateway {
  sendInvitation(notification: InvitationNotification): Promise<void>;
  sendPasswordReset(notification: PasswordResetNotification): Promise<void>;
}
