import { Handlers, PageProps } from "$fresh/server.ts";
import QRGenerator from "../islands/QRGenerator.tsx";

export const handler: Handlers = {
  GET(req, ctx) {
    const acceptLanguage = req.headers.get("accept-language") || "";
    const userLang = acceptLanguage.toLowerCase().startsWith("ja")
      ? "ja"
      : "en";

    // Deno.env はサーバーサイドでのみ使用できる
    const urlPrefix = Deno.env.get("url_prefix") || "";

    return ctx.render({ userLang, urlPrefix });
  },
};

export default function Home(
  props: PageProps<{ userLang: "ja" | "en"; urlPrefix: string }>,
) {
  const { userLang, urlPrefix } = props.data;

  const messages = {
    en: {
      title: "QR Code Placeholder Maker",
      description:
        "Specify the parameters to generate a QR code URL that can be used as a placeholder by setting it to the src attribute of an img tag.",
      trademark: "QR Code is a registered trademark of DENSO WAVE Inc.",
    },
    ja: {
      title: "QRコード プレースホルダー メーカー",
      description:
        "パラメータを指定して生成したQRコードのURLをimgタグのsrc属性に指定してプレースホルダーとして利用できます。",
      trademark: "QRコードは（株）デンソーウェーブの登録商標です",
    },
  };
  const currentMsg = messages[userLang];

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-lg w-full space-y-8">
        <div>
          <img
            class="mx-auto h-24 w-auto"
            src="/logo.svg"
            alt="QRコード プレースホルダー メーカー"
          />
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {currentMsg.title}
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            {currentMsg.description}
          </p>
        </div>
        {/* urlPrefix を prop として渡す */}
        <QRGenerator urlPrefix={urlPrefix} />
      </div>
      <footer class="mt-8 text-center text-xs">
        <p>{currentMsg.trademark}</p>
      </footer>
    </div>
  );
}
