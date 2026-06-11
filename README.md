# パチスロ 小役カウンタ PWA

## ファイル構成

```
slot-counter-pwa/
├── index.html        ← メイン画面
├── manifest.json     ← PWA設定
├── sw.js             ← Service Worker（オフライン対応）
├── style.css         ← スタイル
├── app.js            ← アプリロジック + IndexedDB
└── icons/
    ├── icon-192.png  ← アプリアイコン
    └── icon-512.png  ← アプリアイコン（大）
```

---

## デプロイ手順（Cloudflare Pages 推奨・無料）

1. https://github.com でリポジトリ作成（例: `slot-counter`）
2. このフォルダの中身をすべてpush
3. https://pages.cloudflare.com にアクセス
4. 「Create a project」→ GitHubリポジトリを選択
5. ビルド設定は空欄のままデプロイ
6. 発行されたURL（例: `slot-counter.pages.dev`）でアクセス可能

---

## GitHub Pages での公開（代替）

```bash
# リポジトリ作成後
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_NAME/slot-counter.git
git push -u origin main
```

GitHubリポジトリの Settings → Pages → Branch: main → Save

---

## AdSense 広告の設定

### ① AdSense アカウント取得
- https://www.google.com/adsense にアクセス
- Googleアカウントでログイン → サイト審査申請
- 審査通過まで数日〜数週間

### ② index.html の修正（審査通過後）

**head内のコメントを外す:**
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```
`ca-pub-XXXXXXXXXXXXXXXX` → 自分のパブリッシャーIDに変更

**広告バナー部分のコメントを外す:**
```html
<ins class="adsbygoogle"
  style="display:block"
  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
  data-ad-slot="XXXXXXXXXX"
  data-ad-format="auto"
  data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```
- `ca-pub-XXXXXXXXXXXXXXXX` → パブリッシャーID
- `data-ad-slot="XXXXXXXXXX"` → 広告ユニットID

---

## PWA インストール方法（ユーザー向け）

### Android Chrome
1. サイトにアクセス
2. ブラウザメニュー（⋮）→「ホーム画面に追加」
3. アプリとして起動可能

### iOS Safari
1. サイトにアクセス
2. 共有ボタン →「ホーム画面に追加」

---

## データについて

- データは端末のIndexedDB（ブラウザ内ストレージ）に保存されます
- 設定ページから JSONファイルとしてエクスポート可能
- ブラウザのデータ削除でリセットされます

---

## 技術スタック

- HTML5 / CSS3 / Vanilla JS（フレームワーク不使用）
- IndexedDB（データ永続化）
- Service Worker（オフライン対応・キャッシュ）
- PWA Manifest（ホーム画面追加・スタンドアロン動作）
- Google AdSense（広告収益化）
