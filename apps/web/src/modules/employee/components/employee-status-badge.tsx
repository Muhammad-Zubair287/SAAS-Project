import type { EmployeeStatus } from '../types/employee.types';

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus;
}

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  ACTIVE:     'bg-semantic-success/10 text-semantic-success',
  PROBATION:  'bg-semantic-warning/10 text-semantic-warning',
  ON_LEAVE:   'bg-semantic-info/10 text-semantic-info',
  INACTIVE:   'bg-text-secondary/10 text-text-secondary',
  TERMINATED: 'bg-semantic-danger/10 text-semantic-danger',
};

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE:     'Active',
  PROBATION:  'Probation',
  ON_LEAVE:   'On Leave',
  INACTIVE:   'Inactive',
  TERMINATED: 'Terminated',
};

export function EmployeeStatusBadge({ status }: EmployeeStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-semibold ${STATUS_STYLES[status] ?? 'bg-text-secondary/10 text-text-secondary'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
