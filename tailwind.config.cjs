/** @type {import('tailwindcss').Config} */
plugins: [require("@tailwindcss/typography")],


module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef7ff',
          100: '#d8ecff',
          200: '#b6dbff',
          300: '#86c3ff',
          400: '#4ca3ff',
          500: '#1e8bff',
          600: '#1473db',
          700: '#155bb0',
          800: '#164f8f',
          900: '#143f70',
        },
      },
      typography: (theme) => ({
  DEFAULT: {
    css: {
      "--tw-prose-links": theme("colors.brand.600"),
      "--tw-prose-headings": theme("colors.brand.800"),
      "--tw-prose-bold": theme("colors.brand.700"),
      a: {
        textDecoration: "underline",
        textUnderlineOffset: "2px",
        "&:hover": { color: theme("colors.brand.700") },
      },
    },
  },
}),

    },
  },
    plugins: [require("@tailwindcss/typography")],
};

