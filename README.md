# ECFG Parsing Table

[ll1_checker](https://github.com/kensyo/ll1_checker)

を web アプリにしたものです。

### 開発サーバ起動

```bash
cd wasm_backend
wasm-pack build # rust 側に手を加えたらこれを実行
cd ..
npm run dev
```

### ビルドプロセス

```bash
cd wasm_backend
wasm-pack build --release
cd ..
bun install
npm run start # ビルドおよびサーバ起動
```

`push` すると CI が動く(`.github/workflows/nextjs.yml`)
