# JP Input Guard – Rule Design Guide

このドキュメントはルール作成者向けのガイドです。

## ルールの構造

ルールは以下のフェーズを任意で実装できます。

- `normalizeChar(value, ctx)`
- `normalizeStructure(value, ctx)`
- `validate(value, ctx)`
- `fix(value, ctx)`
- `format(value, ctx)`

すべてを実装する必要はありません。

## 各フェーズの役割

### `normalizeChar`

文字単位の正規化。

例:

- 全角 → 半角
- 記号統一
- カンマ除去
- 不要文字削除

ここでは「文字変換のみ」を行います。  
入力拒否は行いません（`ctx.requestRevert()` は使用しない）。

### `normalizeStructure`

値全体の構造を整える。

例:

- `"-"` は先頭のみ
- `"."` は1つのみ
- 不正な位置の記号除去

ここも「構造整形」が目的です。

### `validate`

値がルールに違反していないか判定します。

使用できるAPI:

- `ctx.pushError()`
- `ctx.requestRevert()`

使い分け:

- `pushError` … エラー表示のみ
- `requestRevert` … 入力ブロック

原則として `requestRevert()` は `validate` 内でのみ使用します。

### `fix`（確定時のみ）

`blur` 時に実行される穏やかな補正。

例:

- `"-"` → `""`
- `"12."` → `"12"`
- `".1"` → `"0.1"`
- 小数丸め
- 桁超過の切り捨て

入力中には実行されません。

### `format`（確定時のみ）

表示専用整形。

例:

- カンマ付与
- 表示形式変換

`swap` モード時は display のみに適用されます。

## ルール作成時の指針

### 1. 責務を混ぜない

- 文字変換は `normalizeChar`
- 構造整理は `normalizeStructure`
- 判定は `validate`
- 補正は `fix`
- 表示整形は `format`

役割を跨がないこと。

### 2. 入力中のUXを壊さない

- 入力中に `format` を行わない
- 不要な強制補正を避ける

### 3. `requestRevert` は慎重に使う

`ctx.requestRevert()` は入力を巻き戻します。

以下のケースに限定することが望ましい:

- 明確な入力禁止
- 桁溢れの即時ブロック

単なるエラー表示は `ctx.pushError()` を使用します。

### 4. raw値を壊さない

`format` は表示専用です。

送信値は常に整形前のraw値を維持すること。

## フェーズ実行順

### 入力中

1. `normalizeChar`
2. `normalizeStructure`
3. `validate`

### 確定時（blur）

1. `normalizeChar`
2. `normalizeStructure`
3. `validate`
4. `fix`
5. `validate`（再評価）
6. `format`

ルールは「単機能・小さく」作ることを推奨します。
