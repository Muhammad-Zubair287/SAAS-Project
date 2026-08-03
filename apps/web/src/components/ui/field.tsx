'use client';

import { createContext, useContext, useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

interface FieldContextValue {
  id: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Consumed by Input/Select/Textarea to pick up the generated id and ARIA
 * wiring. Returns null when a control is used outside a Field, so the
 * primitives stay usable standalone.
 */
export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  required?: boolean;
  description?: ReactNode;
  /** Presence marks the field invalid and renders the message. */
  error?: string;
  /** Override the generated id, e.g. to match an external label. */
  id?: string;
  className?: string;
}

/**
 * Owns label association and ARIA for a single form control.
 *
 * The app previously repeated a label + input pair ~65 times with no `htmlFor`,
 * no `aria-invalid` and no `aria-describedby`, so screen readers announced the
 * inputs unlabelled. Wrapping in Field fixes all of that in one place:
 *
 *   <Field label={t('...')} required error={errors.name?.message}>
 *     <Input {...register('name')} />
 *   </Field>
 */
export function Field({
  label,
  children,
  required = false,
  description,
  error,
  id,
  className,
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <FieldContext.Provider
      value={{
        id: fieldId,
        descriptionId,
        errorId,
        invalid: Boolean(error),
        required,
      }}
    >
      <div className={cn('w-full', className)}>
        <label
          htmlFor={fieldId}
          className="mb-1 block text-label-md font-medium text-text-primary"
        >
          {label}
          {required && (
            <>
              {/* Visual marker is decorative; `required` on the control is what
                  assistive tech actually announces. */}
              <span aria-hidden="true" className="ml-0.5 text-semantic-danger">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>

        {children}

        {description && !error && (
          <p id={descriptionId} className="mt-1 text-body-sm text-text-secondary">
            {description}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            // Announced when validation fails after the field is already rendered.
            role="alert"
            className="mt-1 text-body-sm text-semantic-danger"
          >
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
