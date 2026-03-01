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

公開されているルール生成関数 `rules.xxx(...)` の仕様（オプション・挙動）をまとめます。
ルールは **配列順に実行** されます。

推奨の並び順

- 数値入力: `numeric()` → `digits()` → `comma()` → `prefix()` / `suffix()`
- 文字列入力: `ascii()` / `kana()` / `trim()` → `filter()`

表示整形系（`comma` / `prefix` / `suffix`）は、基本的に最後に置くのを推奨します。

### 文字列系

氏名・コード・メモなど「文字列として扱う入力」に使用します。

#### `kana()`

かな文字の正規化を行います。

```js
rules.kana({
	target: "katakana-full"
});
```

オプション

| option   | type                                               | default           | 説明                                                     |
| -------- | -------------------------------------------------- | ----------------- | -------------------------------------------------------- |
| `target` | `"katakana-full" \| "katakana-half" \| "hiragana"` | `"katakana-full"` | 統一先                                                   |
| `nfkc`   | `boolean`                                          | `true`            | 事前に Unicode NFKC 正規化を行う（合体文字などを正規化） |

#### `ascii()`

ASCII範囲へ正規化します（カナは対象外）。

```js
rules.ascii();
```

オプション

| option | type                           | default  | 説明   |
| ------ | ------------------------------ | -------- | ------ |
| `case` | `"none" \| "upper" \| "lower"` | `"none"` | 統一先 |

#### `filter()`

許可/禁止文字の制御を行います。

```js
rules.filter({
	category: ["digits"],
	mode: "error"
});
```

オプション

| option       | type                | default  | 説明                                                            |
| ------------ | ------------------- | -------- | --------------------------------------------------------------- |
| `category`   | `FilterCategory[]`  | -        | 許可カテゴリ（配列）                                            |
| `mode`       | `"drop" \| "error"` | `"drop"` | 不許可文字の扱い（drop: 削除 / error: 削除せずエラーを積む）    |
| `allow`      | `RegExp \| string`  | -        | 追加で許可する正規表現（1文字にマッチさせる想定）               |
| `allowFlags` | `string`            | -        | `allow` が文字列のときの flags（`"iu"` など。`g` / `y` は無視） |
| `deny`       | `RegExp \| string`  | -        | 除外する正規表現（1文字にマッチさせる想定）                     |
| `denyFlags`  | `string`            | -        | `deny` が文字列のときの flags（`"iu"` など。`g` / `y` は無視）  |

補足（`FilterCategory`）

`category` で指定できる値は次の通りです。

- `"digits"` : ASCII 数字 (`0-9`)
- `"alpha-upper"` : ASCII 英字大文字 (`A-Z`)
- `"alpha-lower"` : ASCII 英字小文字 (`a-z`)
- `"ascii"` : ASCII 可視文字 + スペース含む (`U+0020–U+007E`)
- `"hiragana"` : ひらがな (`U+3040–U+309F`)
- `"katakana-full"` : 全角カタカナ (`U+30A0–U+30FF`)
- `"katakana-half"` : 半角カタカナ (`U+FF65–U+FF9F`)
- `"bmp-only"` : BMP のみ許可（`U+0000–U+FFFF`、サロゲートペア禁止、補助平面禁止）
- `"sjis-only"` : 正規 Shift_JIS（JIS X 0208 + 1バイト領域）のみ許可
- `"cp932-only"` : Windows-31J (CP932) でエンコード可能な文字のみ許可
- `"single-codepoint-only"` : 単一コードポイントのみ許可（結合文字や異体字セレクタを含まない）

運用上の注意

- `allow` / `deny` は「1文字にマッチさせる想定」です。長さをまたぐパターンを入れると意図とズレる可能性があります。
- `allow` / `deny` を文字列で渡す場合に、flags を分けて指定したいときは `allowFlags` / `denyFlags` を使います（`g` / `y` は無視されます）。

#### `trim()`

前後の空白を削除します。

```js
rules.trim();
```

### 数値系

金額・数量など「数値として扱う入力」に使用します。

#### `numeric()`

数値入力の土台となるルールです。
全角→半角変換や、`-` / `.` の構造整理を行います。

例

```js
rules.numeric({
	allowFullWidth: true,
	allowMinus: true,
	allowDecimal: true
});
```

オプション

| option           | type      | default | 説明                               |
| ---------------- | --------- | ------- | ---------------------------------- |
| `allowFullWidth` | `boolean` | `true`  | 全角数字・記号を許可し半角へ正規化 |
| `allowMinus`     | `boolean` | `false` | `-` を許可（先頭のみ）             |
| `allowDecimal`   | `boolean` | `false` | `.` を許可（1つのみ）              |
| `allowEmpty`     | `boolean` | `true`  | 空文字を許可する                   |

補足

- `allowEmpty: false` の場合、確定時（blur）に空文字が `0` へ補正される想定です（`numeric` の fix フェーズ）。

#### `digits()`

桁数制限・丸め・入力超過時の挙動を制御します。

例

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

オプション

| option              | type                                                     | default  | 説明                                             |
| ------------------- | -------------------------------------------------------- | -------- | ------------------------------------------------ |
| `int`               | `number`                                                 | -        | 整数部の最大桁数（省略可）                       |
| `frac`              | `number`                                                 | -        | 小数部の最大桁数（省略可）                       |
| `countLeadingZeros` | `boolean`                                                | `false`  | 整数部の先頭ゼロを桁数に含める                   |
| `overflowInputInt`  | `"block" \| "none"`                                      | `"none"` | 入力中：整数部が最大桁を超える入力をブロックする |
| `overflowInputFrac` | `"block" \| "none"`                                      | `"none"` | 入力中：小数部が最大桁を超える入力をブロックする |
| `fixIntOnBlur`      | `"none" \| "truncateLeft" \| "truncateRight" \| "clamp"` | `"none"` | blur時の整数部補正                               |
| `fixFracOnBlur`     | `"none" \| "truncate" \| "round"`                        | `"none"` | blur時の小数部補正                               |
| `forceFracOnBlur`   | `boolean`                                                | `false`  | blur時に小数部を必ず表示（`frac` 桁まで0埋め）   |

補足

- `forceFracOnBlur: true` は、`frac` が指定されていることを前提に、小数部を `frac` 桁まで 0 埋めして表示する用途です。

#### `comma()`

整数部に3桁区切りカンマを付与します。

```js
rules.comma();
```

補足

- 確定時（blur）および表示整形フェーズで適用されます。
- 数値系ルールの最後に配置してください（`prefix` / `suffix` よりは前が基本）。

#### `prefix()`

表示用の先頭文字列を付与します。

```js
rules.prefix({ text: "¥" });
```

オプション

| option          | type      | default | 説明                 |
| --------------- | --------- | ------- | -------------------- |
| `text`          | `string`  | 必須    | 先頭に付ける文字列   |
| `showWhenEmpty` | `boolean` | `false` | 値が空でも表示するか |

#### `suffix()`

表示用の末尾文字列を付与します。

```js
rules.suffix({ text: "円" });
```

オプション

| option          | type      | default | 説明                 |
| --------------- | --------- | ------- | -------------------- |
| `text`          | `string`  | 必須    | 末尾に付ける文字列   |
| `showWhenEmpty` | `boolean` | `false` | 値が空でも表示するか |

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
