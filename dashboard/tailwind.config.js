/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-royal-gold',
    'text-royal-gold',
    'bg-royal-black',
    'text-royal-black',
    'border-royal-gold',
    'border-royal-black'
  ],
  theme: {
    extend: {
      colors: {
        // Royal theme colors (matching client)
        'royal-gold': '#E2BA6F',
        'royal-black': '#020202',
        'ivory-white': '#FDFDF6',

        // Gray scale
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },

        // Admin status colors
        'admin-green': '#10B981',
        'admin-red': '#EF4444',
        'admin-yellow': '#F59E0B',
        'admin-blue': '#3B82F6',

        // Semantic colors using royal theme
        border: "#e5e7eb",
        input: "#e5e7eb",
        ring: "#020202",
        background: "#ffffff",
        foreground: "#020202",
        primary: {
          DEFAULT: "#020202",
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#020202",
          600: "#020202",
          700: "#020202",
          800: "#020202",
          900: "#020202",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#E2BA6F",
          50: "#fffbf0",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#E2BA6F",
          500: "#e2ba6f",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          foreground: "#020202",
        },
        accent: {
          DEFAULT: "#E2BA6F",
          foreground: "#020202",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f9fafb",
          foreground: "#6b7280",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#020202",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#020202",
        },
      },
      fontFamily: {
        'heading': ['Playfair Display', 'serif'],
        'body': ['Poppins', 'sans-serif'],
        'sans': ['Poppins', 'sans-serif'],
        'serif': ['Playfair Display', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-gentle': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'elegant': '0 4px 6px -1px rgba(31, 41, 55, 0.1), 0 2px 4px -1px rgba(31, 41, 55, 0.06)',
        'elegant-lg': '0 20px 25px -5px rgba(31, 41, 55, 0.1), 0 10px 10px -5px rgba(31, 41, 55, 0.04)',
        'admin': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'admin-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}