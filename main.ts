/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "$std/dotenv/load.ts";
import { Hono } from "hono";
import { html } from "hono/html";
import QRCode from "npm:qrcode";
import { optimize } from "npm:svgo";

type Lang = "en" | "ja";

const uiMessages: Record<Lang, {
  title: string;
  description: string;
  trademark: string;
  labels: {
    data: string;
    dataPlaceholder: string;
    size: string;
    sizePlaceholder: string;
    format: string;
    copy: string;
    download: string;
    reload: string;
  };
  feedback: {
    copied: string;
    copyFailed: string;
    loading: string;
    qrError: string;
  };
}> = {
  en: {
    title: "QR Code Placeholder Maker",
    description:
      "Specify the parameters to generate a QR code URL that can be used as a placeholder by setting it to the src attribute of an img tag.",
    trademark: "QR Code is a registered trademark of DENSO WAVE Inc.",
    labels: {
      data: "Data",
      dataPlaceholder: "Enter your data",
      size: "Size (px)",
      sizePlaceholder: "e.g., 300",
      format: "File format",
      copy: "Copy",
      download: "Download",
      reload: "Reload",
    },
    feedback: {
      copied: "Copied!",
      copyFailed: "Copy failed",
      loading: "Loading...",
      qrError: "Failed to generate QR code due to server error.",
    },
  },
  ja: {
    title: "QRコード プレースホルダー メーカー",
    description:
      "パラメータを指定して生成したQRコードのURLをimgタグのsrc属性に指定してプレースホルダーとして利用できます。",
    trademark: "QRコードは（株）デンソーウェーブの登録商標です",
    labels: {
      data: "データ",
      dataPlaceholder: "データを入力してください",
      size: "サイズ(px)",
      sizePlaceholder: "例: 300",
      format: "ファイル形式",
      copy: "コピー",
      download: "ダウンロード",
      reload: "再読み込み",
    },
    feedback: {
      copied: "コピーしました!",
      copyFailed: "コピーに失敗しました",
      loading: "読み込み中...",
      qrError: "サーバーエラーによりQRコードの生成に失敗しました。",
    },
  },
};

const app = new Hono();

const serveStaticFile = async (path: string, contentType: string) => {
  try {
    const file = await Deno.readFile(path);
    return new Response(file, { headers: { "Content-Type": contentType } });
  } catch (_err) {
    return new Response("Not Found", { status: 404 });
  }
};

const clampWidth = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 300;
  return parsed >= 10000 ? 9999 : parsed;
};

const buildQrUrl = (
  baseUrl: string,
  data: string,
  size: number,
  format: string,
) =>
  `${baseUrl}/api/qr?data=${encodeURIComponent(data)}&size=${
    encodeURIComponent(String(size))
  }&format=${encodeURIComponent(format)}`;

const renderPreview = (
  lang: Lang,
  qrUrl: string,
  format: string,
) => {
  const t = uiMessages[lang];
  return html`
    <section id="qr-preview" data-qr-url="${qrUrl}" style="text-align: center;">
      <figure
        class="container"
        style="position: relative; max-width: 300px; margin: 0 auto;"
      >
        <img
          id="qr-img"
          src="${qrUrl}"
          alt="QR Code"
          style="width: 100%; height: auto; display: block;"
          loading="lazy"
          onload="handleQRLoaded()"
          onerror="handleQRError()"
        />
        <div
          id="loading-indicator"
          aria-busy="true"
          style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; background: var(--pico-background-color);"
        >
          <span>${t.feedback.loading}</span>
        </div>
      </figure>
      <p id="qr-error" style="color: var(--pico-del-color); display: none;"></p>
    </section>

    <section aria-label="QR code actions">
      <label>
        URL
        <fieldset role="group">
          <input
            id="qr-url-input"
            type="text"
            readonly
            value="${qrUrl}"
            onclick="this.select()"
          />
          <button
            type="button"
            @click="copyUrl()"
            aria-label="${t.labels.copy}"
            class="secondary"
          >
            <img
              src="/icons/document-duplicate.svg"
              alt=""
              aria-hidden="true"
              style="width: 1.25rem; height: 1.25rem;"
            />
          </button>
          <a
            role="button"
            id="download-link"
            href="${qrUrl}"
            download="qrcode.${format}"
            aria-label="${t.labels.download}"
            class="contrast"
          >
            <img
              src="/icons/arrow-down-tray.svg"
              alt=""
              aria-hidden="true"
              style="width: 1.25rem; height: 1.25rem;"
            />
          </a>
        </fieldset>
      </label>
      <p x-text="copyStatus" style="min-height: 1.5em; font-size: 0.875rem;"></p>
    </section>
  `;
};

const renderPage = (
  lang: Lang,
  baseUrl: string,
  urlPrefixPath: string,
  data: string,
  size: number,
  format: string,
) => {
  const t = uiMessages[lang];
  const qrUrl = buildQrUrl(baseUrl, data, size, format);
  return html`
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${t.title}</title>
        <link rel="icon" href="/logo.svg" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
        <script src="https://unpkg.com/htmx.org@2.0.4"></script>
        <script
          src="https://cdn.jsdelivr.net/npm/@ryangjchandler/alpine-clipboard@2.3.0/dist/alpine-clipboard.min.js"
          defer
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
          defer
        ></script>
        <script>
        function qrApp() {
        	return {
        		copyStatus: '',
        		async copyUrl() {
        			const preview = document.getElementById("qr-preview");
        			const url = preview?.getAttribute("data-qr-url") || "";
        			if (!url) return;
        			try {
        				await this.$clipboard(url);
        				this.copyStatus = '${t.feedback.copied}';
        				setTimeout(() => this.copyStatus = '', 2000);
        			} catch (e) {
        				this.copyStatus = '${t.feedback.copyFailed}';
        				alert('${t.feedback.copyFailed}');
        			}
        		}
        	}
        }
        </script>
      </head>
      <body x-data="qrApp()">
        <main class="container">
          <hgroup>
            <img
              src="/logo.svg"
              alt="QR Code Placeholder Maker"
              style="height: 6rem; margin: 0 auto; display: block;"
            />
            <h1 style="text-align: center;">${t.title}</h1>
            <p style="text-align: center;">${t.description}</p>
          </hgroup>
          <article>
            <div class="grid">
              <div>
                <form
                  id="qr-form"
                  hx-get="/fragments/qr"
                  hx-target="#preview-shell"
                  hx-swap="outerHTML"
                  hx-indicator="#loading-indicator"
                >
                  <input type="hidden" name="url_prefix" value="${urlPrefixPath}" />
                  <label>
                    ${t.labels.data}
                    <textarea
                      name="data"
                      rows="3"
                      placeholder="${t.labels.dataPlaceholder}"
                    >${data}</textarea>
                  </label>

                  <label>
                    ${t.labels.size}
                    <input
                      type="text"
                      name="size"
                      value="${size}"
                      maxLength="4"
                      placeholder="${t.labels.sizePlaceholder}"
                    />
                  </label>

                  <fieldset>
                    <legend>${t.labels.format}</legend>
                    <div class="grid">
                      <label>
                        <input
                          type="radio"
                          name="format"
                          value="png"
                          ${format === "png" ? "checked" : ""}
                        />
                        PNG
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="format"
                          value="svg"
                          ${format === "svg" ? "checked" : ""}
                        />
                        SVG
                      </label>
                    </div>
                  </fieldset>
                </form>
              </div>

              <div>
                <div style="text-align: right; margin-bottom: 1rem;">
                  <button
                    type="submit"
                    form="qr-form"
                    aria-label="${t.labels.reload}"
                    style="width: auto; display: inline-block;"
                  >
                    <img
                      src="/icons/arrow-path.svg"
                      alt=""
                      aria-hidden="true"
                      style="width: 1.25rem; height: 1.25rem; filter: invert(1);"
                    />
                  </button>
                </div>

                <div id="preview-shell">
                  ${renderPreview(lang, qrUrl, format)}
                </div>
              </div>
            </div>
          </article>
        </main>
        <footer style="text-align: center;">
          <small>${t.trademark}</small>
        </footer>

        <script>
        (() => {
        	const updateDownloadHref = () => {
        		const preview = document.getElementById("qr-preview");
        		const url = preview?.getAttribute("data-qr-url") || "";
        		const downloadLink = document.getElementById("download-link");
        		const input = document.getElementById("qr-url-input");
        		if (downloadLink && url) downloadLink.setAttribute("href", url);
        		if (input instanceof HTMLInputElement && url) input.value = url;
        	};

        	document.addEventListener("htmx:beforeRequest", () => {
        		const indicator = document.getElementById("loading-indicator");
        		if (indicator) indicator.style.display = "flex";
        		const error = document.getElementById("qr-error");
        		if (error) error.style.display = "none";
        	});

        	document.addEventListener("htmx:afterSwap", () => {
        		const indicator = document.getElementById("loading-indicator");
        		if (indicator) indicator.style.display = "none";
        		updateDownloadHref();
        	});

        	window.handleQRLoaded = () => {
        		const indicator = document.getElementById("loading-indicator");
        		if (indicator) indicator.style.display = "none";
        		const error = document.getElementById("qr-error");
        		if (error) error.style.display = "none";
        		updateDownloadHref();
        	};

        	window.handleQRError = () => {
        		const indicator = document.getElementById("loading-indicator");
        		if (indicator) indicator.style.display = "none";
        		const error = document.getElementById("qr-error");
        		if (error) {
        			error.textContent = "${t.feedback.qrError}";
        			error.style.display = "block";
        		}
        	};
        })();
        </script>
      </body>
    </html>
  `;
};

app.get("/", (c) => {
  const acceptLanguage = c.req.header("accept-language") || "";
  const lang: Lang = acceptLanguage.toLowerCase().startsWith("ja")
    ? "ja"
    : "en";
  const urlPrefixPath = Deno.env.get("url_prefix") || "";
  const url = new URL(c.req.url);
  const originPrefix = `${url.protocol}//${url.host}${urlPrefixPath}`;
  const data = urlPrefixPath ? `${originPrefix}/` : url.href;
  const size = 300;
  const format = "png";
  return c.html(
    renderPage(lang, originPrefix, urlPrefixPath, data, size, format),
  );
});

app.get(
  "/logo.svg",
  () => serveStaticFile("./static/logo.svg", "image/svg+xml"),
);
app.get(
  "/robots.txt",
  () => serveStaticFile("./static/robots.txt", "text/plain"),
);
app.get("/icons/:name", (c) => {
  const name = c.req.param("name");
  return serveStaticFile(`./static/icons/${name}`, "image/svg+xml");
});

app.get("/fragments/qr", (c) => {
  const query = c.req.query();
  const urlPrefixPath = query.url_prefix ?? "";
  const acceptLanguage = c.req.header("accept-language") || "";
  const lang: Lang = acceptLanguage.toLowerCase().startsWith("ja")
    ? "ja"
    : "en";
  const reqUrl = new URL(c.req.url);
  const originPrefix = `${reqUrl.protocol}//${reqUrl.host}${urlPrefixPath}`;
  const data = query.data ?? (urlPrefixPath ? `${originPrefix}/` : reqUrl.href);
  const size = clampWidth(query.size ?? "300");
  const format = query.format === "svg" ? "svg" : "png";
  const qrUrl = buildQrUrl(originPrefix, data, size, format);
  const htmlBody = `<div id="preview-shell">${
    renderPreview(lang, qrUrl, format)
  }</div>`;
  return c.html(htmlBody);
});

app.get("/api/qr", async (c) => {
  const url = new URL(c.req.url);
  const data = url.searchParams.get("data") || c.req.url;
  const sizeParam = url.searchParams.get("size") || "300";
  const format = url.searchParams.get("format") || "png";
  const width = clampWidth(sizeParam);

  try {
    if (format === "svg") {
      const svg = await QRCode.toString(data, { type: "svg", width });
      const optimizedResult = optimize(svg, { multipass: true });
      if ((optimizedResult as { error?: string }).error) {
        throw new Error(
          "SVGO optimization error: " +
            (optimizedResult as { error?: string }).error,
        );
      }
      return new Response((optimizedResult as { data: string }).data, {
        headers: { "Content-Type": "image/svg+xml" },
      });
    }

    const qrDataUrl = await QRCode.toDataURL(data, { width });
    const base64 = qrDataUrl.split(",")[1];
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    return new Response(binary, {
      headers: { "Content-Type": "image/png" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return new Response(errorMessage, { status: 500 });
  }
});

app.notFound((c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>404 - Page not found</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
      </head>
      <body>
        <main class="container" style="text-align: center;">
          <img
            src="/logo.svg"
            width="128"
            height="128"
            alt="logo"
            style="margin-bottom: 2rem;"
          />
          <h1>404 - Page not found</h1>
          <p>The page you were looking for doesn't exist.</p>
          <a href="/">Go back home</a>
        </main>
      </body>
    </html>
  `);
});

Deno.serve(app.fetch);
