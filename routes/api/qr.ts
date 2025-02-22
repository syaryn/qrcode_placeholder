import { Handler } from "$fresh/server.ts";
import QRCode from "npm:qrcode";
import { optimize } from "npm:svgo";
import sharp from "npm:sharp";

export const handler: Handler = async (req) => {
  const url = new URL(req.url);
  const data = url.searchParams.get("data") || req.url;
  const sizeParam = url.searchParams.get("size") || "300"; // 横幅のみ指定（例:"300"）
  const format = url.searchParams.get("format") || "png";
  let width = parseInt(sizeParam, 10);

  // sizeが4桁より大きい場合は9999に変換
  if (width >= 10000) {
    width = 9999;
  }

  try {
    if (format === "svg") {
      const svg = await QRCode.toString(data, { type: "svg", width });
      // svgoによるSVG最適化（multipass: trueは複数回の最適化を実行）
      const optimizedResult = optimize(svg, { multipass: true });
      if (optimizedResult.error) {
        throw new Error("SVGO optimization error: " + optimizedResult.error);
      }
      return new Response(optimizedResult.data, {
        headers: { "Content-Type": "image/svg+xml" },
      });
    } else {
      const qrDataUrl = await QRCode.toDataURL(data, {
        width,
      });
      const base64 = qrDataUrl.split(",")[1];
      // PNGのバイナリデータを生成
      const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      return new Response(binary, {
        headers: { "Content-Type": "image/png" },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return new Response(errorMessage, { status: 500 });
  }
};
