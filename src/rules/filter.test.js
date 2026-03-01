// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { filter } from "./filter.js";

/**
 * GuardContext の最小モックを作る（digits のテストと同系統）
 */
function createCtx() {
	return {
		errors: [],
		revert: null,

		pushError(e) {
			this.errors.push(e);
		},

		requestRevert(r) {
			this.revert = r;
		}
	};
}

test("filter - filter(): rule shape（name/targets/normalizeChar/validate）", () => {
	const rule = filter();

	assert.equal(rule.name, "filter");
	assert.deepEqual(rule.targets, ["input", "textarea"]);
	assert.equal(typeof rule.normalizeChar, "function");
	assert.equal(typeof rule.validate, "function");
});

test("filter - normalizeChar: オプション未指定（hasAny=false）のときは何もせず値を返す", () => {
	const rule = filter();

	assert.equal(rule.normalizeChar("Abc123アイウ😀", {}), "Abc123アイウ😀");

	const ctx = createCtx();
	rule.validate("Abc", ctx);
	assert.equal(ctx.errors.length, 0);
});

test("filter - normalizeChar: mode=drop + category=digits は数字以外を落とす", () => {
	const rule = filter({ mode: "drop", category: ["digits"] });

	assert.equal(rule.normalizeChar("a1b2c3", {}), "123");
	assert.equal(rule.normalizeChar("１２３", {}), ""); // 全角数字は digits ではない（ASCII 0-9のみ）
});

test("filter - normalizeChar: mode=drop + category=alpha は英字以外を落とす", () => {
	const rule = filter({ mode: "drop", category: ["alpha-lower", "alpha-upper"] });

	assert.equal(rule.normalizeChar("a1B2c3-", {}), "aBc");
});

test("filter - normalizeChar: mode=drop + category=ascii は可視ASCIIだけ通す（絵文字や全角は落ちる）", () => {
	const rule = filter({ mode: "drop", category: ["ascii"] });

	assert.equal(rule.normalizeChar("ABC xyz 123", {}), "ABC xyz 123");
	assert.equal(rule.normalizeChar("ＡＢＣ", {}), ""); // 全角は U+0020–U+007E ではない
	assert.equal(rule.normalizeChar("abc😀def", {}), "abcdef");
});

test("filter - normalizeChar: mode=drop + category=hiragana はひらがなだけ通す", () => {
	const rule = filter({ mode: "drop", category: ["hiragana"] });

	assert.equal(rule.normalizeChar("あアaい1う", {}), "あいう");
});

test("filter - normalizeChar: mode=drop + category=katakana-full は全角カタカナだけ通す", () => {
	const rule = filter({ mode: "drop", category: ["katakana-full"] });

	assert.equal(rule.normalizeChar("あアｱaイ", {}), "アイ");
});

test("filter - normalizeChar: mode=drop + category=katakana-half は半角カタカナだけ通す", () => {
	const rule = filter({ mode: "drop", category: ["katakana-half"] });

	assert.equal(rule.normalizeChar("ｱアイaｲ", {}), "ｱｲ");
});

test("filter - normalizeChar: mode=drop + category=bmp-only は補助平面（絵文字など）を落とす", () => {
	const rule = filter({ mode: "drop", category: ["bmp-only"] });

	assert.equal(rule.normalizeChar("A😀B", {}), "AB");
	assert.equal(rule.normalizeChar("漢字", {}), "漢字");
});

test("filter - normalizeChar: mode=drop + category=single-codepoint-only は結合文字を落とす", () => {
	const rule = filter({ mode: "drop", category: ["single-codepoint-only"] });

	// "e\u0301" は 1グラフェムが複数コードポイントになりやすい（結合文字）
	assert.equal(rule.normalizeChar("e\u0301", {}), "");
	// 単一コードポイントの文字は通る
	assert.equal(rule.normalizeChar("é", {}), "é");
});

test("filter - normalizeChar: category=sjis-only は Shift_JIS（正規面）で表現できる文字だけ通す", () => {
	const rule = filter({ mode: "drop", category: ["sjis-only"] });

	// ASCII は通る（cp932code < 0x100 扱いで true）
	assert.equal(rule.normalizeChar("ABC123", {}), "ABC123");

	// 半角カナも通る（cp932code < 0x100）
	assert.equal(rule.normalizeChar("ｱｲｳ", {}), "ｱｲｳ");

	// 代表的なJIS文字（ここは通るはず）
	assert.equal(rule.normalizeChar("あいう漢字", {}), "あいう漢字");

	// CP932拡張っぽい文字（SJIS-only だと落ちることを期待）
	// ※あなたの CP932 実装が対応している前提。もし落ち方が違ったら候補文字を差し替え。
	assert.equal(rule.normalizeChar("髙﨑", {}), "");
	assert.equal(rule.normalizeChar("A髙B", {}), "AB");
});

test("filter - normalizeChar: category=cp932-only は CP932 で表現できる文字は通す", () => {
	const rule = filter({ mode: "drop", category: ["cp932-only"] });

	// ASCII / 半角カナ / JIS文字は当然通る
	assert.equal(rule.normalizeChar("ABC123", {}), "ABC123");
	assert.equal(rule.normalizeChar("ｱｲｳ", {}), "ｱｲｳ");
	assert.equal(rule.normalizeChar("あいう漢字", {}), "あいう漢字");

	// CP932拡張文字は cp932-only なら通るはず
	// ※あなたの CP932 実装が対応している前提
	assert.equal(rule.normalizeChar("髙﨑", {}), "髙﨑");
	assert.equal(rule.normalizeChar("A髙B", {}), "A髙B");
});

test("filter - normalizeChar: sjis-only / cp932-only ともに CP932 で表現できない文字（例: 絵文字）は落ちる", () => {
	{
		const rule = filter({ mode: "drop", category: ["sjis-only"] });
		assert.equal(rule.normalizeChar("A😀B", {}), "AB");
	}
	{
		const rule = filter({ mode: "drop", category: ["cp932-only"] });
		assert.equal(rule.normalizeChar("A😀B", {}), "AB");
	}
});

test("filter - validate: mode=error + sjis-only は SJIS外の文字が混ざるとエラー", () => {
	const rule = filter({ mode: "error", category: ["sjis-only"] });

	const ctx = {
		errors: [],
		revert: null,
		pushError(e) { this.errors.push(e); },
		requestRevert(r) { this.revert = r; }
	};

	rule.validate("A髙B", ctx);

	// sjis-only では "髙" が弾かれる想定
	assert.equal(ctx.errors.length, 1);
	assert.equal(ctx.errors[0].code, "filter.invalid_char");
	assert.equal(ctx.errors[0].rule, "filter");
	assert.equal(ctx.errors[0].phase, "validate");
	// detail.chars は Set 由来で順序は保証しない
	assert.ok(ctx.errors[0].detail.chars.includes("髙"));
});

test("filter - validate: mode=error + cp932-only は CP932外の文字が混ざるとエラー", () => {
	const rule = filter({ mode: "error", category: ["cp932-only"] });

	const ctx = {
		errors: [],
		revert: null,
		pushError(e) { this.errors.push(e); },
		requestRevert(r) { this.revert = r; }
	};

	rule.validate("A😀B", ctx);

	assert.equal(ctx.errors.length, 1);
	assert.equal(ctx.errors[0].code, "filter.invalid_char");
	assert.ok(ctx.errors[0].detail.chars.includes("😀"));
});

test("filter - normalizeChar: allow を追加許可として扱う（category で落ちるものも allow で通る）", () => {
	// digits だけ許可しつつ、"." は追加許可
	const rule = filter({ mode: "drop", category: ["digits"], allow: "\\.", allowFlags: "u" });

	assert.equal(rule.normalizeChar("1.23a", {}), "1.23");
});

test("filter - normalizeChar: deny は除外（差集合）として扱う（denyOnly も含む）", () => {
	// denyOnly: deny に当たるものだけ落とす（他は全部通す）
	const rule = filter({ mode: "drop", deny: "[0-9]", denyFlags: "u" });

	assert.equal(rule.normalizeChar("a1b2c3", {}), "abc");
	assert.equal(rule.normalizeChar("アイウ😀", {}), "アイウ😀"); // deny に当たらないものは全部通る
});

test("filter - normalizeChar: deny がある場合、category/allow より優先して落とす", () => {
	// ascii を許可しつつ、"x" は除外
	const rule = filter({ mode: "drop", category: ["ascii"], deny: "x", denyFlags: "u" });

	assert.equal(rule.normalizeChar("axbx", {}), "ab");
});

test("filter - normalizeChar: mode=error のときは落とさず素通し", () => {
	const rule = filter({ mode: "error", category: ["digits"] });

	assert.equal(rule.normalizeChar("a1b2", {}), "a1b2");
});

test("filter - validate: mode=drop のときはエラーを積まない", () => {
	const rule = filter({ mode: "drop", category: ["digits"] });
	const ctx = createCtx();

	rule.validate("a1b2", ctx);

	assert.equal(ctx.errors.length, 0);
});

test("filter - validate: mode=error のとき、不正文字があればエラーを積む（空文字は何もしない）", () => {
	const rule = filter({ mode: "error", category: ["digits"] });

	{
		const ctx = createCtx();
		rule.validate("", ctx);
		assert.equal(ctx.errors.length, 0);
	}

	{
		const ctx = createCtx();
		rule.validate("a1b2", ctx);

		assert.equal(ctx.errors.length, 1);
		assert.equal(ctx.errors[0].code, "filter.invalid_char");
		assert.equal(ctx.errors[0].rule, "filter");
		assert.equal(ctx.errors[0].phase, "validate");

		// detail
		assert.equal(ctx.errors[0].detail.count, 2); // a,b の2文字が不正
		assert.ok(Array.isArray(ctx.errors[0].detail.chars));
		assert.deepEqual(ctx.errors[0].detail.category, ["digits"]);
		assert.equal(ctx.errors[0].detail.hasAllow, false);
		assert.equal(ctx.errors[0].detail.hasDeny, false);

		// chars は Set 経由なのでユニーク（順序は保証しない）
		const set = new Set(ctx.errors[0].detail.chars);
		assert.ok(set.has("a"));
		assert.ok(set.has("b"));
	}
});

test("filter - validate: invalidChars はユニークで、最大20件までに抑制される", () => {
	const rule = filter({ mode: "error", category: ["digits"] });
	const ctx = createCtx();

	// 不正文字を 25 種類入れる（digits 以外の ASCII 記号を並べる）
	const invalid = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"; // 30種くらい
	rule.validate("1" + invalid + "2", ctx);

	assert.equal(ctx.errors.length, 1);
	assert.ok(ctx.errors[0].detail.count >= 25);

	// chars はユニークで最大20
	assert.ok(ctx.errors[0].detail.chars.length <= 20);
	assert.equal(new Set(ctx.errors[0].detail.chars).size, ctx.errors[0].detail.chars.length);
});

test("filter - allowFlags/denyFlags: g/y は除去され、lastIndex の罠が起きない（同じ入力を複数回処理しても結果がぶれない）", () => {
	// allow に /g を付けても stripStatefulFlags で除去される想定
	const rule = filter({ mode: "drop", allow: ".", allowFlags: "gu" });

	const a = rule.normalizeChar("abc", {});
	const b = rule.normalizeChar("abc", {});
	assert.equal(a, "abc");
	assert.equal(b, "abc");
});

test("filter - fromDataset: data-tig-rules-filter が無い場合は null を返す", () => {
	const dataset = {};
	const rule = filter.fromDataset(dataset, null);

	assert.equal(rule, null);
});

test("filter - fromDataset: mode/category/allow/deny が反映される（空文字は未指定扱いで無視）", () => {
	const dataset = {
		tigRulesFilter: "",
		tigRulesFilterMode: "drop",
		tigRulesFilterCategory: "digits, alpha-lower, alpha-upper, invalid",
		tigRulesFilterAllow: "   \\.   ", // "." を追加許可（trimされる）
		tigRulesFilterAllowFlags: " gu ", // g は除去される想定（u は残る）
		tigRulesFilterDeny: "  a  ", // "a" は除外
		tigRulesFilterDenyFlags: "g" // g は除去される
	};

	const rule = filter.fromDataset(dataset, null);
	assert.ok(rule);

	// digits ∪ alpha ∪ "." から、deny="a" を除外
	assert.equal(rule.normalizeChar("a1b.2c", {}), "1b.2c");
});

test("filter - fromDataset: mode=error のとき validate が動作する", () => {
	const dataset = {
		tigRulesFilter: "",
		tigRulesFilterMode: "error",
		tigRulesFilterCategory: "digits"
	};

	const rule = filter.fromDataset(dataset, null);
	assert.ok(rule);

	const ctx = createCtx();
	rule.validate("a1", ctx);

	assert.equal(ctx.errors.length, 1);
	assert.equal(ctx.errors[0].code, "filter.invalid_char");
});

test("filter - fromDataset: _el 引数は未使用だが渡しても問題ない", () => {
	const dataset = { tigRulesFilter: "" };

	assert.doesNotThrow(() => {
		filter.fromDataset(dataset, { dummy: true });
	});
});
