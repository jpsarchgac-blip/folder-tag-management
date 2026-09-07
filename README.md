# Folder Tag Manager

PC内のフォルダを色付きタグで管理し、GitHubリポジトリと連携するデスクトップアプリです。

## 機能

- フォルダの登録・タグ付け（色付き）
- フォルダをエクスプローラーから開く
- プロジェクト説明・コメントの保存
- `.git/config` から GitHub remote の自動検知
- GitHub API によるリポジトリ状態の表示（公開/非公開、言語、スター数など）

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run electron:build
```

## GitHub トークン

設定画面から Personal Access Token を登録できます。プライベートリポジトリの情報取得に必要です。

- Classic token: `repo` スコープ
- Fine-grained token: Repository access + Contents (Read)
