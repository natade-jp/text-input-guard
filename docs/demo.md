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
		rules.filter({
			category: ["katakana-full"],
			allow: /[ ]/
		}),
		rules.trim()
	]
});
```

### ASCII大文字＋数字

- アルファベットの大文字と数値を許可
- 記号は正規表現で `-_@` のみ許可
- 前後のスペースを除去
- IMEの初期値はOFF（`inputmode="url"`）

<iframe
  :src="withBase('/demo/text-test2.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="code" type="text" inputmode="url" />
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("code");
const guard = attach(input, {
	rules: [
		rules.imeOff(),
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

### レガシーWindows互換（CP932）

- Windows-31J（CP932）で表現できるできる文字のみ許可
- CP932換算で 10バイト以内 に制限
- 旧来のWindows依存システムで「送信すると文字化け/登録失敗」しやすい文字を事前に弾く用途
    - `髙` は入力可能（CP932にある）
    - `圡` は入力不可（CP932に無い）

<iframe
  :src="withBase('/demo/text-test3.html')"
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
		rules.filter({
			category: ["cp932-only"]
		}),
		rules.bytes({
			max: 10,
			mode: "block",
			unit: "cp932"
		})
	]
});
```

### 古いUnicode前提システム向け（BMPのみ）

- BMP外（サロゲートペアが必要な文字）を許可しない
    - `圡`は入力可能
    - `𡈽`は入力不可
- 複数コードポイントで構成される見た目の文字を許可しない
    - `☺` は入力可能（単一コードポイント）
    - `☺︎` は入力不可（絵文字＋異体字セレクタで複数コードポイント）
    - `あ゙` は入力不可（ひらがな＋結合文字で複数コードポイント）
- UTF-16換算で10文字以内（HTMLの `maxlength` と同じ数え方）

<iframe
  :src="withBase('/demo/text-test4.html')"
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
		rules.filter({
			category: ["bmp-only"]
		}),
		rules.filter({
			category: ["single-codepoint-only"]
		}),
		rules.length({
			max: 10,
			mode: "block",
			unit: "utf-16"
		})
	]
});
```

### 文字数制限

- 見た目の文字数（グラフェム）で制限
- 結合文字などで極端に長くなるのを防ぐため バイト数制限も併用
- `👨‍👩🏴󠁫󠁨󠀱󠀰󠁿🇦🇧１２３` → 6文字（グラフェム） / UTF-8で52バイト

<iframe
  :src="withBase('/demo/text-test5.html')"
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
		rules.length({
			max: 5,
			mode: "error",
			unit: "grapheme"
		}),
		rules.bytes({
			max: 50,
			mode: "error",
			unit: "utf-8"
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

```css
.is-invalid {
	border: 2px solid var(--invalid-border);
	background: var(--invalid-bg);
}
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
			modeFrac: "error",
			modeInt: "error"
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
			frac: 2,
			modeInt: "block",
			modeFrac: "block"
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
			modeInt: "block",
			modeFrac: "block",
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
	data-tig-rules-digits-mode-int="block"
	data-tig-rules-digits-mode-frac="block"
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

## エラー処理

エラー発生時のコールバック関数を使用してエラー表示を実装する。

<iframe
  :src="withBase('/demo/error-test.html')"
  style="width: 100%; border-style: none;"
></iframe>

```html
<input id="name" type="text" />
<div id="name-errors" class="error-bubble" aria-live="polite"></div>
```

```css
.is-invalid {
	border: 2px solid var(--invalid-border);
	background: var(--invalid-bg);
}

.error-bubble {
	display: none;
	margin-top: 6px;
	padding: 8px 12px;
	border: 1px solid var(--invalid-border);
	border-radius: 8px;
	background: var(--invalid-bg);
	color: var(--text);
	font-size: 14px;
	line-height: 1.4;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	position: relative;
	max-width: 420px;
}

.error-bubble.show {
	display: block;
}

.error-bubble::before {
	content: "";
	position: absolute;
	top: -8px;
	left: 16px;
	border-width: 0 8px 8px 8px;
	border-style: solid;
	border-color: transparent transparent var(--invalid-border) transparent;
}

.error-bubble::after {
	content: "";
	position: absolute;
	top: -7px;
	left: 16px;
	border-width: 0 8px 8px 8px;
	border-style: solid;
	border-color: transparent transparent var(--invalid-bg) transparent;
}
```

```js
import { attach, rules } from "./lib/text-input-guard.min.js";

const input = document.getElementById("name");
const errorBox = document.getElementById("name-errors");

function formatErrorMessage(error) {
	switch (error.code) {
		case "length.max_overflow":
			return `文字数が多すぎます（最大 ${error.detail?.limit} 文字、現在 ${error.detail?.actual} 文字）`;
		case "bytes.max_overflow":
			return `文字容量が大きすぎます（最大 ${error.detail?.limit} バイト、現在 ${error.detail?.actual} バイト）`;
		default:
			return error.code;
	}
}

function renderErrors(errors) {
	errorBox.innerHTML = "";

	if (!errors || errors.length === 0) {
		errorBox.classList.remove("show");
		return;
	}

	const ul = document.createElement("ul");
	ul.style.margin = "0";
	ul.style.paddingLeft = "1.2em";

	for (const error of errors) {
		const li = document.createElement("li");
		li.textContent = formatErrorMessage(error);
		ul.appendChild(li);
	}

	errorBox.appendChild(ul);
	errorBox.classList.add("show");
}

attach(input, {
	rules: [
		rules.length({
			max: 5,
			mode: "error",
			unit: "grapheme"
		}),
		rules.bytes({
			max: 5,
			mode: "error",
			unit: "utf-8"
		})
	],
	onValidate(result) {
		renderErrors(result.errors);
	}
});
```
