import { type PageProps } from "$fresh/server.ts";
export default function App({ Component, data }: PageProps) {
  // 各ページから渡された userLang を取得。なければ "en" をデフォルトにする例
  const lang = data?.userLang || "en";
  return (
    <html lang={lang}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>QRコード プレースホルダー メーカー</title>
        <link rel="icon" href="/logo.svg" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
