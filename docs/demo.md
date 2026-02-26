<script setup>
import { withBase } from 'vitepress'
import { onMounted, onBeforeUnmount } from 'vue'

let timerId = 0
let observer = null
let iframeList = []
let onIframeLoad = null

function resizeOne(iframe) {
  const doc = iframe.contentDocument
  if (!doc) return
  const h = doc.documentElement.scrollHeight

  const next = Math.max(100, h) + 'px'

  // 無駄な再代入を避ける（ガタつき/レイアウト負荷軽減）
  if (iframe.style.height !== next) {
    iframe.style.height = next
  }
}

function resizeAll() {
  for (const iframe of iframeList) {
    resizeOne(iframe)
  }
}

function applyThemeAll() {
  const isDark = document.documentElement.classList.contains('dark')
  for (const iframe of iframeList) {
    const doc = iframe.contentDocument
    if (!doc?.body) continue
    doc.body.classList.toggle('dark', isDark)
  }
}

onMounted(() => {
  iframeList = Array.from(document.querySelectorAll('iframe'))
  if (iframeList.length === 0) return

  // iframe読み込み後に適用（複数iframe対応）
  onIframeLoad = (e) => {
    const iframe = e.currentTarget
    applyThemeAll()
    resizeOne(iframe)
  }
  for (const iframe of iframeList) {
    iframe.addEventListener('load', onIframeLoad)
  }

  // 初回（すでに読み込み済みの iframe にも効く）
  applyThemeAll()
  resizeAll()

  // VitePressのテーマ変更（html.class）を監視
  observer = new MutationObserver(() => {
    applyThemeAll()
    resizeAll() // テーマ切替で高さが変わることがあるので一応
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

  // 中身が動的に変わる場合の追従（不要なら消してOK）
  timerId = window.setInterval(resizeAll, 500)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null

  if (timerId) {
    clearInterval(timerId)
    timerId = 0
  }

  if (onIframeLoad) {
    for (const iframe of iframeList) {
      iframe.removeEventListener('load', onIframeLoad)
    }
    onIframeLoad = null
  }

  iframeList = []
})
</script>

# Demo

## attach

### 例1

全角は半角化、マイナス許可、小数点許可、桁数制限あり。
制限を超えた場合の入力不可は行わず、エラーとする。

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

### 例2

全角は半角化、マイナス許可、小数点許可、桁数制限あり。
制限を超えた場合、入力できないようにする。
値の初期値を設定。

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

### 例3

全角は半角化、マイナス不許可、小数点許可、桁数制限あり。
空は不許可かつ、必ず小数点を付ける。
値の初期値を設定。

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

`querySelectorAll` で複数の入力項目を同一設定で変更する。

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

`autoAttach` で `input` 内の `data` 要素から自動設定。

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
