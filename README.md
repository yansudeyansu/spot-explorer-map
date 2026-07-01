# スポット探索マップ

位置情報探索Webアプリケーション（Landitコーディングテスト提出物）

> 要件と動作確認手順の対応表は [docs/test-checklist.md](docs/test-checklist.md) にまとめています。

## 環境構築

### 前提条件
- **Docker / Docker Compose** がインストールされていること
- 以下のポートが空いていること（他アプリが使用中だと起動が衝突します）
  - `3000` … フロントエンド
  - `3001` … バックエンドAPI
  - `5432` … PostgreSQL
- **インターネット接続**があること
  - ビルド時: npm パッケージの取得
  - 実行時: 地図タイル（OpenStreetMap）と住所取得API（Nominatim / Google）の呼び出し

### APIキーの設定（任意）

Google Maps APIキーを使用する場合は `.env` ファイルを作成してください。
未設定の場合は **Nominatim (OpenStreetMap)** がフォールバックとして自動使用されます。

```bash
cp .env.example .env
# GOOGLE_MAPS_API_KEY= に取得したキーを記入
```

## 実行手順

```bash
# 起動（初回はイメージビルドが入るため数分かかります）
docker-compose up --build

# 起動後
# フロントエンド: http://localhost:3000
# バックエンドAPI: http://localhost:3001
```

データベースへのシードは **バックエンド起動時に自動実行**されます。
既にデータが存在する場合はスキップされます。

> **データ件数について**
> 課題文には「約500件」と記載がありますが、提供された `landit_coding_test_seed.csv` は
> 実際には200件でした。シード処理はCSVの行数を決め打ちせず全件を読み込む実装のため、
> 件数が変わっても（例: 500件版に差し替え）コード修正なしでそのまま取り込めます。

## ディレクトリ構成

```
landit/
├── docker-compose.yml          # DB / backend / frontend を一括起動
├── .env.example                # 環境変数のテンプレート（APIキー等）
├── landit_coding_test_seed.csv # 提供シードデータ（原本）
│
├── backend/                    # NestJS + TypeORM
│   ├── Dockerfile
│   ├── seed/
│   │   └── landit_coding_test_seed.csv  # イメージに焼き込むシード（自動投入用）
│   └── src/
│       ├── main.ts             # エントリポイント（CORS / ValidationPipe 設定）
│       ├── app.module.ts       # DB接続（ローカル/クラウド両対応）とモジュール束ね
│       ├── spots/              # スポット検索
│       │   ├── spot.entity.ts          # spots テーブル定義
│       │   ├── spots.controller.ts     # GET /spots
│       │   ├── spots.service.ts        # Haversine 式による半径検索
│       │   └── dto/search-spots.dto.ts # クエリ検証（lat/lng/radius）
│       ├── geocoding/         # 逆ジオコーディング
│       │   ├── geocoding.controller.ts # GET /geocode/reverse
│       │   └── geocoding.service.ts    # Google→Nominatim フォールバック＋キャッシュ
│       └── seed/              # 起動時の自動シード
│           └── seed.service.ts         # CSV を冪等に投入
│
└── frontend/                   # Next.js (App Router) + Tailwind
    ├── Dockerfile
    └── src/
        ├── app/
        │   ├── layout.tsx              # 全体レイアウト＋スキップリンク
        │   ├── page.tsx               # 画面の状態管理（中心/半径/選択）
        │   ├── globals.css            # デザイントークン・スライダー・a11y
        │   └── api/[...path]/route.ts # バックエンドへのランタイムプロキシ
        ├── components/
        │   ├── MapView.tsx            # 地図のSSR無効ラッパー
        │   ├── MapInner.tsx           # Leaflet本体（マーカー・半径円・連動）
        │   ├── SpotList.tsx           # スポット一覧（カテゴリ色・a11y対応）
        │   ├── RadiusControl.tsx      # 半径スライダー
        │   └── AddressDisplay.tsx     # 地図中心の住所（aria-live）
        ├── hooks/
        │   ├── useSpots.ts            # 周辺検索（デバウンス＋競合ガード）
        │   ├── useReverseGeocode.ts   # 住所取得（多層キャッシュ）
        │   └── useDebounce.ts         # 汎用デバウンス
        └── types/index.ts             # 共有型定義
```

## 使用した主要ライブラリと選定理由

| ライブラリ | 理由 |
|---|---|
| **NestJS** | モジュール設計・DI・デコレータによる構造化が容易。TypeScriptとの親和性が高い |
| **TypeORM** | エンティティとDBスキーマを同期できる `synchronize` モードで素早くプロトタイプ構築 |
| **PostgreSQL (postgis/postgis イメージ)** | PostGIS拡張を内包し、将来的な地理空間クエリ拡張に対応可能 |
| **Next.js 14 (App Router)** | ファイルベースルーティング・SSR/クライアント分離が明確。App Router の Route Handler でランタイムプロキシが実装できる |
| **react-leaflet / Leaflet** | APIキー不要・無料・軽量。OpenStreetMapタイルで即座に動作可能 |
| **Tailwind CSS** | ユーティリティクラスで素早くUIを構築でき、設定ファイルが最小 |
| **csv-parse** | Node.js用の堅牢なCSVパーサー。同期パース (`/sync`) でシードコードがシンプルになる |

## 実装時に特に工夫した点・技術的な判断箇所

### 1. Route Handler によるランタイムプロキシとAPIキー保護

`src/app/api/[...path]/route.ts` にキャッチオール Route Handler を実装し、
ブラウザからの `/api/*` リクエストをすべてバックエンドへ転送します。

`next.config` の `rewrites` はビルド時に宛先URLが評価・固定されるため、
Docker コンテナ名（`http://backend:3001`）を動的に解決できません。
Route Handler はリクエストごとに `process.env.API_URL` を読むため、
ローカル開発（`localhost:3001`）と Docker 内（`backend:3001`）の両方で正しく動作します。
ブラウザにバックエンドURLやAPIキーが一切露出しない設計です。

### 2. 逆ジオコーディングのダブルキャッシュ戦略
- **フロントエンド**: 座標を小数点3桁（≒100m精度）でキャッシュ（TTL: 10分）
- **バックエンド**: 同じ精度でメモリキャッシュ（TTL: 10分）
- フロントエンド側での500msデバウンスと組み合わせることでAPIコールを大幅に削減

Google Maps API未設定時はNominatimを自動使用するため、APIキーなしでも動作します。

### 3. Haversine式によるSQL内距離計算
PostGISを使わずとも `acos(cos...) * 6371` の式をSQL中に組み込むことで、  
インデックスを活用した効率的な半径検索を実現しています。  
将来的なスケール要件がある場合、`geography` 型 + `ST_DWithin` へ移行しやすいよう、  
PostGISイメージを選定しています。

### 4. Leaflet + Next.js App RouterのSSR回避
Leafletはブラウザ限定APIを使用するため、`dynamic(() => import('./MapInner'), { ssr: false })`  
でクライアントサイドのみにレンダリングを限定しました。

### 5. 検索半径の視覚的フィードバック
スライダーで変更した半径をLeafletの `Circle` コンポーネントでリアルタイムに地図上へ描画し、  
ユーザーが検索範囲を直感的に把握できるようにしました。

### 6. スポット選択時の双方向連動
- リストのスポットをクリック → 地図がパンしてマーカーをハイライト
- 地図のマーカーをクリック → リストが対応アイテムへスクロール

### 7. フールプルーフなUX（誰でも直感的に使える設計）
この種のアプリは「地図の中心が検索の起点」という空間モデルが暗黙的になりがちなため、
PM目線で初見ユーザーがつまずく箇所を洗い出し、説明文・ヒントで補いました。
- 中心の＋印に「検索の中心」ラベルを常時表示し、破線円・一覧との関係を可視化
- 住所ラベルを「地図の中心」とし、GPS現在地との誤解を防止
- 初回オンボーディングのヒント（操作手順を1枚で説明、閉じると `localStorage` で再表示しない）
- 「中心を戻す」ボタンで遠くへ移動した際の復帰を担保
- ゼロ件・移動中ローディングなどのエッジケースに明示的なメッセージ

### 8. アクセシビリティ（キーボード操作・スクリーンリーダー対応）
見た目だけでなく支援技術でも使えるよう、WCAGの観点で対応しました。
- セマンティックなランドマーク（`header`/`main`/`aside`/`section`）とスキップリンク
- 地図中心の住所・検索件数を `aria-live` で読み上げ
- 半径スライダーの `aria-valuetext`、一覧項目の `aria-pressed`・説明的な `aria-label`
- 全インタラクティブ要素に可視フォーカスリング、`prefers-reduced-motion` の尊重

## 簡略化した点・今後の改善案

### 時間の都合で簡略化した点（意図的な割り切り）

- **テスト未実装**: 今回はユニットテスト・E2Eテストを実装していません。
  優先度をつけるなら、距離計算（`spots.service.ts` の Haversine）のユニットテストと、
  検索フローのE2E（Playwright）から着手します。
- **認証なし**: APIは現状オープンで、誰でもアクセス可能です。
  本番では認証ミドルウェア（Guard）を追加する前提です。今回はスコープ外と判断しました。

### 今後の改善点

- **ページネーション**: 現状はAPI応答をすべてフロントエンドへ返している。スポットが数万件になる場合はページングまたはViewport範囲絞り込みが必要
- **PostGIS `ST_DWithin` への移行**: 現在のHaversine式は毎回全件スキャンする可能性があるため、`geography` 型 + GiSTインデックスで高速化
- **`synchronize: true` の見直し**: 開発では手軽だが本番はスキーマ破壊リスクがあるため、マイグレーション運用へ切り替える
- **マーカークラスタリング**: スポットが密集するエリアでは `leaflet.markercluster` 等で視認性を向上
- **エラーバウンダリ**: APIエラー時のユーザー向けメッセージが最小限
