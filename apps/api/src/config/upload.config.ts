import { registerAs } from '@nestjs/config';

export const uploadConfig = registerAs('upload', () => ({
  maxFileSizeBytes: parseInt(process.env['UPLOAD_MAX_FILE_SIZE'] ?? '10485760', 10),
  allowedMimeTypes: (
    process.env['UPLOAD_ALLOWED_MIME_TYPES'] ?? 'image/jpeg,image/png,application/pdf'
  ).split(','),
}));
