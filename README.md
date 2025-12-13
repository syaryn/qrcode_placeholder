# QRコードプレースホルダーメーカー

Hono + htmx で構成されたシンプルなQRコードプレースホルダー生成サービスです。既存のURL仕様を維持しつつ、`accept-language` による言語判定と軽量JSによるコピー/ダウンロードを提供します。

## QR Code API

- Endpoint: `/api/qr`
- パラメータ:
  - `data`: QRコードに埋め込むデータ（指定がない場合はリクエストURLが使用されます）
  - `size`: 横幅 (ピクセル単位、例: 300。10000以上の場合は9999に変換されます)
  - `format`: ファイル形式 (`png` または `svg`, デフォルトは `png`)

例: `/api/qr?data=Hello%20World&size=300&format=png`

## セットアップ

1. Deno をインストール: https://deno.land/manual/getting_started/installation
2. リポジトリを取得して移動:
   ```
   git clone https://github.com/syaryn/qrcode_placeholder.git
   cd qrcode_placeholder
   ```
3. 必要に応じて環境変数 `url_prefix` を設定（サブパス配信時に付与）

## 開発 / 実行

- 開発サーバー: `deno task start` (ファイル監視あり)
- プレビュー: `deno task preview`

ブラウザで `http://localhost:8000` を開き、フォームからQRを生成します。htmxにより同一ページでプレビューが更新され、コピー/ダウンロードは軽量JSで動作します。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
