// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { digits } from "./digits.js";

/**
 * GuardContext の最小モックを作る
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

test("digits - validate: int overflow（countLeadingZeros=true）でエラーが積まれる", () => {
	const rule = digits({ int: 2, modeInt: "error", modeFrac: "error", countLeadingZeros: true });
	const ctx = createCtx();

	rule.validate("001", ctx);

	assert.equal(ctx.revert, null);
	assert.equal(ctx.errors.length, 1);
	assert.equal(ctx.errors[0].code, "digits.int_overflow");
	assert.deepEqual(ctx.errors[0].detail, { limit: 2, actual: 3 });
});

test("digits - validate: int overflow（countLeadingZeros=false）だと 001 は 1桁扱いでOK", () => {
	const rule = digits({ int: 2, countLeadingZeros: false });
	const ctx = createCtx();

	rule.validate("001", ctx);

	assert.equal(ctx.revert, null);
	assert.equal(ctx.errors.length, 0);
});

test("digits - validate: modeInt=block のときは requestRevert してエラーは積まない", () => {
	const rule = digits({ int: 2, modeInt: "block" });
	const ctx = createCtx();

	rule.validate("123", ctx);

	assert.ok(ctx.revert);
	assert.equal(ctx.revert.reason, "digits.int_overflow");
	assert.deepEqual(ctx.revert.detail, { limit: 2, actual: 3 });
	assert.equal(ctx.errors.length, 0);
});

test("digits - validate: modeFrac=block のときは requestRevert", () => {
	const rule = digits({ frac: 2, modeFrac: "block" });
	const ctx = createCtx();

	rule.validate("1.234", ctx);

	assert.ok(ctx.revert);
	assert.equal(ctx.revert.reason, "digits.frac_overflow");
	assert.deepEqual(ctx.revert.detail, { limit: 2, actual: 3 });
	assert.equal(ctx.errors.length, 0);
});

test("digits - validate: 入力途中（空文字）は何もしない（errors/revert なし）", () => {
	const rule = digits({ int: 2, frac: 2 });
	const ctx = createCtx();

	rule.validate("", ctx);

	assert.equal(ctx.revert, null);
	assert.equal(ctx.errors.length, 0);
});

test("digits - validate: 入力途中（-）は何もしない（errors/revert なし）", () => {
	const rule = digits({ int: 2, frac: 2, allowMinus: true });
	const ctx = createCtx();

	rule.validate("-", ctx);

	assert.equal(ctx.revert, null);
	assert.equal(ctx.errors.length, 0);
});

test("digits - validate: 入力途中（.）は何もしない（errors/revert なし）", () => {
	const rule = digits({ int: 2, frac: 2 });
	const ctx = createCtx();

	rule.validate(".", ctx);

	assert.equal(ctx.revert, null);
	assert.equal(ctx.errors.length, 0);
});

test("digits - validate: 入力途中（-.）は何もしない（errors/revert なし）", () => {
	const rule = digits({ int: 2, frac: 2, allowMinus: true });
	const ctx = createCtx();

	rule.validate("-.", ctx);

	assert.equal(ctx.revert, null);
	assert.equal(ctx.errors.length, 0);
});

test("digits - validate: int/frac 両方 overflow（block なし）ならエラーが2件積まれる", () => {
	const rule = digits({
		int: 2,
		frac: 2,
		modeInt: "error",
		modeFrac: "error"
	});
	const ctx = createCtx();

	rule.validate("123.456", ctx);

	assert.equal(ctx.revert, null);
	assert.equal(ctx.errors.length, 2);

	// 順序に依存したくないので code で探す
	const codes = ctx.errors.map(e => e.code).sort();
	assert.deepEqual(codes, ["digits.frac_overflow", "digits.int_overflow"].sort());
});

test("digits - validate: int/frac 両方 overflow でも、block が優先され requestRevert して errors は積まない（int が先）", () => {
	const rule = digits({
		int: 2,
		frac: 2,
		modeInt: "block",
		modeFrac: "block"
	});
	const ctx = createCtx();

	rule.validate("123.456", ctx);

	assert.ok(ctx.revert);
	assert.equal(ctx.revert.reason, "digits.int_overflow");
	assert.deepEqual(ctx.revert.detail, { limit: 2, actual: 3 });
	assert.equal(ctx.errors.length, 0);
});

test("digits - validate: countLeadingZeros=false だと全部ゼロ '000' は 1桁扱いでOK", () => {
	const rule = digits({ int: 1, countLeadingZeros: false });
	const ctx = createCtx();

	rule.validate("000", ctx);

	assert.equal(ctx.revert, null);
	assert.equal(ctx.errors.length, 0);
});

test("digits - fix: 整数部 truncateLeft", () => {
	const rule = digits({ int: 3, fixIntOnBlur: "truncateLeft" });
	assert.equal(rule.fix("12345", createCtx()), "345");
});

test("digits - fix: 整数部 truncateRight", () => {
	const rule = digits({ int: 3, fixIntOnBlur: "truncateRight" });
	assert.equal(rule.fix("12345", createCtx()), "123");
});

test("digits - fix: 整数部 clamp", () => {
	const rule = digits({ int: 3, fixIntOnBlur: "clamp" });
	assert.equal(rule.fix("12345", createCtx()), "999");
});

test("digits - fix: 小数部 truncate（dot がある時だけ）", () => {
	const rule = digits({ frac: 2, fixFracOnBlur: "truncate" });
	assert.equal(rule.fix("1.234", createCtx()), "1.23");
});

test("digits - fix: 小数部 round（繰り上げなし）", () => {
	const rule = digits({ frac: 2, fixFracOnBlur: "round" });
	assert.equal(rule.fix("1.235", createCtx()), "1.24");
});

test("digits - fix: 小数部 round（繰り上げで整数が増える）", () => {
	const rule = digits({ frac: 2, fixFracOnBlur: "round" });
	assert.equal(rule.fix("9.999", createCtx()), "10.00");
});

test("digits - fix: frac=0 の場合はドットを消して返す（round で整数に反映）", () => {
	const rule = digits({ frac: 0, fixFracOnBlur: "round" });
	assert.equal(rule.fix("1.5", createCtx()), "2");
});

test("digits - fix: dot が無い値は frac 指定があってもそのまま（小数補正しない）", () => {
	const rule = digits({ frac: 2, fixFracOnBlur: "truncate" });
	assert.equal(rule.fix("123", createCtx()), "123");
});

test("digits - fix: frac 未指定（省略）の場合は dot があっても小数を落として返す", () => {
	const rule = digits({ int: 10 }); // frac は指定しない
	assert.equal(rule.fix("12.34", createCtx()), "12");
});

test("digits - fix: forceFracOnBlur=true なら dot が無い値でも frac 桁の .00 を付ける", () => {
	const rule = digits({ frac: 2, forceFracOnBlur: true });
	assert.equal(rule.fix("12", createCtx()), "12.00");
});

test("digits - fix: forceFracOnBlur=true なら '12.' のように小数部が空でも 0 埋めする", () => {
	const rule = digits({ frac: 2, forceFracOnBlur: true });
	assert.equal(rule.fix("12.", createCtx()), "12.00");
});

test("digits - fix: forceFracOnBlur=true なら '12.3' のように小数部が短い場合も 0 埋めする", () => {
	const rule = digits({ frac: 2, forceFracOnBlur: true });
	assert.equal(rule.fix("12.3", createCtx()), "12.30");
});

test("digits - fix: round の境界（小数側の繰り上げ連鎖） 1.995 -> 2.00", () => {
	const rule = digits({ frac: 2, fixFracOnBlur: "round" });
	assert.equal(rule.fix("1.995", createCtx()), "2.00");
});

test("digits - fromDataset: tigRulesDigits が無ければ null", () => {
	const rule = digits.fromDataset({}, /** @type {any} */ (null));
	assert.equal(rule, null);
});

test("digits - fromDataset: dataset オプションが反映される（validate & fix で確認）", () => {
	const dataset = {
		tigRulesDigits: "1", // ON
		tigRulesDigitsInt: "3",
		tigRulesDigitsFrac: "2",
		tigRulesDigitsCountLeadingZeros: "true",
		tigRulesDigitsFixIntOnBlur: "truncateLeft",
		tigRulesDigitsFixFracOnBlur: "truncate",
		tigRulesDigitsOverflowInputInt: "block",
		tigRulesDigitsOverflowInputFrac: "none"
	};

	const rule = digits.fromDataset(dataset, /** @type {any} */ (null));
	assert.ok(rule);

	// validate: int=3 で block
	const ctx = createCtx();
	rule.validate("1234", ctx);
	assert.ok(ctx.revert);
	assert.equal(ctx.revert.reason, "digits.int_overflow");

	// fix: int truncateLeft, frac truncate
	assert.equal(rule.fix("12345.678", createCtx()), "345.67");
});

test("digits - fromDataset: 不正な enum/number が来ても落ちずに rule が作れる（デフォルトにフォールバック）", () => {
	const dataset = {
		tigRulesDigits: "1",
		tigRulesDigitsInt: "abc", // 不正
		tigRulesDigitsFrac: "2",
		tigRulesDigitsFixIntOnBlur: "???", // 不正
		tigRulesDigitsFixFracOnBlur: "truncate"
	};

	const rule = digits.fromDataset(dataset, /** @type {any} */ (null));
	assert.ok(rule);

	// 少なくとも fix が例外なく動くこと（期待値は実装次第で変わるので「落ちない」保証にする）
	assert.doesNotThrow(() => {
		rule.fix("123.456", createCtx());
	});
});
