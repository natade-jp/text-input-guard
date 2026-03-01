# Getting Started

TextInputGuard を最短で使い始めるためのガイドです。
まずは「動かす」ことを目的に、必要最小限の手順だけを紹介します。

## 1. インストール

```bash
npm i text-input-guard
```

## 2. 最小構成（attach）

最も基本的な使い方です。
1つの `<input>` に対してガードを適用します。

```html
<input id="price" type="text" inputmode="decimal" />
```

```js
import { attach, rules } from "text-input-guard";

const input = document.getElementById("price");

attach(input, {
	rules: [rules.numeric()]
});
```

これだけで次の制御が有効になります。

- 全角数字 → 半角へ正規化
- 不要な文字の除去
- IMEと共存した入力制御

## 3. よくある金額入力の例

実務でよくある金額入力の構成例です。

- 全角入力を許可
- マイナス許可
- 小数点許可
- 整数8桁、小数2桁まで
- カンマ表示

```js
import { attach, rules } from "text-input-guard";

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
			frac: 2,
			overflowInputInt: "block",
			overflowInputFrac: "block"
		}),
		rules.comma()
	]
});
```

入力中はUXを壊さず、
確定時（blur）に補正や表示整形が行われます。

## 4. autoAttach（HTMLだけで設定）

`data-tig-*` 属性から自動的にルールを読み取り、適用できます。

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
	data-tig-rules-digits-int="8"
	data-tig-rules-digits-frac="2"
	data-tig-rules-comma
/>
```

```js
import { autoAttach } from "text-input-guard";

autoAttach();
```

ページ読み込み時に対象要素へ自動適用されます。

## 5. 値の取得とバリデーション

`attach()` が返す `Guard` から状態を取得できます。

```js
const guard = attach(input, { rules: [rules.numeric()] });

if (!guard.isValid()) {
	console.log(guard.getErrors());
}

const rawValue = guard.getRawValue(); // 送信用の値
const displayValue = guard.getDisplayValue(); // 表示中の値
```

## 次に読む

- 詳細なAPI仕様 → [API](/api)
- 実際の挙動を確認 → [Demo](/demo)
- 設計思想や拡張方法 → [Advanced](/advanced)
