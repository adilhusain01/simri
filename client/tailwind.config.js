/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette using CSS variables
        'royal-purple': 'var(--royal-purple)',
        'lavender-mist': 'var(--lavender-mist)',
        'champagne-gold': 'var(--champagne-gold)',
        'blush-pink': 'var(--blush-pink)',
        'ivory-white': 'var(--ivory-white)',
        'charcoal': 'var(--charcoal)',
        
        // Semantic colors
        primary: {
          DEFAULT: 'var(--primary)',
          50: '#F3E8FF',
          100: '#E9D5FF',
          200: '#D6BBFB',
          300: '#C084FC',
          400: '#A855F7',
          500: 'var(--primary)',
          600: '#9333EA',
          700: '#7C3AED',
          800: '#6B46C1',
          900: '#581C87',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: 'var(--secondary)',
          400: '#C4B5FD',
          500: '#A78BFA',
          600: '#8B5CF6',
          700: '#7C3AED',
          800: '#6B46C1',
          900: '#581C87',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: 'var(--accent)',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        }
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
        'elegant': '0 4px 6px -1px rgba(106, 13, 173, 0.1), 0 2px 4px -1px rgba(106, 13, 173, 0.06)',
        'elegant-lg': '0 20px 25px -5px rgba(106, 13, 173, 0.1), 0 10px 10px -5px rgba(106, 13, 173, 0.04)',
      }
    },
  },
  plugins: [],
}