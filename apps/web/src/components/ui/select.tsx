'use client';

import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';
import { CONTROL_BASE, controlBorder } from './input';
import { useFieldContext } from './field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  selectSize?: 'sm' | 'md';
  invalid?: boolean;
  /** Rendered as a leading empty-value option. */
  placeholder?: string;
  /** Convenience for simple lists; `children` remains the escape hatch. */
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, selectSize = 'md', invalid, placeholder, options, children, ...props },
  ref,
) {
  const field = useFieldContext();
  const isInvalid = invalid ?? field?.invalid ?? false;

  const describedBy =
    [field?.descriptionId, field?.errorId].filter(Boolean).join(' ') || undefined;

  return (
    <select
      ref={ref}
      id={props.id ?? field?.id}
      required={props.required ?? field?.required}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        CONTROL_BASE,
        controlBorder(isInvalid),
        selectSize === 'sm' ? 'h-9' : 'h-11',
        className,
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options?.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
      {children}
    </select>
  );
});
