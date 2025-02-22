import { type Config } from "tailwindcss";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Helvetica Neue"',
          "Arial",
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          '"BIZ UDPGothic"',
          "Meiryo",
          "sans-serif",
        ],
      },
    },
  },
} satisfies Config;
