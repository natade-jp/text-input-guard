<script setup>
import { withBase } from 'vitepress';
import { useDemoIframes } from './composables/useDemoIframes.js';

useDemoIframes();
</script>

# Demo

TextInputGuard の代表的な使い方を、実際に動かしながら確認できます。  
各デモはそのまま入力して挙動を試せます。

## 文字列系

### カタカナのみ

- かなは「全角カタカナ」へ統一
- ASCIIコードは半角へ統一
- カタカナと半角スペースを許可
- 前後のスペースを除去

<iframe
  :src="withBase('/demo/text-test1.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="name" type="text" />
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("name");
const guard = attach(input, {
	rules: [
		rules.kana({
			target: "katakana-full"
		}),
		rules.ascii(),
		rules.filter({
			category: ["katakana-full"],
			allow: /[ ]/
		}),
		rules.trim()
	]
});
```

### 半角英数字

- アルファベットの大文字と数値を許可
- 特定の記号のみ許可
- 前後のスペースを除去

<iframe
  :src="withBase('/demo/text-test2.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="code" type="text" />
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("code");
const guard = attach(input, {
	rules: [
		rules.ascii({
			case: "upper"
		}),
		rules.filter({
			category: ["alpha-upper", "digits"],
			allow: /[-_@]/
		}),
		rules.trim()
	]
});
```

### 旧Windowsとの互換

- Windows31-J(cp932) のみ入力可能
    - 髙は入力可能
    - 圡は入力不可

<iframe
  :src="withBase('/demo/text-test3.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="name" type="text" />
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("code");
const guard = attach(input, {
	rules: [
		rules.filter({
			category: ["cp932-only"]
		})
	]
});
```

### Unicodeに完全対応していないシステムとの互換

- サロゲートペアが入った文字に対応しない
    - 圡は入力可能
    - 𡈽は入力不可
- 異体字セレクタなどのグラフェムとコードポイントの数との不一致に対応しない
    - ☺は入力可能
    - ☺︎は入力不可
    - あ゙は入力不可

<iframe
  :src="withBase('/demo/text-test4.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="name" type="text" />
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("code");
const guard = attach(input, {
	rules: [
		rules.filter({
			category: ["bmp-only"]
		}),
		rules.filter({
			category: ["single-codepoint-only"]
		})
	]
});
```

## 数値系

### 制限超過はエラー

- 全角 → 半角変換
- マイナス許可
- 小数点許可
- 桁数制限あり
- 制限超過時は入力を止めず、エラー状態にする

<iframe
  :src="withBase('/demo/number-test1.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="price" type="text" inputmode="decimal" style="text-align: right" />
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("price");
const guard = attach(input, {
	rules: [
		rules.numeric({
			allowFullWidth: true,
			allowMinus: true,
			allowDecimal: true
		}),
		rules.digits({
			int: 8,
			frac: 2,
			overflowInputFrac: "none",
			overflowInputInt: "none"
		}),
		rules.prefix({
			text: "¥"
		}),
		rules.suffix({
			text: " JPY",
			showWhenEmpty: true
		}),
		rules.comma()
	]
});
```

### 制限超過はブロック, 初期値設定, 文字追加

- 基本設定は例1と同じ
- 制限を超えた入力は受け付けない（block）
- 頭に円マークを付ける
- 末尾にJPYを付ける
- 初期値を設定

<iframe
  :src="withBase('/demo/number-test2.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="price" type="text" inputmode="decimal" style="text-align: right" />
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("price");
const guard = attach(input, {
	rules: [
		rules.numeric({
			allowFullWidth: true,
			allowMinus: true,
			allowDecimal: true
		}),
		rules.digits({
			int: 8,
			frac: 4,
			overflowInputInt: "block",
			overflowInputFrac: "block"
		}),
		rules.prefix({
			text: "¥"
		}),
		rules.suffix({
			text: " JPY",
			showWhenEmpty: true
		}),
		rules.comma()
	]
});
guard.setValue("123.45");
```

### 小数部強制表示

- マイナス不許可
- 空入力を許可しない（`allowEmpty`）
- blur時に小数部を必ず付与（`forceFracOnBlur`）

<iframe
  :src="withBase('/demo/number-test3.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="price" type="text" inputmode="decimal" style="text-align: right" />
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("price");
const guard = attach(input, {
	rules: [
		rules.numeric({
			allowFullWidth: true,
			allowMinus: false,
			allowDecimal: true,
			allowEmpty: false
		}),
		rules.digits({
			int: 8,
			frac: 2,
			overflowInputInt: "block",
			overflowInputFrac: "block",
			forceFracOnBlur: true
		}),
		rules.comma()
	]
});
guard.setValue();
```

## 同一設定を用いた適用

複数の入力要素に同一設定を適用します。

<iframe
  :src="withBase('/demo/attach-all.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input class="price" type="text" inputmode="decimal" style="text-align: right" />
```

```js
import { attachAll, rules } from "./lib/text-input-guard.min.js";

const guards = attachAll(document.querySelectorAll(".price"), {
	rules: [
		rules.numeric({ allowFullWidth: true, allowMinus: true, allowDecimal: true }),
		rules.digits({ int: 6, frac: 2 }),
		rules.comma()
	]
});
const guard = guards.getGuards()[0];
```

## データ属性からの適用

`data-tig-*` 属性から自動的にルールを読み取り、ガードを適用します。

<iframe
  :src="withBase('/demo/auto-attach.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input
	id="price"
	type="text"
	inputmode="decimal"
	style="text-align: right"
	data-tig-rules-numeric
	data-tig-rules-numeric-allow-full-width="true"
	data-tig-rules-numeric-allow-minus="true"
	data-tig-rules-numeric-allow-decimal="true"
	data-tig-rules-digits
	data-tig-rules-digits-int="6"
	data-tig-rules-digits-frac="2"
	data-tig-rules-digits-overflow-input-int="block"
	data-tig-rules-digits-overflow-input-frac="block"
	data-tig-rules-digits-fix-frac-on-blur="round"
	data-tig-rules-comma
	data-tig-rules-digits-force-frac-on-blur="true"
/>
```

```js
import { autoAttach } from "./lib/text-input-guard.min.js";
const guards = autoAttach();
const guard = guards.getGuards()[0];
```
