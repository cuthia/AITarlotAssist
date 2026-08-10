/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'mystic': {
          '50': '#f5f0ff',
          '100': '#ebe0ff',
          '200': '#d4b8ff',
          '300': '#b37fff',
          '400': '#9240ff',
          '500': '#7c21ff',
          '600': '#6b1ae6',
          '700': '#5814b3',
          '800': '#450f80',
          '900': '#1a0a2e',
          '950': '#0f051a',
        },
        'cosmic': {
          '50': '#f0f4ff',
          '100': '#e0e8ff',
          '200': '#c7d4fe',
          '300': '#a3b8fd',
          '400': '#7b94fa',
          '500': '#5c6ff7',
          '600': '#434ee5',
          '700': '#373cc2',
          '800': '#16213e',
          '900': '#0d1526',
          '950': '#060b13',
        },
        'gold': {
          '50': '#fffcf5',
          '100': '#fff5e0',
          '200': '#ffe6b3',
          '300': '#ffd480',
          '400': '#ffbc4d',
          '500': '#d4af37',
          '600': '#b8962e',
          '700': '#9a7b25',
          '800': '#7c611c',
          '900': '#5e4713',
          '950': '#2f2309',
        },
        'silver': {
          '50': '#fafafa',
          '100': '#f5f5f5',
          '200': '#e5e5e5',
          '300': '#d4d4d4',
          '400': '#c0c0c0',
          '500': '#a3a3a3',
          '600': '#737373',
          '700': '#525252',
          '800': '#404040',
          '900': '#262626',
          '950': '#171717',
        },
      },
      fontFamily: {
        'serif': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'card-flip': 'card-flip 0.6s ease-in-out',
        'fly-in': 'fly-in 0.5s ease-out',
        'typing': 'typing 0.8s steps(20) forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        'fly-in': {
          '0%': { transform: 'translateY(-100px) opacity(0)' },
          '100%': { transform: 'translateY(0) opacity(1)' },
        },
        'typing': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      boxShadow: {
        'glow': '0 0 30px rgba(212, 175, 55, 0.3)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 30px rgba(212, 175, 55, 0.2)',
      },
    },
  },
  plugins: [],
};
