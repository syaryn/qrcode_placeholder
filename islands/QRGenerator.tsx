import { useSignal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import { IconCopy, IconDownload, IconReload } from "npm:@tabler/icons-preact";

interface QRGeneratorProps {
  urlPrefix: string;
}

export default function QRGenerator(props: QRGeneratorProps) {
  const data = useSignal(props.urlPrefix);
  const size = useSignal("300"); // 横幅のみ入力（例: 300）
  const format = useSignal("png");
  const qrUrl = useSignal("");
  const copyMsg = useSignal("");
  const qrError = useSignal(""); // エラーメッセージ用
  const isLoading = useSignal(true); // 読み込み状態用

  const userLang = useMemo(() => {
    return navigator.language.startsWith("ja") ? "ja" : "en";
  }, []);

  const messages = {
    en: {
      copyFailed: "Copy failed",
      copied: "Copied!",
      labelData: "Data",
      placeholderData: "Enter your data",
      labelSize: "Size (px)",
      placeholderSize: "e.g., 300",
      labelFormat: "File format",
      qrError: "Failed to generate QR code due to server error.",
      loading: "Loading...",
    },
    ja: {
      copyFailed: "コピーに失敗しました",
      copied: "コピーしました!",
      labelData: "データ",
      placeholderData: "データを入力してください",
      labelSize: "サイズ(px)",
      placeholderSize: "例: 300",
      labelFormat: "ファイル形式",
      loading: "読み込み中...",
    },
  };
  const currentMsg = messages[userLang];

  const updateQRUrl = (e: Event) => {
    e.preventDefault();
    isLoading.value = true; // リクエスト開始時に読み込み状態にする
    // props.urlPrefix を先頭に付与
    qrUrl.value = `${props.urlPrefix}/api/qr?data=${
      encodeURIComponent(
        data.value,
      )
    }&size=${encodeURIComponent(size.value)}&format=${
      encodeURIComponent(
        format.value,
      )
    }`;
    copyMsg.value = "";
    qrError.value = ""; // 生成時はエラーリセット
  };

  // コンポーネント初回レンダリング時に QR を生成
  useEffect(() => {
    updateQRUrl({ preventDefault: () => {} } as Event);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl.value);
      copyMsg.value = currentMsg.copied;
      setTimeout(() => {
        copyMsg.value = "";
      }, 2000);
    } catch (_error) {
      copyMsg.value = currentMsg.copyFailed;
    }
  };

  return (
    <div class="mt-8 bg-white p-6 rounded-lg shadow">
      <form onSubmit={updateQRUrl} class="space-y-6">
        <div>
          <label class="block text-sm font-bold text-gray-700">
            {currentMsg.labelData}
          </label>
          <textarea
            value={data.value}
            onInput={(
              e,
            ) => (data.value = (e.target as HTMLTextAreaElement).value)}
            class="mt-1 px-3 py-2 block w-full rounded-none rounded-l-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            rows={3}
            placeholder={currentMsg.placeholderData}
          >
          </textarea>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700">
            {currentMsg.labelSize}
          </label>
          <input
            type="text"
            value={size.value}
            onInput={(e) => (size.value = (e.target as HTMLInputElement).value)}
            maxLength={4}
            class="mt-1 px-3 py-2 block w-full rounded-none rounded-l-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder={currentMsg.placeholderSize}
          />
        </div>

        <fieldset>
          <legend class="block text-sm font-bold text-gray-700">
            {currentMsg.labelFormat}
          </legend>
          <div class="mt-2 px-3 py-2 flex items-center space-x-4">
            <label class="inline-flex items-center">
              <input
                type="radio"
                name="format"
                value="png"
                checked={format.value === "png"}
                onInput={(
                  e,
                ) => (format.value = (e.target as HTMLInputElement).value)}
                class="h-4 w-4 px-3 py-2 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span class="ml-2">PNG</span>
            </label>
            <label class="inline-flex items-center">
              <input
                type="radio"
                name="format"
                value="svg"
                checked={format.value === "svg"}
                onInput={(
                  e,
                ) => (format.value = (e.target as HTMLInputElement).value)}
                class="h-4 w-4 px-3 py-2 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <span class="ml-2">SVG</span>
            </label>
          </div>
        </fieldset>

        <div class="flex justify-end">
          <button
            type="submit"
            class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 p-3 text-white hover:bg-indigo-700 focus:outline-none"
          >
            <IconReload />
          </button>
        </div>
      </form>

      <div class="mt-8 flex flex-col items-center">
        <div class="relative w-64 h-64 border rounded-md">
          <img
            src={qrUrl.value}
            alt="QR Code"
            class="w-64 h-64 object-contain"
            onError={() => {
              qrError.value = currentMsg.qrError;
              isLoading.value = false;
            }}
            onLoad={() => {
              qrError.value = "";
              isLoading.value = false;
            }}
          />
          {isLoading.value && (
            <div class="absolute inset-0 flex items-center justify-center bg-white">
              {currentMsg.loading}
            </div>
          )}
        </div>
        {qrError.value && (
          <p class="mt-2 px-3 py-2 text-sm text-red-600">{qrError.value}</p>
        )}
      </div>

      <div class="mt-6 space-y-4">
        <label class="block text-sm font-bold text-gray-700">URL</label>
        <div class="mt-1 flex rounded-md shadow-sm">
          <input
            type="text"
            readOnly
            value={qrUrl.value}
            class="px-3 py-2 block w-full rounded-none rounded-l-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            onClick={(e) => {
              (e.target as HTMLInputElement).select();
            }}
          />
          <button
            onClick={copyToClipboard}
            class="inline-flex items-center rounded-none border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 hover:bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <IconCopy />
          </button>
          <a
            href={qrUrl.value}
            download={`qrcode.${format.value}`}
            class="inline-flex items-center rounded-none rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 hover:bg-gray-100 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <IconDownload />
          </a>
        </div>
        {copyMsg.value && (
          <p class="mt-2 px-3 py-2 text-sm text-gray-700">
            {copyMsg.value}
          </p>
        )}
      </div>
    </div>
  );
}
