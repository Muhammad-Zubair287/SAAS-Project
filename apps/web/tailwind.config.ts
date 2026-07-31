import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
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
          card: '#FFFFFF',
          elevated: '#FFFFFF',
        },
        semantic: {
          success: '#16A34A',
          'success-bg': '#DCFCE7',
          warning: '#D97706',
          'warning-bg': '#FEF3C7',
          danger: '#DC2626',
          'danger-bg': '#FEE2E2',
          info: '#0284C7',
          'info-bg': '#E0F2FE',
          ai: '#7C3AED',
          'ai-bg': '#EDE9FE',
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
      },
      screens: {
        sm: '390px',
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
