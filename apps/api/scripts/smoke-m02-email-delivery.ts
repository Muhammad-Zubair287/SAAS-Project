/**
 * M02 email delivery smoke — templates + SMTP adapter (Ethereal).
 * Does not print raw tokens. Uses Ethereal preview URLs for verification.
 */
import nodemailer from 'nodemailer';
import {
  renderInvitationEmail,
  renderPasswordResetEmail,
} from '../src/modules/authentication/notifications/email.templates';

type R = { id: string; status: 'PASS' | 'FAIL'; evidence: string };
const results: R[] = [];

function note(id: string, status: 'PASS' | 'FAIL', evidence: string) {
  results.push({ id, status, evidence });
  console.log(`${status.padEnd(4)} ${id} — ${evidence}`);
}

function assert(c: unknown, m: string): asserts c {
  if (!c) throw new Error(m);
}

function redactToken(url: string): string {
  return url.replace(/token=[^&]+/i, 'token=<redacted>');
}

async function main() {
  const productName = 'Workforce Cloud OS';
  const webAppUrl = (process.env.WEB_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const inviteToken = 'a'.repeat(64);
  const resetToken = 'b'.repeat(64);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const invitation = renderInvitationEmail({
    productName,
    to: 'invitee@example.com',
    acceptUrl: `${webAppUrl}/invitations/accept?token=${inviteToken}`,
    tenantName: 'Northstar Textiles',
    expiresAt,
  });

  assert(invitation.subject.includes('Northstar'), 'invitation subject should include tenant');
  assert(invitation.html.includes('/invitations/accept?token='), 'invitation html CTA path');
  assert(invitation.text.includes('/invitations/accept?token='), 'invitation text CTA path');
  assert(!invitation.html.toLowerCase().includes('password'), 'invitation must not include password');
  note('TPL-INV', 'PASS', `subject="${invitation.subject}" url=${redactToken(`${webAppUrl}/invitations/accept?token=${inviteToken}`)}`);

  const reset = renderPasswordResetEmail({
    productName,
    to: 'user@example.com',
    resetUrl: `${webAppUrl}/password-reset/confirm?token=${resetToken}`,
    expiresAt,
  });
  assert(reset.html.includes('/password-reset/confirm?token='), 'reset html CTA path');
  assert(reset.text.includes('/password-reset/confirm?token='), 'reset text CTA path');
  note('TPL-RESET', 'PASS', `subject="${reset.subject}" url=${redactToken(`${webAppUrl}/password-reset/confirm?token=${resetToken}`)}`);

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const enabled = process.env.EMAIL_ENABLED === 'true';

  if (!enabled || !host || !user || !pass) {
    note('SMTP-SEND', 'FAIL', 'EMAIL_ENABLED/SMTP_* not configured for live SMTP smoke');
  } else {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });

    const fromName = process.env.EMAIL_FROM_NAME ?? productName;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? user;

    const infoInvite = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: 'invitee@example.com',
      subject: invitation.subject,
      html: invitation.html,
      text: invitation.text,
    });
    const previewInvite = nodemailer.getTestMessageUrl(infoInvite);
    note(
      'SMTP-INV',
      'PASS',
      `messageId=${infoInvite.messageId} preview=${previewInvite ?? 'n/a'}`,
    );

    const infoReset = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: 'user@example.com',
      subject: reset.subject,
      html: reset.html,
      text: reset.text,
    });
    const previewReset = nodemailer.getTestMessageUrl(infoReset);
    note(
      'SMTP-RESET',
      'PASS',
      `messageId=${infoReset.messageId} preview=${previewReset ?? 'n/a'}`,
    );
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
