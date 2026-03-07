# Advanced Guide

このページでは、TextInputGuard の設計思想、内部アーキテクチャ、そしてルール作成者向けの設計指針を説明します。  
通常の利用者は [API](/api) を参照してください。

## 1. 設計思想

TextInputGuard は、日本語入力環境における入力課題を整理し、再利用可能な形で解決することを目的としたライブラリです。

単なる入力制限を行うだけでなく、

- 入力中のユーザー体験
- 確定後のデータ整合性

を分離して扱う設計を採用しています。

また、入力処理全体のフローを段階的に分解することで、挙動を予測しやすくし、拡張性を高めています。

### 1.1 日本語入力環境の構造的特性

日本語入力環境には、次のような技術的・歴史的背景があります。

- IME による未確定文字列の存在
- 全角／半角という表示幅の概念
- Shift_JIS / CP932 (Windows-31J) に代表されるマルチバイト文化
- 固定桁・固定幅を前提とした帳票文化
- バイト長を要件に含むレガシー業務システム

これらは単なる UI の問題ではなく、文字コード設計と業務設計の積み重ねによって形成された構造です。

英語圏では、入力値は原則として ASCII 互換の単純な文字集合を前提とし、多くのシステムは入力値を内部で正規化して吸収します。
そのため IME の ON/OFF や文字幅を強く意識する必要はほとんどありません。

一方、日本語入力環境では次のような問題が発生します。

- 数値入力欄に全角数字が入力される
- マイナス記号や小数点が複数の Unicode コードポイントで混在する
- IME 変換中に強制的な書き換えを行うとキャレット位置が崩れる

これらはユーザーの誤操作ではなく、入力環境に起因する問題です。

### 1.2 開発契機

これらの問題を回避するために、`pattern` 属性による入力制限や英語圏向けのライブラリを使用する方法があります。

しかし、これらの方法だけでは十分に解決できず、次のような問題が発生することがあります。

- 入力中に値を書き換えることでキャレット位置が飛ぶ
- IME の未確定状態を破壊してしまう
- 表示整形と内部値の同期が崩れる
- 期待通りの文字数制御が行えない

日本向けのライブラリとして `InputManJS` なども存在しますが、多機能である分、単一の input フィールドのために導入するにはコストが高く、気軽に利用できるものではありません。

これらの問題を解決するために、TextInputGuard を開発しました。

### 1.3 設計原則

TextInputGuard は、使用感と拡張性を両立するために次の設計原則を採用しています。

1. 入力中と確定時を分離する

    入力中はユーザー体験を優先し、最小限の正規化と検証のみを行います。  
    確定時（blur）にはデータ整合性を優先した補正処理を行います。

2. 表示とデータを分離する

    表示整形（format）と送信値を明確に分離することで、UI上の都合とデータ整合性を切り離します。

3. フェーズを明確に分解する
    - `normalizeChar`
    - `normalizeStructure`
    - `validate`
    - `fix`
    - `format`

    処理を段階的に分離することで、問題を起こしにくくし、挙動を予測可能にします。

## 2. アーキテクチャ設計

### 2.1 フェーズ分離設計

TextInputGuard では入力処理を次の5つのフェーズに分割しています。

1. `normalizeChar`
2. `normalizeStructure`
3. `validate`
4. `fix`（確定時のみ）
5. `format`（確定時のみ）

この分離により、

- 文字変換と構造整理を分離
- 判定処理と補正処理を分離
- 表示整形と送信値を分離

といった責務の明確化を実現しています。

### 2.2 エラーと入力キャンセルの分離

`validate` フェーズで行う **エラー表示** と **入力キャンセル** は別の概念として扱います。

`ctx.pushError()`

- エラー情報を記録する
- 入力自体は許可する

`ctx.requestRevert()`

- 入力をキャンセルする
- 直前の受理値へ巻き戻す

この分離により、UX設計の自由度を確保しています。

### 2.3 raw値と表示値の分離

通常、`input` 要素は1つだけですが、TextInputGuard では

- 表示用の値（display）
- 送信用の値（raw）

を分離することができます。ユーザーは display 側の `input` を操作し、form 送信時には raw 側の値が使用されます。
例えばカンマ区切りなどの表示整形を行う場合でも、送信時には整形前の値をそのまま利用できます。

この機能は `format` ルールが適用された場合に動作します。内部では次の処理が行われます。

1. HTML上の `input` を raw 用として hidden 化
2. 同一の display 用 `input` を新しく生成
3. 元の `input` の属性やイベントを display 用 `input` に移す（swap）

既存のデザインが崩れないように、`id` や `class` も display 側へ付け替えます。
そのため、後から `querySelector("#price")` のように id を指定して取得すると、送信用（raw）ではなく表示用（display）の `input` が取得されます。

swap を行った際、元の `id` と `class` は次の属性に保存されます。

- `data-tig-original-id`
- `data-tig-original-class`

例えば、以下の要素に対してカンマ区切りを有効化すると、

```html
<input id="price" class="price-class" type="text" inputmode="decimal" style="text-align: right" />
```

内部的には次のような構造になります。  
`hidden` になっている要素が、元の `input` 要素です。

```html
<input
	type="hidden"
	inputmode="decimal"
	style="text-align: right"
	data-tig-role="raw"
	data-tig-original-id="price"
	data-tig-original-class="price-class"
/>

<input
	type="text"
	data-tig-role="display"
	id="price"
	class="price-class"
	inputmode="decimal"
	style="text-align: right"
/>
```

送信用の値を取得したい場合は、次のいずれかを使用してください。

- TextInputGuard を適用する前に `querySelector` で要素を取得して保持する
- `document.querySelector("[data-tig-original-id]")`
- `getRawValue()`

### 2.4 キャレット保持

`normalizeChar` や `normalizeStructure` によって値が変更された場合でも、可能な限りキャレット位置を維持します。

正規化処理では左側のみを再評価することで、自然なカーソル位置を推定します。

### 2.5 IME対応

IME 入力を破壊しないため、次のルールを採用しています。

- `compositionstart` 中は評価を行わない
- `compositionend` 後に再評価する

## 3. ルール設計ガイド

ここからはルール作成者向けの内容です。

### 3.1 ルールの構造

ルールは次のフェーズを任意で実装できます。

- `normalizeChar(value, ctx)`
- `normalizeStructure(value, ctx)`
- `validate(value, ctx)`
- `fix(value, ctx)`
- `format(value, ctx)`

単機能で小さなルールを組み合わせる設計を推奨します。

### 3.2 各フェーズの役割

#### `normalizeChar`

文字単位の正規化を行います。

例

- 全角 → 半角
- 記号統一
- カンマ除去
- 不要文字削除

引数には、IME で確定した入力文字列が渡されます。

IME で入力確定した文字の一部分を消すといったルールが作成可能のため、
一部のルールではこのフェーズで文字削除を行います。

#### `normalizeStructure`

値全体の構造を整えます。

例

- `"-"` は先頭のみ許可
- `"."` は1つのみ許可

#### `validate`

ルール違反を判定します。

必要に応じて次の処理を実行できます。

- `ctx.pushError()`  
  エラーを記録する（入力は許可）

- `ctx.requestRevert()`  
  入力をキャンセルする（直前の受理値へ戻す）

#### `fix`（確定時のみ）

`blur` 時に実行される穏やかな補正処理です。

例

- `"-"` → `""`
- `"12."` → `"12"`
- `".1"` → `"0.1"`

#### `format`（確定時のみ）

表示専用の整形処理です。

例

- カンマ付与
- 表示形式変換

`swap` モードでは display 側のみに適用されます。

### 3.3 フェーズ実行順

入力中

1. `normalizeChar`
2. `normalizeStructure`
3. `validate`

確定時（`blur`）

1. `normalizeChar`
2. `normalizeStructure`
3. `validate`
4. `fix`
5. `validate`（再評価）
6. `format`（display 用）
