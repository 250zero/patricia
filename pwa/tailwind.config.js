/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        patricia: {
          bg: {
            dark: '#0A0F1D',
            light: '#F8FAFC',
          },
          surface: {
            dark: '#111827',
            light: '#FFFFFF',
            elevatedDark: '#1F2937',
            elevatedLight: '#F3F4F6',
          },
          border: {
            dark: '#1E293B',
            light: '#E2E8F0',
          },
          primary: {
            DEFAULT: '#059669', // Emerald 600
            hover: '#047857',
            light: '#10B981',
          },
          ai: {
            spark: '#6366F1', // Indigo 500
            glow: '#06B6D4', // Cyan 500
          }
        }
      },
      boxShadow: {
        'patricia-fab': '0 8px 24px -4px rgba(5, 150, 105, 0.45)',
        'patricia-card-dark': '0 4px 16px -2px rgba(0, 0, 0, 0.40)',
      }
    }
  },
  plugins: [],
};
