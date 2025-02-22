# QRコードプレースホルダーメーカー

## プロジェクト概要

このプロジェクトは、Freshフレームワークを使用した最新のWebアプリケーションです。シンプルな構成に加え、QRコード生成機能を搭載しています。

## QR Code API

QRコードは以下のエンドポイントで生成できます:

- Endpoint: /api/qr
- パラメータ:
  - data:
    QRコードに埋め込むデータ（指定がない場合はリクエストURLが使用されます）
  - size: 横幅 (ピクセル単位、例: 300。10000以上の場合は9999に変換されます)
  - format: ファイル形式 ("png" または "svg", デフォルトは "png")

例:

```
/api/qr?data=Hello%20World&size=300&format=png
```

## インストール

1. Denoをインストールしてください:
   https://deno.land/manual/getting_started/installation
2. リポジトリをクローンしてください:
   ```
   git clone https://github.com/syaryn/qrcode_placeholder.git
   cd your-repo
   ```
3. 必要な依存パッケージをインストール（Freshのドキュメントを参照）

## 使用方法

以下のコマンドでプロジェクトを開始します:

```
deno task start
```

また、QRコード生成はアプリ内のQRGeneratorコンポーネント（/islands/QRGenerator.tsx）で利用されています。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
