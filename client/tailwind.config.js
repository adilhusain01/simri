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
        // Royal theme colors (both CSS variables and direct values)
        'royal-gold': '#EDBC5A',
        'royal-black': '#020202',

        // Gray scale
        gray: {
          50: '#f9fafb',
          800: '#1f2937',
        },

        // Semantic colors using royal theme
        primary: {
          DEFAULT: '#020202',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#020202',
          600: '#020202',
          700: '#020202',
          800: '#020202',
          900: '#020202',
        },
        secondary: {
          DEFAULT: '#EDBC5A',
          50: '#fffbf0',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#EDBC5A',
          500: '#edbc5a',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        accent: {
          DEFAULT: '#EDBC5A',
          50: '#fffbf0',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#EDBC5A',
          500: '#edbc5a',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        // Legacy colors (for compatibility)
        'lavender-mist': 'var(--lavender-mist)',
        'champagne-gold': 'var(--champagne-gold)',
        'blush-pink': 'var(--blush-pink)',
        'ivory-white': 'var(--ivory-white)',
        'charcoal': 'var(--charcoal)',
      },
      fontFamily: {
        'heading': ['Playfair Display', 'serif'],
        'body': ['Poppins', 'sans-serif'],
        'sans': ['Poppins', 'sans-serif'],
        'serif': ['Playfair Display', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-in-left': 'slideInFromLeft 0.6s ease-out',
        'slide-in-right': 'slideInFromRight 0.6s ease-out',
        'bounce-gentle': 'bounce 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInFromLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInFromRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounce: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0,-8px,0)' },
          '70%': { transform: 'translate3d(0,-4px,0)' },
          '90%': { transform: 'translate3d(0,-2px,0)' },
        },
      },
      boxShadow: {
        'elegant': '0 4px 6px -1px rgba(31, 41, 55, 0.1), 0 2px 4px -1px rgba(31, 41, 55, 0.06)',
        'elegant-lg': '0 20px 25px -5px rgba(31, 41, 55, 0.1), 0 10px 10px -5px rgba(31, 41, 55, 0.04)',
      }
    },
  },
  plugins: [],
}