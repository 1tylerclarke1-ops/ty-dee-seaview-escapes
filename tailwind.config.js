/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        muted: 'var(--muted)',
        base: 'var(--base)',
        surface: 'var(--surface)',
        line: 'var(--line)',
        sea: { DEFAULT: 'var(--accent)', deep: 'var(--accent-deep)', foreground: '#FFFFFF' },
        signal: 'var(--signal)',
        booked: 'var(--booked)',
        offseason: 'var(--offseason)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--popover-foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        muted: { DEFAULT: 'var(--offseason)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--offseason)', foreground: 'var(--accent-foreground)' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: { '1': 'var(--accent)', '2': 'var(--ink-soft)', '3': 'var(--signal)', '4': 'var(--muted)', '5': 'var(--offseason)' },
        sidebar: {
          DEFAULT: 'var(--surface)', foreground: 'var(--ink)',
          primary: 'var(--accent)', 'primary-foreground': '#FFFFFF',
          accent: 'var(--offseason)', 'accent-foreground': 'var(--ink)',
          border: 'var(--line)', ring: 'var(--accent)'
        }
      },
      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)']
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
