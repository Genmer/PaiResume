/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#bfd7ff',
          300: '#8fb8ff',
          400: '#5a91ff',
          500: '#3369e8',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
      },
      // 统一设计令牌：卡片软投影 / hover 品牌色投影 / 弹层投影 / 品牌渐变
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 14px 34px -18px rgba(15,23,42,.14)',
        'card-hover': '0 2px 4px rgba(15,23,42,.05), 0 22px 44px -18px rgba(29,78,216,.22)',
        pop: '0 24px 56px -20px rgba(15,23,42,.28)',
        brand: '0 10px 22px -10px rgba(29,78,216,.55)',
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #3369e8 0%, #1d4ed8 55%, #4338ca 100%)',
      },
    },
  },
  plugins: [],
}
