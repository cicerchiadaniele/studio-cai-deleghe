module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      opacity: { 8: '0.08', 12: '0.12' },
      colors: {
        brand: { DEFAULT: 'rgb(139 21 56 / <alpha-value>)', dark: 'rgb(108 16 44 / <alpha-value>)', deep: 'rgb(86 13 35 / <alpha-value>)' },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Manrope"', '"Geist"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
