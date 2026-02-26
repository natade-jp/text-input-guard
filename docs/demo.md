<script setup>
import { withBase } from 'vitepress';
import { useDemoIframes } from './composables/useDemoIframes.js';

useDemoIframes();
</script>

# Demo

TextInputGuard の代表的な使い方を、実際に動かしながら確認できます。  
各デモはそのまま入力して挙動を試せます。

## attach

単一の入力要素に対してガードを適用します。

### 例1：制限超過は「エラーにする（入力は止めない）」

- 全角 → 半角変換
- マイナス許可
- 小数点許可
- 桁数制限あり
- 制限超過時は入力を止めず、エラー状態にする

<iframe
  :src="withBase('/demo/attach-test1.html')"
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
			overflowInputFrac: "none",
			overflowInputInt: "none"
		}),
		rules.comma()
	]
});
```

### 例2：制限超過は「入力ブロック」＋初期値設定

- 基本設定は例1と同じ
- 制限を超えた入力は受け付けない（block）
- 初期値を設定

<iframe
  :src="withBase('/demo/attach-test2.html')"
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
		rules.comma()
	]
});
guard.setValue("123.45");
```

### 例3：空不可＋小数部を必ず表示

- マイナス不許可
- 空入力を許可しない
- blur時に小数部を必ず付与（forceFracOnBlur）

<iframe
  :src="withBase('/demo/attach-test3.html')"
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

## attachAll

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

## autoAttach

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
