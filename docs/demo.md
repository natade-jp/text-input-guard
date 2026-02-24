<script setup>
import { withBase } from 'vitepress'
</script>

# Demo

## attach

### 例1

全角は半角化、マイナス許可、小数点許可、桁数制限あり。
制限を超えた場合の入力不可は行わず、エラーとする。

<iframe
  :src="withBase('/demo/attach-test1.html')"
  style="width: 100%; height: 300px; border: 1px solid #ddd; border-radius: 0px;"
></iframe>

```js
import { attach, rules } from "./lib/text-input-guard.min.js";
const input = document.getElementById("price");
attach(input, {
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

### 例2

全角は半角化、マイナス許可、小数点許可、桁数制限あり。
制限を超えた場合、入力できないようにする。

<iframe
  :src="withBase('/demo/attach-test2.html')"
  style="width: 100%; height: 300px; border: 1px solid #ddd; border-radius: 0px;"
></iframe>

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
```

### 例3

全角は半角化、マイナス不許可、小数点許可、桁数制限あり。
空は不許可かつ、必ず小数点を付ける。

<iframe
  :src="withBase('/demo/attach-test3.html')"
  style="width: 100%; height: 300px; border: 1px solid #ddd; border-radius: 0px;"
></iframe>

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
```

## attachAll

`querySelectorAll` で複数の入力項目を同一設定で変更する。

<iframe
  :src="withBase('/demo/attach-all.html')"
  style="width: 100%; height: 300px; border: 1px solid #ddd; border-radius: 0px;"
></iframe>

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

`autoAttach` で `input` 内の `data` 要素から自動設定。

<iframe
  :src="withBase('/demo/auto-attach.html')"
  style="width: 100%; height: 300px; border: 1px solid #ddd; border-radius: 0px;"
></iframe>

```html
<input
	id="price"
	type="text"
	inputmode="decimal"
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
