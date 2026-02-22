# JP Input Guard

JP Input Guard は、日本向けの入力欄ガードライブラリです。

`<input>` / `<textarea>` に対して、数値入力や日本語特有の制約（全角混在、桁数、表示整形など）を扱いやすい形で提供します。

主な考え方は次の通りです。

- コアは `attach()`：1要素ずつ明示的に有効化する（どの環境でも安定）
- 複数要素は `attachAll()`：まとめて有効化し、まとめて `detach()` できる
- `autoAttach()`：`data-jpig-*` の指定から自動で `attach()` する（HTMLだけで雑に使える）

## インストール

```bash
npm i jp-input-guard
```

## 使い方

### 1) attach（単一要素に適用）

最も基本の使い方です。1つの要素に対してガードを適用します。

```js
import { attach, rules } from "jp-input-guard";

const input = document.querySelector("#price");

const guard = attach(input, {
	rules: [
		rules.numeric({ allowFullWidth: true, allowMinus: true, allowDecimal: true }),
		rules.digits({
			int: 6,
			frac: 2,
			overflowInputInt: "block",
			overflowInputFrac: "block",
			fixFracOnBlur: "round"
		}),
		rules.comma()
	]
});

// 解除
// guard.detach();
```

`attach()` が返す `Guard` は、次のメソッドを持ちます。

- `detach()`：解除（イベント削除・swap復元）
- `isValid()`：現在エラーが無いか
- `getErrors()`：エラー一覧
- `getRawValue()`：送信用の正規化済み値

### 2) attachAll（複数要素にまとめて適用）

通常は入力欄が複数あるため、`querySelectorAll()` の戻り値に対してまとめて適用できます。

```js
import { attachAll, rules } from "jp-input-guard";

const group = attachAll(document.querySelectorAll(".jpig-price"), {
	rules: [
		rules.numeric({ allowFullWidth: true, allowMinus: true, allowDecimal: true }),
		rules.digits({ int: 6, frac: 2 }),
		rules.comma()
	]
});

// まとめて解除
// group.detach();

// 全部 valid なら true
// group.isValid();

// 全部のエラーを集約して取得
// group.getErrors();

// 個別 Guard 配列が欲しい場合
// const guards = group.getGuards();
```

`attachAll()` は `GuardGroup` を返します。

- `detach()`：全て解除
- `isValid()`：全て valid なら true
- `getErrors()`：全てのエラーを集約
- `getGuards()`：個別の `Guard[]` を返す

### 3) autoAttach（data属性から自動で適用）

HTML側に `data-jpig-*` を書いておき、JS側では `autoAttach()` を呼ぶだけで適用できます。

```html
<input
	class="price"
	name="price"
	data-jpig-rules-numeric
	data-jpig-rules-numeric-allow-full-width="true"
	data-jpig-rules-numeric-allow-minus="true"
	data-jpig-rules-numeric-allow-decimal="true"
	data-jpig-rules-digits
	data-jpig-rules-digits-int="6"
	data-jpig-rules-digits-frac="2"
	data-jpig-rules-digits-overflow-input-int="block"
	data-jpig-rules-digits-overflow-input-frac="block"
	data-jpig-rules-digits-fix-frac-on-blur="round"
	data-jpig-rules-comma
/>
```

```js
import { autoAttach } from "jp-input-guard";

// document 全体を対象に自動適用
const guards = autoAttach();

// 動的追加したコンテナだけ適用したい場合
// autoAttach(container);
```

`autoAttach()` は attachした `GuardGroup` を返します。

- 既に `data-jpig-attached` が付いている要素はスキップします
- `data-jpig-rules-*` を読み取って `rules` に変換します

## ルール

現在のルール例（公開API：`rules.xxx(...)`）：

- `rules.numeric(...)`：数値入力の正規化（全角→半角、記号統一、不要文字除去）
- `rules.digits(...)`：整数部/小数部の桁数チェック、確定時の穏やか補正、入力ブロック
- `rules.comma()`：確定時のカンマ付与（表示整形）

## ライセンス

MIT
