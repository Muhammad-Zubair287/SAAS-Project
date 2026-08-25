'use client';

import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';
import { CONTROL_BASE, controlBorder } from './input';
import { useFieldContext } from './field';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 3, ...props }, ref) {
    const field = useFieldContext();
    const isInvalid = invalid ?? field?.invalid ?? false;

    const describedBy =
      [field?.descriptionId, field?.errorId].filter(Boolean).join(' ') ||
      undefined;

    return (
      <textarea
        ref={ref}
        rows={rows}
        id={props.id ?? field?.id}
        required={props.required ?? field?.required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          CONTROL_BASE,
          controlBorder(isInvalid),
          // Height comes from `rows`; py replaces the fixed h-11 of one-line controls.
          'min-h-[5.5rem] resize-y py-2',
          className,
        )}
        {...props}
      />
    );
  },
);
