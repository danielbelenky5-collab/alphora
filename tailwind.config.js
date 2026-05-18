/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          500: '#3b6ff5',
          600: '#2858e0',
          700: '#1e45c4',
          900: '#0f2060',
        },
        // Theme-aware surface colors via CSS vars
        surface: {
          DEFAULT: 'var(--surface-bg)',
          card:    'var(--surface-card)',
          border:  'var(--surface-border)',
          hover:   'var(--surface-hover)',
        },
        // Theme-aware text
        tx: {
          primary:  'var(--tx-primary)',
          secondary:'var(--tx-secondary)',
          muted:    'var(--tx-muted)',
        },
      },
    },
  },
  plugins: [],
}
