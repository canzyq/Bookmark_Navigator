/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        'bn-bg': '#1a1b26',
        'bn-surface': '#24283b',
        'bn-border': '#3b4261',
        'bn-text': '#c0caf5',
        'bn-text-dim': '#565f89',
        'bn-accent': '#7aa2f7',
        'bn-accent-dim': '#3b4261',
        'bn-highlight': '#bb9af7',
      },
    },
  },
  plugins: [],
}
