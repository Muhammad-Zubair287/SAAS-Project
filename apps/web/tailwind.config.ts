import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            950: '#0B1F3A',
            900: '#102440',
            800: '#16365F',
            700: '#1D4A80',
            600: '#2460A5',
          },
          blue: {
            600: '#2563EB',
            500: '#3B82F6',
            400: '#60A5FA',
            100: '#DBEAFE',
          },
          teal: {
            600: '#0D9488',
            500: '#14B8A6',
            400: '#2DD4BF',
            100: '#CCFBF1',
          },
        },
        surface: {
          canvas: '#F4F7FB',
          primary: '#FFFFFF',
          secondary: '#F8FAFC',
          /** @deprecated alias of surface.primary — prefer `surface-primary` */
          card: '#FFFFFF',
          /** @deprecated alias of surface.primary — prefer `surface-primary` */
          elevated: '#FFFFFF',
        },
        border: {
          subtle: '#F1F5F9',
          default: '#E2E8F0',
          strong: '#CBD5E1',
        },
        text: {
          primary: '#0F172A',
          // NOTE: slate-500 (#64748B) fails WCAG AA here — it is used on <th> at
          // text-label-md (13px) over the #F4F7FB canvas, measuring ~4.27:1
          // against a 4.5:1 requirement. #475569 gives ~6.5:1 on canvas.
          secondary: '#475569',
          tertiary: '#64748B',
          inverse: '#FFFFFF',
          disabled: '#94A3B8',
        },
        semantic: {
          // `-bg` is the tint, `-fg` the text colour to pair with it.
          // Do NOT use the base colour as text on its own `-bg`: e.g.
          // success #16A34A on success-bg #DCFCE7 is only 2.96:1, below the
          // 4.5:1 AA floor. Every `-fg` below clears 4.5:1 on its own `-bg`.
          success: '#16A34A',
          'success-bg': '#DCFCE7',
          'success-fg': '#15803D',
          warning: '#D97706',
          'warning-bg': '#FEF3C7',
          'warning-fg': '#B45309',
          danger: '#DC2626',
          'danger-bg': '#FEE2E2',
          'danger-fg': '#B91C1C',
          info: '#0284C7',
          'info-bg': '#E0F2FE',
          'info-fg': '#0369A1',
          ai: '#7C3AED',
          'ai-bg': '#EDE9FE',
          'ai-fg': '#6D28D9',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-noto-arabic)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['2.5rem', { lineHeight: '3rem', fontWeight: '700' }],
        'display-md': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        h1: ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        h2: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        h3: ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '400' }],
        caption: ['0.6875rem', { lineHeight: '1rem', fontWeight: '400' }],
        // KPI / stat numerals (StatCard). Tabular figures are applied at the
        // call site via `tabular-nums`.
        'metric-lg': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'label-md': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '500' }],
        'label-sm': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
        'title-md': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        // Aliases of h1/h2/h3 — the codebase writes `text-heading-h*`.
        'heading-h1': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'heading-h2': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'heading-h3': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '6px',
        md: '9px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        '0': 'none',
        '1': '0 1px 2px 0 rgba(0,0,0,0.05)',
        '2': '0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06)',
        '3': '0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -2px rgba(0,0,0,0.05)',
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px 0 rgba(0,0,0,0.05)',
        'elevation-2':
          '0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06)',
        'elevation-3':
          '0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -2px rgba(0,0,0,0.05)',
      },
      screens: {
        // Tailwind breakpoints are min-width, so `sm: 390px` meant "390px and
        // wider" — it fired ON a 390px iPhone, forcing every `sm:grid-cols-2`
        // into two ~171px columns exactly where it should have stacked.
        // 640px is the first width where a two-column layout is actually
        // usable, so `sm:` now means "wider than a phone", as the call sites
        // all assume.
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
  },
  plugins: [],
};

export default config;
