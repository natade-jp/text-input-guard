# API

このページは TextInputGuard の利用者向け API リファレンスです。  
基本的な使い方は [Getting Started](/getting-started)、実際の挙動は [Demo](/demo) を先に見ると理解しやすくなります。

## インポート

```js
import { attach, attachAll, autoAttach, rules } from "text-input-guard";
```

## エントリーポイント

### attach()

```ts
/**
 * @param {HTMLInputElement|HTMLTextAreaElement} element
 * @param {AttachOptions} [options]
 * @returns {Guard}
 */
declare function attach(element, options = {}): Guard;
```

単一の要素にガードを適用します。
戻り値は `Guard` オブジェクトです。

```js
const guard = attach(input, {
	rules: [
		rules.numeric({ allowFullWidth: true, allowMinus: true, allowDecimal: true }),
		rules.digits({ int: 8, frac: 2 }),
		rules.comma()
	]
});
```

### attachAll()

```ts
/**
 * @param {Iterable<HTMLInputElement|HTMLTextAreaElement>} elements
 * @param {AttachOptions} [options]
 * @returns {GuardGroup}
 */
declare function attachAll(
	elements: Iterable<HTMLInputElement | HTMLTextAreaElement>,
	options?: AttachOptions
): GuardGroup;
```

複数要素へ同一設定をまとめて適用します。
戻り値は `GuardGroup` オブジェクトです。

```js
const group = attachAll(document.querySelectorAll(".price"), {
	rules: [
		rules.numeric({ allowFullWidth: true, allowMinus: true, allowDecimal: true }),
		rules.digits({ int: 8, frac: 2 }),
		rules.comma()
	]
});
const guard = group.getGuards()[0];
```

### autoAttach()

```ts
/**
 * @param {Document|DocumentFragment|ShadowRoot|Element} [root=document]
 * @returns {GuardGroup}
 */
declare function autoAttach(root?: HTMLElement | Document): GuardGroup;
```

HTML の `data-tig-*` 属性からルールを読み取り、自動的に適用します。
戻り値は `GuardGroup` オブジェクトです。

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
/>
```

```js
const guards = autoAttach();
const guard = guards.getGuards()[0];
```

## Guard

`attach()` が返す `Guard` の公開メソッドです。

### detach()

```ts
detach(): void
```

ガードを解除します。

- イベントリスナーを削除
- `swap` モード時は元の状態に復元

```js
guard.detach();
```

### isValid()

```ts
isValid(): boolean
```

現在エラーが無い場合は `true` を返します。

```js
guard.isValid();
```

### getErrors()

```ts
getErrors(): TigError[]
```

現在のエラー一覧を返します。
返却値はコピーであり、外部から直接変更できません。

```js
guard.getErrors();
```

### getRawValue()

```ts
getRawValue(): string
```

送信用の値（正規化済み値）を取得します。

- `swap` モード時は hidden 側の値
- 通常モード時は表示要素の値

```js
guard.getRawValue();
```

### getDisplayValue()

```ts
getDisplayValue(): string
```

ユーザーが実際に操作している要素の値を取得します。

```js
guard.getDisplayValue();
```

### getRawElement()

```ts
getRawElement(): HTMLInputElement | HTMLTextAreaElement
```

送信用の要素を取得します。

- `swap` モード時は hidden 要素
- 通常モード時は元の要素

```js
guard.getRawElement();
```

### getDisplayElement()

```ts
getDisplayElement(): HTMLInputElement | HTMLTextAreaElement
```

ユーザーが操作している表示用要素を取得します。

```js
guard.getDisplayElement();
```

### evaluate()

```ts
evaluate(): void
```

入力中評価を手動実行します。

実行フェーズ:

1. `normalizeChar`
2. `normalizeStructure`
3. `validate`

通常は入力中、IME確定時に実行されます。

```js
guard.evaluate();
```

### commit()

```ts
commit(): void
```

確定評価を手動実行します。

実行フェーズ:

1. `normalizeChar`
2. `normalizeStructure`
3. `validate`
4. `fix`
5. `validate`（再評価）
6. `format`

通常は `blur` 時に自動実行されます。

### setValue()

```ts
setValue(value: string | number | null | undefined, mode?: "evaluate" | "commit"): void
```

値をプログラムから設定します。

- `value`
  `string | number | null | undefined`

- `mode`（省略可）
  `"none" | "input" | "commit"`（既定値 `"commit"`）

`null` や `undefined` は空文字として扱われます。
`NaN` や `Infinity` は空文字に変換されます。

```js
guard.setValue(1234);
guard.setValue("0012", "input");
guard.setValue("", "none");
```

## GuardGroup

`attachAll()` / `autoAttach()` が返す `GuardGroup` の公開メソッドです。

```js
/**
 * @typedef {Object} GuardGroup
 * @property {() => void} detach - 全部 detach
 * @property {() => boolean} isValid - 全部 valid なら true
 * @property {() => TigError[]} getErrors - 全部のエラーを集約
 * @property {() => Guard[]} getGuards - 個別Guard配列
 */
```

## TigError

バリデーションエラー情報を表すオブジェクトです。
エラーは `validate` フェーズで登録され、 `guard.getErrors();` で取得できます。

```js
/**
 * @typedef {Object} TigError
 * @property {string} code - エラー識別子（例: "digits.int_overflow"）
 * @property {string} rule - エラーを発生させたルール名
 * @property {PhaseName} phase - 発生したフェーズ
 * @property {any} [detail] - 追加情報（制限値など）
 */
```

## Rules

公開 API は `rules.xxx(...)` です。
ルールは配列順に実行されます。表示整形系は最後に配置することを推奨します。

### rules.numeric(options?)

```js
rules.numeric({
	allowFullWidth: true,
	allowMinus: true,
	allowDecimal: true
});
```

主なオプション

- `allowFullWidth` : boolean（default: true）
- `allowMinus` : boolean（default: false）
- `allowDecimal` : boolean（default: false）
- `allowEmpty` : boolean（default: true）

### rules.digits(options)

```js
rules.digits({
	int: 8,
	frac: 2,
	overflowInputInt: "block",
	overflowInputFrac: "block",
	fixFracOnBlur: "round",
	forceFracOnBlur: true
});
```

主なオプション

- `int` : number
- `frac` : number
- `overflowInputInt`
- `overflowInputFrac`
- `fixFracOnBlur`
- `forceFracOnBlur`

### rules.comma()

```js
rules.comma();
```

## autoAttach 向け data 属性方法

`autoAttach()` では `data-tig-rules-ルール名` から始まるデータ属性を読み取り自動で設定できます。

`numeric` ルールを適用したい場合、まず `numeric` を付けてください。
さらに各オプションを続けて `allow-full-width` のようにケバブケースで記載します。省略した場合はデフォルトが使用されます。

オプションの `filter.category(["A", "B"])` のような文字列の配列を入れたい場合は、カンマ区切り `"A, B"`で入れてください。

例

```html
<input
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
