import { type Config } from "tailwindcss";

export default {
  content: [
    "./main.ts",
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
