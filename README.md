# 自分専用の秘書アプリ

Node.js だけで動く、メモとタスク管理のシンプルなアプリです（追加インストール不要）。

## 起動方法

```bash
cd secretary-app
npm start
```

ブラウザで http://localhost:3000 を開いてください。

## 構成

- `server.js` … サーバー（API と画面の配信）
- `public/index.html` … 画面
- `data.json` … メモ・タスクの保存先（初回追加時に自動作成）

アプリを閉じても `data.json` にデータが残るので、次回起動時にそのまま表示されます。
