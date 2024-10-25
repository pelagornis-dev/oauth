const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        'heading-1': '3rem',
        'heading-2': '2rem',
        'heading-3': '1.5rem',
        'heading-4': '1.25rem',
        'heading-5': '1rem',
        'heading-6': '0.75rem' 
      },
      colors: {
        primary: {
          'page': '#fff',
          'header': 'rgba(255,255,255,0.7)',
          'project-card': '#f5f5f7',
          'search-bar': '#f5f5f7'
        },
      },
      height: {
        'header': '55px',
        'footer': '50px'
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ],
};
