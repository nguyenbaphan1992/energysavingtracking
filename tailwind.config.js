/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf2f2',
          100: '#fde2e2',
          200: '#fbc9c9',
          300: '#f8a0a0',
          400: '#f26868',
          500: '#e83a3a',
          600: '#d42b2b',
          700: '#b21f1f',
          800: '#931e1e',
          900: '#7a1f1f',
        },
        secondary: {
          50:  '#eff3fb',
          100: '#dce6f5',
          200: '#b9cded',
          300: '#8aaade',
          400: '#5b86cc',
          500: '#3a66bb',
          600: '#2a4fa3',
          700: '#1b3a8c',
          800: '#192f72',
          900: '#17285e',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #d42b2b 0%, #1b3a8c 100%)',
        'gradient-brand-dark': 'linear-gradient(135deg, #b21f1f 0%, #17285e 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'marquee': 'marquee 38s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
    },
  },
  plugins: [],
}
