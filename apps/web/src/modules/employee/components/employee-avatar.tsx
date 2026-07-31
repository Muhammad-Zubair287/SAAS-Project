interface EmployeeAvatarProps {
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-body-sm',
  lg: 'h-12 w-12 text-body-md',
};

const COLORS = [
  'bg-brand-blue-600',
  'bg-brand-teal-500',
  'bg-semantic-info',
  'bg-semantic-ai',
  'bg-semantic-warning',
];

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLORS.length;
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

export function EmployeeAvatar({ displayName, size = 'md' }: EmployeeAvatarProps) {
  const initials = getInitials(displayName);
  const colorClass = COLORS[getColorIndex(displayName)] ?? 'bg-brand-blue-600';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorClass} ${SIZE_CLASSES[size]}`}
      aria-label={displayName}
    >
      {initials}
    </span>
  );
}
