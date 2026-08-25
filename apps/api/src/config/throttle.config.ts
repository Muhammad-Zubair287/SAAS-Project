import { registerAs } from '@nestjs/config';

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60000', 10),
  limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
  interactiveRead: {
    ttl: parseInt(process.env['THROTTLE_INTERACTIVE_READ_TTL'] ?? '300000', 10),
    limit: parseInt(process.env['THROTTLE_INTERACTIVE_READ_LIMIT'] ?? '600', 10),
  },
  interactiveWrite: {
    ttl: parseInt(process.env['THROTTLE_INTERACTIVE_WRITE_TTL'] ?? '300000', 10),
    limit: parseInt(process.env['THROTTLE_INTERACTIVE_WRITE_LIMIT'] ?? '120', 10),
  },
  attendanceConnector: {
    ttl: parseInt(process.env['THROTTLE_ATTENDANCE_CONNECTOR_TTL'] ?? '60000', 10),
    limit: parseInt(process.env['THROTTLE_ATTENDANCE_CONNECTOR_LIMIT'] ?? '300', 10),
  },
  deviceControl: {
    ttl: parseInt(process.env['THROTTLE_DEVICE_CONTROL_TTL'] ?? '60000', 10),
    limit: parseInt(process.env['THROTTLE_DEVICE_CONTROL_LIMIT'] ?? '120', 10),
  },
}));
