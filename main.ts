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

const buildQrUrl = (baseUrl: string, data: string, size: number, format: string) =>
	`${baseUrl}/api/qr?data=${encodeURIComponent(data)}&size=${encodeURIComponent(String(size))}&format=${encodeURIComponent(format)}`;

const renderPreview = (
	lang: Lang,
	qrUrl: string,
	format: string,
) => {
	const t = uiMessages[lang];
	return html`<section id="qr-preview" class="mt-8 flex flex-col items-center" data-qr-url="${qrUrl}">
		<div class="relative w-64 h-64 border border-gray-200 rounded-md bg-white p-2 overflow-hidden flex items-center justify-center">
			<img
				id="qr-img"
				src="${qrUrl}"
				alt="QR Code"
				class="w-full h-full object-contain block"
				loading="lazy"
				onload="handleQRLoaded()"
				onerror="handleQRError()"
			/>
			<div
				id="loading-indicator"
				class="absolute inset-0 hidden items-center justify-center bg-white"
			>
				<span>${t.feedback.loading}</span>
			</div>
		</div>
		<p id="qr-error" class="mt-2 text-sm text-red-600 hidden"></p>
	</section>

	<section class="mt-6 space-y-4" aria-label="QR code actions">
		<label class="block text-sm font-bold text-gray-700">URL</label>
		<div class="mt-1 flex rounded-md shadow-sm">
			<input
				id="qr-url-input"
				type="text"
				readonly
				value="${qrUrl}"
				class="px-3 py-2 block w-full rounded-none rounded-l-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
				onclick="this.select()"
			/>
			<button
				type="button"
				data-copy-btn
				aria-label="${t.labels.copy}"
				class="inline-flex items-center rounded-none border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500"
			>
				<img src="/icons/document-duplicate.svg" alt="" aria-hidden="true" class="h-5 w-5" />
			</button>
			<a
				id="download-link"
				href="${qrUrl}"
				download="qrcode.${format}"
				aria-label="${t.labels.download}"
				class="inline-flex items-center rounded-none rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500"
			>
				<img src="/icons/arrow-down-tray.svg" alt="" aria-hidden="true" class="h-5 w-5" />
			</a>
		</div>
		<p id="copy-status" class="mt-2 px-3 py-2 text-sm text-gray-700"></p>
	</section>`;
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
	return html`<!doctype html>
<html lang="${lang}">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${t.title}</title>
		<link rel="icon" href="/logo.svg" />
		<link rel="stylesheet" href="/styles.css" />
		<script src="/htmx.min.js"></script>
	</head>
	<body class="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
		<div class="max-w-lg w-full space-y-8">
			<div>
				<img class="mx-auto h-24 w-auto" src="/logo.svg" alt="QRコード プレースホルダー メーカー" />
				<h1 class="mt-6 text-center text-3xl font-extrabold text-gray-900">${t.title}</h1>
				<p class="mt-2 text-center text-sm text-gray-600">${t.description}</p>
			</div>
			<div class="mt-8 bg-white p-6 rounded-lg shadow">
				<form
					id="qr-form"
					class="space-y-6"
					hx-get="/fragments/qr"
					hx-target="#preview-shell"
					hx-swap="outerHTML"
					hx-indicator="#loading-indicator"
				>
					<input type="hidden" name="url_prefix" value="${urlPrefixPath}" />
					<div>
						<label class="block text-sm font-bold text-gray-700">${t.labels.data}</label>
						<textarea
							name="data"
							class="mt-1 px-3 py-2 block w-full rounded-none rounded-l-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
							rows="3"
							placeholder="${t.labels.dataPlaceholder}"
						>${data}</textarea>
					</div>

					<div>
						<label class="block text-sm font-bold text-gray-700">${t.labels.size}</label>
						<input
							type="text"
							name="size"
							value="${size}"
							maxLength="4"
							class="mt-1 px-3 py-2 block w-full rounded-none rounded-l-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
							placeholder="${t.labels.sizePlaceholder}"
						/>
					</div>

					<fieldset>
						<legend class="block text-sm font-bold text-gray-700">${t.labels.format}</legend>
						<div class="mt-2 px-3 py-2 flex items-center space-x-4">
							<label class="inline-flex items-center">
								<input
									type="radio"
									name="format"
									value="png"
									${format === "png" ? "checked" : ""}
									class="h-4 w-4 px-3 py-2 text-indigo-600 border-gray-300 focus:ring-indigo-500"
								/>
								<span class="ml-2">PNG</span>
							</label>
							<label class="inline-flex items-center">
								<input
									type="radio"
									name="format"
									value="svg"
									${format === "svg" ? "checked" : ""}
									class="h-4 w-4 px-3 py-2 text-indigo-600 border-gray-300 focus:ring-indigo-500"
								/>
								<span class="ml-2">SVG</span>
							</label>
						</div>
					</fieldset>

					<div class="flex justify-end">
						<button
							type="submit"
							aria-label="${t.labels.reload}"
							class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 focus:outline-none"
						>
							<img src="/icons/arrow-path.svg" alt="" aria-hidden="true" class="h-5 w-5" style="filter: invert(1) brightness(1.2);" />
						</button>
					</div>
				</form>

				<div id="preview-shell">
					${renderPreview(lang, qrUrl, format)}
				</div>
			</div>
		</div>
		<footer class="mt-8 text-center text-xs">
			<p>${t.trademark}</p>
		</footer>

		<script>
			(() => {
				const lang = document.documentElement.lang === "ja" ? "ja" : "en";
				const feedback = {
					en: {
						copied: "${uiMessages.en.feedback.copied}",
						copyFailed: "${uiMessages.en.feedback.copyFailed}",
						qrError: "${uiMessages.en.feedback.qrError}",
					},
					ja: {
						copied: "${uiMessages.ja.feedback.copied}",
						copyFailed: "${uiMessages.ja.feedback.copyFailed}",
						qrError: "${uiMessages.ja.feedback.qrError}",
					},
				};

				const setStatus = (id, text, hiddenClass = "hidden") => {
					const el = document.getElementById(id);
					if (!el) return;
					el.textContent = text || "";
					if (text) {
						el.classList.remove(hiddenClass);
					} else {
						el.classList.add(hiddenClass);
					}
				};

				const currentMessages = feedback[lang];

				const updateDownloadHref = () => {
					const preview = document.getElementById("qr-preview");
					const url = preview?.getAttribute("data-qr-url") || "";
					const downloadLink = document.getElementById("download-link");
					const input = document.getElementById("qr-url-input");
					if (downloadLink && url) downloadLink.setAttribute("href", url);
					if (input instanceof HTMLInputElement && url) input.value = url;
				};

				document.addEventListener("click", async (event) => {
					const rawTarget = event.target;
					const target = rawTarget instanceof Element ? rawTarget.closest("[data-copy-btn]") : null;
					if (!target) return;
					const preview = document.getElementById("qr-preview");
					const url = preview?.getAttribute("data-qr-url") || "";
					if (!url) return;
					try {
						await navigator.clipboard.writeText(url);
						setStatus("copy-status", currentMessages.copied, "hidden");
						setTimeout(() => setStatus("copy-status", "", "hidden"), 2000);
					} catch (_err) {
						setStatus("copy-status", currentMessages.copyFailed, "hidden");
						alert(currentMessages.copyFailed);
					}
				});

				// htmx lifecycle
				document.addEventListener("htmx:beforeRequest", () => {
					const indicator = document.getElementById("loading-indicator");
					indicator?.classList.remove("hidden");
					setStatus("qr-error", "", "hidden");
				});

				document.addEventListener("htmx:afterSwap", () => {
					const indicator = document.getElementById("loading-indicator");
					indicator?.classList.add("hidden");
					updateDownloadHref();
				});

				window.handleQRLoaded = () => {
					const indicator = document.getElementById("loading-indicator");
					indicator?.classList.add("hidden");
					setStatus("qr-error", "", "hidden");
					updateDownloadHref();
				};

				window.handleQRError = () => {
					const indicator = document.getElementById("loading-indicator");
					indicator?.classList.add("hidden");
					setStatus("qr-error", currentMessages.qrError, "hidden");
				};
			})();
		</script>
	</body>
</html>`;
};

app.get("/", (c) => {
	const acceptLanguage = c.req.header("accept-language") || "";
	const lang: Lang = acceptLanguage.toLowerCase().startsWith("ja") ? "ja" : "en";
	const urlPrefixPath = Deno.env.get("url_prefix") || "";
	const url = new URL(c.req.url);
	const originPrefix = `${url.protocol}//${url.host}${urlPrefixPath}`;
	const data = urlPrefixPath ? `${originPrefix}/` : url.href;
	const size = 300;
	const format = "png";
	return c.html(renderPage(lang, originPrefix, urlPrefixPath, data, size, format));
});

app.get("/styles.css", () => serveStaticFile("./static/styles.css", "text/css"));
app.get("/logo.svg", () => serveStaticFile("./static/logo.svg", "image/svg+xml"));
app.get("/robots.txt", () => serveStaticFile("./static/robots.txt", "text/plain"));
app.get("/htmx.min.js", () => serveStaticFile("./static/htmx.min.js", "application/javascript"));
app.get("/icons/:name", (c) => {
	const name = c.req.param("name");
	return serveStaticFile(`./static/icons/${name}`, "image/svg+xml");
});

app.get("/fragments/qr", (c) => {
	const query = c.req.query();
	const urlPrefixPath = query.url_prefix ?? "";
	const acceptLanguage = c.req.header("accept-language") || "";
	const lang: Lang = acceptLanguage.toLowerCase().startsWith("ja") ? "ja" : "en";
	const reqUrl = new URL(c.req.url);
	const originPrefix = `${reqUrl.protocol}//${reqUrl.host}${urlPrefixPath}`;
	const data = query.data ?? (urlPrefixPath ? `${originPrefix}/` : reqUrl.href);
	const size = clampWidth(query.size ?? "300");
	const format = query.format === "svg" ? "svg" : "png";
	const qrUrl = buildQrUrl(originPrefix, data, size, format);
	const htmlBody = `<div id="preview-shell">${renderPreview(lang, qrUrl, format)}</div>`;
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
				throw new Error("SVGO optimization error: " + (optimizedResult as { error?: string }).error);
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
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		return new Response(errorMessage, { status: 500 });
	}
});

app.notFound((c) => {
	return c.html(html`<!doctype html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>404 - Page not found</title>
				<link rel="stylesheet" href="/styles.css" />
				<script src="https://cdn.tailwindcss.com"></script>
			</head>
			<body class="px-4 py-8 mx-auto bg-green-200">
				<div class="max-w-3xl mx-auto flex flex-col items-center justify-center">
					<img class="my-6" src="/logo.svg" width="128" height="128" alt="logo" />
					<h1 class="text-4xl font-bold">404 - Page not found</h1>
					<p class="my-4">The page you were looking for doesn't exist.</p>
					<a href="/" class="underline">Go back home</a>
				</div>
			</body>
		</html>`);
});

Deno.serve(app.fetch);
