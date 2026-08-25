import { registerAs } from '@nestjs/config';

// M02: Shared SMTP email delivery for invitation + password-reset flows.
// Full notification platform (M13) may swap the adapter; config stays centralised.
export const emailConfig = registerAs('email', () => {
  const enabled = (process.env['EMAIL_ENABLED'] ?? 'false') === 'true';
  const port = parseInt(process.env['SMTP_PORT'] ?? '587', 10);
  const secureEnv = process.env['SMTP_SECURE'];
  const secure =
    secureEnv !== undefined
      ? secureEnv === 'true'
      : port === 465;

  return {
    enabled,
    provider: process.env['EMAIL_PROVIDER'] ?? 'smtp',
    smtp: {
      host: process.env['SMTP_HOST'] ?? '',
      port,
      secure,
      user: process.env['SMTP_USER'] ?? '',
      password: process.env['SMTP_PASSWORD'] ?? '',
    },
    from: {
      name: process.env['EMAIL_FROM_NAME'] ?? 'Workforce Cloud OS',
      address: process.env['EMAIL_FROM_ADDRESS'] ?? '',
    },
    webAppUrl: (process.env['WEB_APP_URL'] ?? 'http://localhost:3000').replace(/\/$/, ''),
    // Optional local capture directory for development smoke tests (not for production).
    captureDir: process.env['EMAIL_CAPTURE_DIR'] ?? '',
  };
});
