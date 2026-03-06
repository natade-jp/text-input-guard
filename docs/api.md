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

## 戻り値／引数の詳細

### AttachOptions

`attach()` に渡す設定オプションです。  
入力のルール・エラー表示・コールバックなどを指定できます。

| option         | type                               | default        | 説明                                                                                                                |
| -------------- | ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `rules`        | `Rule[]`                           | `[]`           | 適用するルール配列。配列の順番が各フェーズ内での実行順になります。                                                  |
| `warn`         | `boolean`                          | `true`         | 非対応ルールや不正な設定があった場合に `console.warn` を出力するかどうか。                                          |
| `invalidClass` | `string`                           | `"is-invalid"` | エラーが存在する場合に `displayElement` に付与される CSS クラス名。                                                 |
| `onValidate`   | `(result: ValidateResult) => void` | -              | バリデーション評価が完了した際に呼び出されるコールバック。入力中 (`input`) と確定時 (`commit`) の両方で呼ばれます。 |

### Guard

`attach()` が返す `Guard` の公開メソッドです。

#### detach()

```ts
detach(): void
```

ガードを解除します。

- イベントリスナーを削除
- `swap` モード時は元の状態に復元

```js
guard.detach();
```

#### isValid()

```ts
isValid(): boolean
```

現在エラーが無い場合は `true` を返します。

```js
guard.isValid();
```

#### getErrors()

```ts
getErrors(): TigError[]
```

現在のエラー一覧を返します。
返却値はコピーであり、外部から直接変更できません。

```js
guard.getErrors();
```

#### getRawValue()

```ts
getRawValue(): string
```

送信用の値（正規化済み値）を取得します。

- `swap` モード時は hidden 側の値
- 通常モード時は表示要素の値

```js
guard.getRawValue();
```

#### getDisplayValue()

```ts
getDisplayValue(): string
```

ユーザーが実際に操作している要素の値を取得します。

```js
guard.getDisplayValue();
```

#### getRawElement()

```ts
getRawElement(): HTMLInputElement | HTMLTextAreaElement
```

送信用の要素を取得します。

- `swap` モード時は hidden 要素
- 通常モード時は元の要素

```js
guard.getRawElement();
```

#### getDisplayElement()

```ts
getDisplayElement(): HTMLInputElement | HTMLTextAreaElement
```

ユーザーが操作している表示用要素を取得します。

```js
guard.getDisplayElement();
```

#### evaluate()

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

#### commit()

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

#### setValue()

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

### GuardGroup

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

### onValidate

`onValidate` は評価完了時に呼び出され、現在のエラー状態を受け取ることができます。  
エラーが存在しない場合でも呼び出されます。

コールバックには `ValidateResult` が渡されます。

| property  | type                  | 説明                                    |
| --------- | --------------------- | --------------------------------------- |
| `guard`   | `Guard`               | この結果を発生させた Guard インスタンス |
| `source`  | `"input" \| "commit"` | 評価が実行されたタイミング              |
| `errors`  | `TigError[]`          | 発生しているエラー一覧                  |
| `isValid` | `boolean`             | エラーが存在しない場合 `true`           |

### TigError

バリデーションエラーを表すオブジェクトです。  
ルールの評価中に制約違反が発生した場合に生成されます。

エラーは以下の方法で取得できます。

- `guard.getErrors()`
- `onValidate` コールバック

#### 構造

| property | type        | 説明                           |
| -------- | ----------- | ------------------------------ |
| `code`   | `string`    | エラー識別子                   |
| `rule`   | `string`    | エラーを発生させたルール名     |
| `phase`  | `PhaseName` | エラーが発生したフェーズ       |
| `detail` | `any`       | エラーの追加情報（制限値など） |

#### code

`code` は `"rule.reason"` 形式の文字列です。

例

| code                   | 説明                               |
| ---------------------- | ---------------------------------- |
| `length.max_overflow`  | 最大文字数を超えている             |
| `width.max_overflow`   | 表示幅の制限を超えている           |
| `bytes.max_overflow`   | バイト数の制限を超えている         |
| `digits.int_overflow`  | 整数部の桁数を超えている           |
| `digits.frac_overflow` | 小数部の桁数を超えている           |
| `filter.invalid_char`  | 許可されていない文字が含まれている |

#### phase

エラーが発生した処理フェーズを表します。
通常バリデーションで発生します。

| phase                | 説明             |
| -------------------- | ---------------- |
| `normalizeChar`      | 文字単位の正規化 |
| `normalizeStructure` | 構造の正規化     |
| `validate`           | バリデーション   |
| `fix`                | 確定時の補正     |
| `format`             | 表示フォーマット |

#### detail

`detail` にはエラーの追加情報が格納されます。

##### 文字数制限系

制限エラーでは以下の形式になります。

| property | type     | 説明                 |
| -------- | -------- | -------------------- |
| `limit`  | `number` | 設定されている制限値 |
| `actual` | `number` | 実際の値             |

例

```json
{
	"code": "length.max_overflow",
	"rule": "length",
	"phase": "validate",
	"detail": {
		"limit": 10,
		"actual": 12
	}
}
```

##### filter

`filter.invalid_char` の場合は以下の情報が含まれます。

| property   | type       | 説明                                 |
| ---------- | ---------- | ------------------------------------ |
| `count`    | `number`   | 不正文字の総数                       |
| `chars`    | `string[]` | 検出された不正文字                   |
| `category` | `string[]` | 許可カテゴリ                         |
| `hasAllow` | `boolean`  | `allow` オプションが指定されているか |
| `hasDeny`  | `boolean`  | `deny` オプションが指定されているか  |

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

**例**

```js
rules.kana({
	target: "katakana-full"
});
```

**オプション**

| option   | type                                               | default           | 説明                                                     |
| -------- | -------------------------------------------------- | ----------------- | -------------------------------------------------------- |
| `target` | `"katakana-full" \| "katakana-half" \| "hiragana"` | `"katakana-full"` | 統一先                                                   |
| `nfkc`   | `boolean`                                          | `true`            | 事前に Unicode NFKC 正規化を行う（合体文字などを正規化） |

#### `imeOff()`

ASCII入力欄に日本語IMEで入った文字を、IMEオフ入力相当の ASCII 文字へ寄せます。

主に次のような文字を変換します。

- `、` → `,`
- `。` → `.`
- `「` → `[`
- `」` → `]`
- `￥` → `\`
- 全角ASCII (`ＡＢＣ１２３！` など) → 半角ASCII

**例**

```js
rules.imeOff();
```

**補足**

- 単なる「半角化」ではなく、日本語IME入力で入りやすい文字を ASCII 入力向けに矯正するルールです。
- IMEのデフォルトをOFFにする `inputmode="url"` と併用することを推奨します。

#### `ascii()`

ASCII範囲へ正規化します（カナは対象外）。
全角英数字・全角記号・全角スペースなどを半角ASCIIへ正規化し、必要に応じて英字の大文字/小文字を統一します。

**例**

```js
rules.ascii();
```

**オプション**

| option | type                           | default  | 説明   |
| ------ | ------------------------------ | -------- | ------ |
| `case` | `"none" \| "upper" \| "lower"` | `"none"` | 統一先 |

**補足**

- `ascii()` は ASCII 相当文字の半角化・英字統一を行うルールです。
- `、` や `。` などは `ascii()` だけでは ASCII の `,` や `.` になりません。これらも半角にしたい場合、先に `imeOff()` で ASCII 入力相当に寄せ、その後に `ascii()` を適用する組み合わせをおすすめします。

#### `filter()`

許可/禁止文字の制御を行います。

**例**

```js
rules.filter({
	category: ["digits"],
	mode: "error"
});
```

**オプション**

| option       | type                | default  | 説明                                                            |
| ------------ | ------------------- | -------- | --------------------------------------------------------------- |
| `category`   | `FilterCategory[]`  | -        | 許可カテゴリ（配列）                                            |
| `mode`       | `"drop" \| "error"` | `"drop"` | 不許可文字の扱い（drop: 削除 / error: 削除せずエラーを積む）    |
| `allow`      | `RegExp \| string`  | -        | 追加で許可する正規表現（1文字にマッチさせる想定）               |
| `allowFlags` | `string`            | -        | `allow` が文字列のときの flags（`"iu"` など。`g` / `y` は無視） |
| `deny`       | `RegExp \| string`  | -        | 除外する正規表現（1文字にマッチさせる想定）                     |
| `denyFlags`  | `string`            | -        | `deny` が文字列のときの flags（`"iu"` など。`g` / `y` は無視）  |

**補足**

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

**運用上の注意**

- `allow` / `deny` は「1文字にマッチさせる想定」です。長さをまたぐパターンを入れると意図とズレる可能性があります。
- `allow` / `deny` を文字列で渡す場合に、flags を分けて指定したいときは `allowFlags` / `denyFlags` を使います（`g` / `y` は無視されます）。

#### `trim()`

前後の空白を削除します。

```js
rules.trim();
```

#### `length()`

入力値の最大長を制御します。単位は「グラフェム」「UTF-16コード単位」「UTF-32コード単位」から選べます。

**例**

```js
rules.length({
	max: 10,
	mode: "block",
	unit: "grapheme"
});
```

**オプション**

| option | type                                 | default      | 説明                                                                                      |
| ------ | ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| `max`  | `number`                             | -            | 最大長。未指定なら制限なし                                                                |
| `mode` | `"block" \| "error"`                 | `"block"`    | 最大長を超えたときの挙動（`block`: 超過分を入力時にカット / `error`: 変更せずエラー扱い） |
| `unit` | `"grapheme" \| "utf-16" \| "utf-32"` | `"grapheme"` | 長さの単位                                                                                |

**補足**

- `"grapheme"`: 見た目の「1文字」単位に近い数え方（結合文字や絵文字シーケンスをまとめて扱う想定）
- `"utf-16"`: UTF-16コード単位で数えます。サロゲートペアは 2 として数えられます。
- `"utf-32"`: コードポイント単位（例：`"é"` は 2 になる）

**運用上の注意**

- `"utf-16"` は JavaScript の `string.length` と同じ数え方であり、HTML の `maxlength` 属性と実質的に同じ動作になります。既存の `maxlength` と揃えたい場合は `"utf-16"` を選ぶと挙動が一致します。
- `"utf-16"` を選ぶと、絵文字などのサロゲートペアは「2」としてカウントされます。
- `"utf-32"` は結合文字（ダイアクリティカルマーク等）や異体字セレクタを含むと 2 以上になりやすいです。
- ユーザー体験を優先するなら `"grapheme"`、既存Web仕様との互換性を優先するなら `"utf-16"`、コードポイント単位で厳密に制御したい場合は `"utf-32"` が向いています。

#### `width()`

入力値の最大幅を制御します。半角は 1、全角は 2 として数えます（0幅要素も考慮）。

**例**

```js
rules.width({
	max: 20,
	mode: "block"
});
```

**オプション**

| option | type                 | default   | 説明                                                                                      |
| ------ | -------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `max`  | `number`             | -         | 最大幅（半角=1、全角=2）。未指定なら制限なし                                              |
| `mode` | `"block" \| "error"` | `"block"` | 最大幅を超えたときの挙動（`block`: 超過分を入力時にカット / `error`: 変更せずエラー扱い） |

**補足**

数え方のルール

- 0幅: グラフェムを構成する要素（結合文字、異体字セレクタ、スキントーン修飾子、Tag Sequence 構成文字、`ZWSP` / `ZWNJ` / `ZWJ` / `WJ` など）
- 1幅: ASCII 文字、半角カタカナ、Regional Indicator（単体）
- 2幅: 上記以外

※ 目的が `Shift_JIS` 時代の半角全角に近いため、Unicode 公式の `EastAsianWidth.txt` は使っていません。

**運用上の注意**

- `width()` は「見た目の横幅」をざっくり揃える用途（氏名・住所・品名の“見た目の桁揃え”など）に向いています。
- 絵文字や異体字セレクタなどは 0幅要素を含むため、「見た目は 1 文字でも内部要素が複数」になりがちです。`length(unit: "grapheme")` と目的が近いですが、`width()` は半角全角の混在を強く意識したカウントになります。
- 「見た目を揃えたい」なら `width()`、「文字数を揃えたい」なら `length()` を選ぶのが基本です。

#### `bytes()`

入力値の最大サイズ（バイト数）を制御します。単位は `"utf-8" | "utf-16" | "utf-32" | "sjis" | "cp932"` から選べます。

**例**

```js
rules.bytes({
	max: 64,
	mode: "block",
	unit: "utf-8"
});
```

**オプション**

| option | type                                                   | default   | 説明                                                                                          |
| ------ | ------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------- |
| `max`  | `number`                                               | -         | 最大サイズ（バイト数）。未指定なら制限なし                                                    |
| `mode` | `"block" \| "error"`                                   | `"block"` | 最大サイズを超えたときの挙動（`block`: 超過分を入力時にカット / `error`: 変更せずエラー扱い） |
| `unit` | `"utf-8" \| "utf-16" \| "utf-32" \| "sjis" \| "cp932"` | `"utf-8"` | サイズの単位（バイト数の数え方）                                                              |

**補足**

- `"utf-8"`: UTF-8 にエンコードしたときのバイト数（ASCII=1、ひらがな/漢字は多くが 3、絵文字は 4 など）
- `"utf-16"`: UTF-16 のコードユニット数 × 2（サロゲートペアは 4 bytes）
- `"utf-32"`: コードポイント数 × 4（例：`"é"` は 8 bytes）
- `"sjis"` / `"cp932"`: Shift_JIS（Windows-31J 系）にエンコードしたときのバイト数
    - 「旧Windows互換」「Shift_JIS 前提の外部I/F」などに合わせる用途です。エンコード不能になるので、 `filter()`（`"sjis-only"` / `"cp932-only"` など）とセットで使用してください。

※ ライブラリ内部では Shift_JIS で算出します（sjis/cp932 の差異はフィルタ側の許可範囲で制御する想定）

**運用上の注意**

- DB カラムのバイト制限（例：`VARCHAR2(XX BYTE)` 相当）や、外部システムの「○○ bytes まで」制約に合わせたいときは `bytes()` が向いています。
- `"utf-8"` は実運用で一番遭遇しやすいバイト制限（API/DB/ログ/外部I/F）なので、迷ったらまず `"utf-8"` が無難です。
- 「ユーザー体験優先で自然に“文字数っぽく”止めたい」なら `length(unit: "grapheme")`、
  「見た目の桁揃え」なら `width()`、
  「外部制約（bytes）」に合わせたいなら `bytes()`、という棲み分けがしやすいです。

### 数値系

金額・数量など「数値として扱う入力」に使用します。

#### `numeric()`

数値入力の土台となるルールです。
全角→半角変換や、`-` / `.` の構造整理を行います。

**例**

```js
rules.numeric({
	allowFullWidth: true,
	allowMinus: true,
	allowDecimal: true
});
```

**オプション**

| option           | type      | default | 説明                               |
| ---------------- | --------- | ------- | ---------------------------------- |
| `allowFullWidth` | `boolean` | `true`  | 全角数字・記号を許可し半角へ正規化 |
| `allowMinus`     | `boolean` | `false` | `-` を許可（先頭のみ）             |
| `allowDecimal`   | `boolean` | `false` | `.` を許可（1つのみ）              |
| `allowEmpty`     | `boolean` | `true`  | 空文字を許可する                   |

**補足**

- `allowEmpty: false` の場合、確定時（blur）に空文字が `0` へ補正される想定です（`numeric` の fix フェーズ）。
- 整数入力の `inputmode="numeric"` 又は実数入力の `inputmode="decimal"` と併用することを推奨します。

#### `digits()`

桁数制限・丸め・入力超過時の挙動を制御します。

**例**

```js
rules.digits({
	int: 8,
	frac: 2,
	modeInt: "block",
	modeFrac: "block",
	fixFracOnBlur: "round",
	forceFracOnBlur: true
});
```

**オプション**

| option              | type                                                     | default   | 説明                                           |
| ------------------- | -------------------------------------------------------- | --------- | ---------------------------------------------- |
| `int`               | `number`                                                 | -         | 整数部の最大桁数（省略可）                     |
| `frac`              | `number`                                                 | -         | 小数部の最大桁数（省略可）                     |
| `countLeadingZeros` | `boolean`                                                | `false`   | 整数部の先頭ゼロを桁数に含める                 |
| `modeInt`           | `"block" \| "error"`                                     | `"block"` | 入力中：整数部が最大桁を超える入力の挙動       |
| `modeFrac`          | `"block" \| "error"`                                     | `"block"` | 入力中：小数部が最大桁を超える入力の挙動       |
| `fixIntOnBlur`      | `"none" \| "truncateLeft" \| "truncateRight" \| "clamp"` | `"none"`  | blur時の整数部補正                             |
| `fixFracOnBlur`     | `"none" \| "truncate" \| "round"`                        | `"none"`  | blur時の小数部補正                             |
| `forceFracOnBlur`   | `boolean`                                                | `false`   | blur時に小数部を必ず表示（`frac` 桁まで0埋め） |

**補足**

- `forceFracOnBlur: true` は、`frac` が指定されていることを前提に、小数部を `frac` 桁まで 0 埋めして表示する用途です。

#### `comma()`

整数部に3桁区切りカンマを付与します。

```js
rules.comma();
```

**補足**

- 確定時（blur）および表示整形フェーズで適用されます。
- 数値系ルールの最後に配置してください（`prefix` / `suffix` よりは前が基本）。

#### `prefix()`

表示用の先頭文字列を付与します。

```js
rules.prefix({ text: "¥" });
```

**オプション**

| option          | type      | default | 説明                 |
| --------------- | --------- | ------- | -------------------- |
| `text`          | `string`  | 必須    | 先頭に付ける文字列   |
| `showWhenEmpty` | `boolean` | `false` | 値が空でも表示するか |

#### `suffix()`

表示用の末尾文字列を付与します。

```js
rules.suffix({ text: "円" });
```

**オプション**

| option          | type      | default | 説明                 |
| --------------- | --------- | ------- | -------------------- |
| `text`          | `string`  | 必須    | 末尾に付ける文字列   |
| `showWhenEmpty` | `boolean` | `false` | 値が空でも表示するか |

## autoAttach 向け data 属性方法

`autoAttach()` では `data-tig-rules-ルール名` から始まるデータ属性を読み取り自動で設定できます。

`numeric` ルールを適用したい場合、まず `numeric` を付けてください。
さらに各オプションを続けて `allow-full-width` のようにケバブケースで記載します。省略した場合はデフォルトが使用されます。

オプションの `filter.category(["A", "B"])` のような文字列の配列を入れたい場合は、カンマ区切り `"A, B"`で入れてください。

**例**

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
