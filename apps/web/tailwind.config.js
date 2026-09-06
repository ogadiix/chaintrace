/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#06090e',
          900: '#0b101b',
          800: '#111827',
          700: '#1f293d',
          600: '#374151',
        },
        risk: {
          low: '#10b981',
          medium: '#f59e0b',
          high: '#ef4444',
          critical: '#dc2626',
        },
        accent: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}
