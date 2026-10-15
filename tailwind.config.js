/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        aubergine: '#30213D',
        coral: '#FF6B5E',
        'coral-ink': '#B23A32',
        ivory: '#FAF7F2',
        lavender: '#EAE3F5',
        butter: '#F5D77E',
        slate: '#716C78',
        mist: '#E7E0E8',
        teal: '#247B73',
        gray: {
          50: '#FAF7F2',
          100: '#F2EDF4',
          200: '#E7E0E8',
          300: '#D3CBD7',
          400: '#A39AA8',
          500: '#716C78',
          600: '#625A68',
          700: '#51465A',
          800: '#40334B',
          900: '#30213D',
        },
      },
      fontFamily: {
        heading: ['Manrope', 'Inter', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
