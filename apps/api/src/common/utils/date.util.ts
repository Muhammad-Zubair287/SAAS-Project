export function toUtcDate(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

export function toIsoString(date: Date): string {
  return date.toISOString();
}

export function nowUtc(): Date {
  return new Date();
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1_000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return addSeconds(date, minutes * 60);
}

export function addDays(date: Date, days: number): Date {
  return addSeconds(date, days * 86_400);
}
