import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Custom fontSize keys from tailwind.config.ts.
 *
 * tailwind-merge only knows Tailwind's stock scale, so it classifies
 * `text-label-md` / `text-heading-h1` / `text-metric-lg` as *colours* — the same
 * group as `text-text-primary`. A plain twMerge therefore silently drops one of
 * them: twMerge('text-label-md', 'text-text-primary') === 'text-text-primary'.
 *
 * Registering them here keeps size and colour in separate groups so both survive.
 */
const FONT_SIZES = [
  'display-lg',
  'display-md',
  'h1',
  'h2',
  'h3',
  'heading-h1',
  'heading-h2',
  'heading-h3',
  'title-md',
  'body-lg',
  'body-md',
  'body-sm',
  'label-md',
  'label-sm',
  'metric-lg',
  'caption',
] as const;

/** Custom boxShadow keys — same collision as above, against `shadow-<color>`. */
const SHADOWS = [
  '0',
  '1',
  '2',
  '3',
  'elevation-0',
  'elevation-1',
  'elevation-2',
  'elevation-3',
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZES] }],
      shadow: [{ shadow: [...SHADOWS] }],
    },
  },
});

/**
 * Merge class names, with later Tailwind utilities overriding earlier ones in
 * the same group. Use for any component that accepts a `className` override.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
