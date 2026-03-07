---
layout: home

hero:
    name: TextInputGuard
    text: 日本語向け<br>入力制御ライブラリ
    tagline: IME入力でも安定したフォーム入力を実現
    image:
        light: /hero-light.svg
        dark: /hero-dark.svg
        alt: TextInputGuard
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

<script setup>
import { withBase } from 'vitepress';
import { useDemoIframes } from './composables/useDemoIframes.js';

useDemoIframes();
</script>

TextInputGuard は、日本語入力環境を前提に設計された入力補助ライブラリです。

`<input>` / `<textarea>` に対して、全角混在・桁数制限・小数処理・表示整形など、日本語環境特有の入力制御を扱いやすい形で提供します。  
業務系フォームや金額入力など、IME の影響を受けやすい入力欄でも、表示用の値と送信用の値を分離しながら、安定した入力制御を実現できます。

## できること

- 全角数字・記号の自動正規化（全角 → 半角、記号のゆれを吸収）
- 整数部／小数部の桁数制御（超過時は「エラー」または「入力ブロック」を選択可能）
- 入力中は UX を優先し、確定時（blur / commit）に穏やかな補正と表示整形を実行
- 表示値（カンマ付き）と送信値（整形前）を分離できる
- `data-tig-*` 属性からの自動適用（`autoAttach`）

## インストール

```bash
npm i text-input-guard
```

## 例

### 会員コード

会員コードのよくある構成例です（前後trim・ASCII大文字化・文字種制限・文字数制限）。

<iframe
  :src="withBase('/demo/index-text.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="memberCode" type="text" inputmode="url" />
```

```js
import { attach, rules } from "text-input-guard";

const input = document.querySelector("#memberCode");

const guard = attach(input, {
	rules: [
		rules.imeOff(),
		rules.ascii({
			case: "upper"
		}),
		rules.filter({
			category: ["alpha-upper", "digits"],
			allow: /[-_]/
		}),
		rules.length({
			max: 5,
			mode: "block",
			unit: "grapheme"
		}),
		rules.trim()
	]
});
```

### 金額表示

金額入力のよくある構成例です（全角許可・符号/小数OK・桁制御・カンマ表示・円マーク表示等）。

<iframe
  :src="withBase('/demo/index-number.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="price" type="text" inputmode="decimal" style="text-align: right" />
```

```js
import { attach, rules } from "text-input-guard";

const input = document.querySelector("#price");

const guard = attach(input, {
	rules: [
		rules.numeric({
			allowFullWidth: true,
			allowMinus: true,
			allowDecimal: true,
			allowEmpty: false
		}),
		rules.digits({
			int: 8,
			frac: 2,
			modeInt: "block",
			modeFrac: "block",
			fixFracOnBlur: "round",
			forceFracOnBlur: true
		}),
		rules.prefix({
			text: "¥",
			showWhenEmpty: true
		}),
		rules.suffix({
			text: " JPY"
		}),
		rules.comma()
	]
});

guard.setValue("12345.6");
```

次は、目的に合わせてここを見るのがおすすめです。

- 最短で動かしたい → [Getting Started](/getting-started)
- 他にも挙動を見たい → [Demo](/demo)
- 仕様を確認しながら使いたい → [API](/api)
- 設計思想や拡張（ルール作成） → [Advanced](/advanced)

## License

MIT
