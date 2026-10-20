# Folder Tag Manager
<img width="2153" height="987" alt="スクリーンショット 2026-10-20 195507" src="https://github.com/user-attachments/assets/3b5ba97c-7cbc-4d2d-9da2-3b6f2202f801" />

PC内のフォルダを色付きタグで管理し、GitHubリポジトリと連携するデスクトップアプリです。

## 機能

- フォルダの登録・タグ付け（色付き）
- フォルダをエクスプローラーから開く
- プロジェクト説明・コメントの保存
- `.git/config` から GitHub remote の自動検知
- GitHub API によるリポジトリ状態の表示（公開/非公開、言語、スター数など）
<img width="3394" height="1319" alt="スクリーンショット 2026-10-20 195604" src="https://github.com/user-attachments/assets/a72af6e8-f007-46db-b720-80d21ee7dccf" />
<img width="327" height="1181" alt="スクリーンショット 2026-10-20 195546" src="https://github.com/user-attachments/assets/eb10e272-1d8f-463e-a098-8a9a05b25720" />
<img width="324" height="1272" alt="スクリーンショット 2026-10-20 195533" src="https://github.com/user-attachments/assets/eabd0bb1-7457-4afa-91a2-5b6df51bf3d0" />
<img width="313" height="1258" alt="スクリーンショット 2026-10-20 195523" src="https://github.com/user-attachments/assets/49269199-e156-4230-ac1c-ca5fb6015110" />

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
