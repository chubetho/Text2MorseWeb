import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.vue',
    './App.vue',
  ],
  theme: {
    extend: {
      animation: {
        blink: 'pulse 50ms linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
