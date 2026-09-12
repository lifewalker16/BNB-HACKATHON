import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary':    '#0a0b10',
        'bg-secondary':  '#12131c',
        'accent-indigo': '#6366f1',
        'accent-cyan':   '#06b6d4',
        'accent-green':  '#10b981',
        'accent-amber':  '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        lg: '16px',
        md: '10px',
        sm: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
