export interface InvitationEmailParams {
  productName: string;
  to: string;
  acceptUrl: string;
  tenantName?: string;
  inviterName?: string;
  expiresAt: Date;
}

export interface PasswordResetEmailParams {
  productName: string;
  to: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatExpiry(date: Date): string {
  return date.toUTCString();
}

function layout(productName: string, title: string, bodyHtml: string, footerNote: string): string {
  const brand = escapeHtml(productName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a2332;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d9e0e6;">
          <tr>
            <td style="padding:24px 28px 8px;border-bottom:3px solid #0f6e6e;">
              <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#0f6e6e;font-weight:700;">${brand}</p>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;font-weight:650;color:#1a2332;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;font-size:15px;line-height:1.55;color:#334155;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e8eef2;font-size:12px;line-height:1.5;color:#64748b;">
              ${escapeHtml(footerNote)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<p style="margin:28px 0 16px;">
  <a href="${escapeHtml(url)}" style="display:inline-block;background:#0f6e6e;color:#ffffff;text-decoration:none;padding:12px 22px;font-size:15px;font-weight:600;border-radius:4px;">
    ${escapeHtml(label)}
  </a>
</p>
<p style="margin:0;font-size:13px;color:#64748b;word-break:break-all;">
  If the button does not work, copy and paste this link into your browser:<br />
  <a href="${escapeHtml(url)}" style="color:#0f6e6e;">${escapeHtml(url)}</a>
</p>`;
}

export function renderInvitationEmail(params: InvitationEmailParams): RenderedEmail {
  const expiry = formatExpiry(params.expiresAt);
  const orgLine = params.tenantName
    ? `You have been invited to join <strong>${escapeHtml(params.tenantName)}</strong> on ${escapeHtml(params.productName)}.`
    : `You have been invited to join ${escapeHtml(params.productName)}.`;
  const inviterLine = params.inviterName
    ? `<p style="margin:0 0 16px;">Invitation from: <strong>${escapeHtml(params.inviterName)}</strong></p>`
    : '';

  const subject = params.tenantName
    ? `You're invited to ${params.tenantName} on ${params.productName}`
    : `You're invited to ${params.productName}`;

  const html = layout(
    params.productName,
    'Accept your invitation',
    `
      <p style="margin:0 0 16px;">Hello,</p>
      <p style="margin:0 0 16px;">${orgLine}</p>
      ${inviterLine}
      <p style="margin:0 0 16px;">Invited email: <strong>${escapeHtml(params.to)}</strong></p>
      <p style="margin:0 0 16px;">This invitation expires on <strong>${escapeHtml(expiry)}</strong>.</p>
      ${ctaButton(params.acceptUrl, 'Accept invitation')}
      <p style="margin:24px 0 0;">If you were not expecting this invitation, you can ignore this email.</p>
    `,
    `This message was sent by ${params.productName}. Do not share this link — it is single-use and personal to you.`,
  );

  const text = [
    params.productName,
    '',
    'Accept your invitation',
    '',
    params.tenantName
      ? `You have been invited to join ${params.tenantName} on ${params.productName}.`
      : `You have been invited to join ${params.productName}.`,
    params.inviterName ? `Invitation from: ${params.inviterName}` : null,
    `Invited email: ${params.to}`,
    `Expires: ${expiry}`,
    '',
    `Accept invitation: ${params.acceptUrl}`,
    '',
    'If you were not expecting this invitation, you can ignore this email.',
    `This link is single-use and personal to you.`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return { subject, html, text };
}

export function renderPasswordResetEmail(params: PasswordResetEmailParams): RenderedEmail {
  const expiry = formatExpiry(params.expiresAt);
  const subject = `Reset your ${params.productName} password`;

  const html = layout(
    params.productName,
    'Reset your password',
    `
      <p style="margin:0 0 16px;">Hello,</p>
      <p style="margin:0 0 16px;">We received a request to reset the password for <strong>${escapeHtml(params.to)}</strong>.</p>
      <p style="margin:0 0 16px;">This link expires on <strong>${escapeHtml(expiry)}</strong> and can be used only once.</p>
      ${ctaButton(params.resetUrl, 'Reset password')}
      <p style="margin:24px 0 0;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    `,
    `This message was sent by ${params.productName}. Never share this link. ${params.productName} will never ask for your password by email.`,
  );

  const text = [
    params.productName,
    '',
    'Reset your password',
    '',
    `We received a request to reset the password for ${params.to}.`,
    `Expires: ${expiry}`,
    '',
    `Reset password: ${params.resetUrl}`,
    '',
    'If you did not request a password reset, you can safely ignore this email.',
    `${params.productName} will never ask for your password by email.`,
  ].join('\n');

  return { subject, html, text };
}
