---
layout: home

hero:
    name: TextInputGuard
    text: 入力フロー設計ライブラリ
    tagline: 日本語入力環境に最適化されたテキスト入力ガード
    actions:
        - theme: brand
          text: Get Started
          link: /concept
        - theme: alt
          text: Demo
          link: /demo
        - theme: alt
          text: GitHub
          link: https://github.com/natade-jp/text-input-guard
---

TextInputGuard は、日本語入力環境を前提に設計された入力フロー制御ライブラリです。

`<input>` / `<textarea>` に対して、全角混在・桁数制限・小数処理・表示整形など、日本語環境特有の数値入力制御を扱いやすい形で提供します。

業務系フォームや金額入力など、IMEの影響を受けやすい入力欄でも、表示用の値と送信用の値を分離しながら安定した制御を行えます。

## 特徴

- 全角数字・記号の自動正規化（全角 → 半角）
- 整数部／小数部の桁数制御
- 入力時ブロックと確定時補正の選択
- 表示値と送信用値の分離
- data属性からの自動適用対応

## インストール

```bash
npm i text-input-guard
```

## 使い方

### 1) attach（単一要素に適用）

最も基本的な使い方です。1つの要素に対してガードを適用します。

```js
import { attach, rules } from "text-input-guard";

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
```

### Guard API

`attach()` が返す `Guard` は、利用者が触れる公開インターフェースです。

- `detach()`
  ガード解除（イベント削除・swap復元）

- `isValid()`
  現在エラーが無いかどうか

- `getErrors()`
  エラー一覧を取得

- `getRawValue()`
  送信用の正規化済み値を取得（表示整形は含まれません）

- `getDisplayValue()`
  ユーザーが実際に操作している表示値を取得

- `getRawElement()`
  送信用の正規化済み値を保持する要素を取得

- `getDisplayElement()`
  ユーザーが実際に操作している要素を取得
  swap構成時は表示専用要素になります

例：

```js
if (!guard.isValid()) {
	console.log(guard.getErrors());
}

const raw = guard.getRawValue();
const display = guard.getDisplayValue();
```

### 2) attachAll（複数要素にまとめて適用）

`querySelectorAll()` の戻り値に対してまとめて適用できます。

```js
import { attachAll, rules } from "text-input-guard";

const group = attachAll(document.querySelectorAll(".tig-price"), {
	rules: [
		rules.numeric({ allowFullWidth: true, allowMinus: true, allowDecimal: true }),
		rules.digits({ int: 6, frac: 2 }),
		rules.comma()
	]
});
```

`attachAll()` は `GuardGroup` を返します。

- `detach()`：全て解除
- `isValid()`：全て valid なら true
- `getErrors()`：全てのエラーを集約
- `getGuards()`：個別の `Guard[]` を取得

### 3) autoAttach（data属性から自動適用）

HTML側に `data-tig-*` を定義し、JS側で `autoAttach()` を呼ぶだけで適用できます。

```html
<input
	class="price"
	name="price"
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
/>
```

```js
import { autoAttach } from "text-input-guard";

const guards = autoAttach();

// 動的追加したコンテナだけ適用する場合
// autoAttach(container);
```

`autoAttach()` は attach した `GuardGroup` を返します。

- 既に `data-tig-attached` が付いている要素はスキップします
- `data-tig-rules-*` を読み取り、内部で `rules` に変換します

## ルール

公開API：`rules.xxx(...)`

- `rules.numeric(...)`
  数値入力の正規化（全角 → 半角、記号統一、不要文字除去）

- `rules.digits(...)`
  整数部／小数部の桁数制御、入力ブロック、確定時補正

- `rules.comma()`
  確定時のカンマ付与（表示整形）

※ルールは配列順に実行されます。表示整形系は最後に配置することを推奨します。

## License

MIT
