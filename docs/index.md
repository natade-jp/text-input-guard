---
layout: home

hero:
    name: TextInputGuard
    text: 入力フロー設計ライブラリ
    tagline: 日本語入力環境に最適化されたテキスト入力ガード
    actions:
        - theme: brand
          text: Getting Started
          link: /getting-started
        - theme: alt
          text: Demo
          link: /demo
        - theme: alt
          text: API
          link: /api
        - theme: alt
          text: GitHub
          link: https://github.com/natade-jp/text-input-guard
---

TextInputGuard は、日本語入力環境を前提に設計された入力フロー制御ライブラリです。

`<input>` / `<textarea>` に対して、全角混在・桁数制限・小数処理・表示整形など、日本語環境特有の数値入力制御を扱いやすい形で提供します。  
業務系フォームや金額入力など、IMEの影響を受けやすい入力欄でも、表示用の値と送信用の値を分離しながら安定した制御を行えます。

## できること

- 全角数字・記号の自動正規化（全角 → 半角、記号ゆれ吸収）
- 整数部／小数部の桁数制御（超過時に「エラー」or「入力ブロック」を選べる）
- 入力中はUX優先、確定時（blur/commit）に穏やか補正＆表示整形
- 表示値（カンマ付き）と送信値（整形前）の分離（swap構成）
- `data-tig-*` からの自動適用（autoAttach）

## インストール

```bash
npm i text-input-guard
```

## 30秒で試す（attach）

金額入力のよくある構成例です（全角許可・符号/小数OK・桁制御・カンマ表示）。

```js
import { attach, rules } from "text-input-guard";

const input = document.querySelector("#price");

const guard = attach(input, {
	rules: [
		rules.numeric({ allowFullWidth: true, allowMinus: true, allowDecimal: true }),
		rules.digits({
			int: 8,
			frac: 2,
			overflowInputInt: "block",
			overflowInputFrac: "block",
			fixFracOnBlur: "round"
		}),
		rules.comma()
	]
});

// 例：値をセットして確定評価まで実行
guard.setValue("12345.6");
```

次は、目的に合わせてここを見るのがおすすめです。

- 最短で動かしたい → [Getting Started](/getting-started)
- まず挙動を見たい → [Demo](/demo)
- 仕様を確認しながら使いたい → [API](/api)
- 設計思想や拡張（ルール作成） → [Advanced](/advanced)

## License

MIT
