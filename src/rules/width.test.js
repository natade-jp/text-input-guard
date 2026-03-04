// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { width } from "./width.js";

const makeCtx = function ({
	beforeText = "",
	insertedText = ""
} = {}) {
	/** @type {any[]} */
	const errors = [];

	/** @type {any} */
	const ctx = {
		beforeText,
		insertedText,
		pushError(e) { errors.push(e); },
		_getErrors() { return errors; }
	};

	return ctx;
};

test("width - normalizeChar: overflowInput が block 以外なら何もしない", () => {
	const rule = width({ max: 4, overflowInput: "error" });

	const ctx = makeCtx({
		beforeText: "ab",
		insertedText: "cd"
	});

	const out = rule.normalizeChar("cd", ctx);

	assert.equal(out, "cd");
});

test("width - normalizeChar: max 未指定なら制限なし", () => {
	const rule = width({ overflowInput: "block" });

	const ctx = makeCtx({
		beforeText: "ab",
		insertedText: "cd"
	});

	const out = rule.normalizeChar("cd", ctx);

	assert.equal(out, "cd");
});

test("width - normalizeChar: ASCII は 1幅、全角は 2幅として超過分がカットされる", () => {
	// "abcd" の後ろに全角 "あ"(2幅) は入らない（max=4）
	const rule = width({ max: 4, overflowInput: "block" });

	const ctx = makeCtx({
		beforeText: "",
		insertedText: "abcdあ"
	});

	const out = rule.normalizeChar("abcdあ", ctx);

	assert.equal(out, "abcd");
});

test("width - normalizeChar: 途中までなら追加できる（ASCII + 全角）", () => {
	// "ab" (2) + "あ" (2) = 4 で収まる（max=4）
	const rule = width({ max: 4, overflowInput: "block" });

	const ctx = makeCtx({
		beforeText: "",
		insertedText: "abあ"
	});

	const out = rule.normalizeChar("abあ", ctx);

	assert.equal(out, "abあ");
});

test("width - normalizeChar: 半角カタカナは 1幅として数える", () => {
	// 半角カタカナ "ｱ" は 1幅想定、max=3 なら 3文字までOK
	const rule = width({ max: 3, overflowInput: "block" });

	const ctx = makeCtx({
		beforeText: "",
		insertedText: "ｱｲｳｴ"
	});

	const out = rule.normalizeChar("ｱｲｳｴ", ctx);

	assert.equal(out, "ｱｲｳ");
});

test("width - normalizeChar: 結合文字など 0幅要素は幅に影響しない（e + combining acute）", () => {
	// "e\u0301" は表示上1文字相当、幅も1想定（0幅要素を含む）
	const combined = "e\u0301"; // e + combining acute
	const rule = width({ max: 1, overflowInput: "block" });

	const ctx = makeCtx({
		beforeText: "",
		insertedText: combined
	});

	const out = rule.normalizeChar(combined, ctx);

	// 0幅扱いが効いていれば丸ごと入るはず
	assert.equal(out, combined);
});

test("width - validate: overflowInput=error かつ max 超過ならエラー", () => {
	// "ab"(2) + "あ"(2) = 4 > 3
	const rule = width({ max: 3, overflowInput: "error" });

	const ctx = makeCtx();
	rule.validate("abあ", ctx);

	const errs = ctx._getErrors();
	assert.equal(errs.length, 1);
	assert.equal(errs[0].code, "length.max_overflow");
	assert.equal(errs[0].rule, "length");
	assert.equal(errs[0].phase, "validate");
	assert.deepEqual(errs[0].detail, { max: 3, actual: 4 });
});

test("width - validate: overflowInput が error 以外なら何もしない", () => {
	const rule = width({ max: 3, overflowInput: "block" });

	const ctx = makeCtx();
	rule.validate("abあ", ctx);

	assert.equal(ctx._getErrors().length, 0);
});

test("width - validate: max 未指定なら制限なし", () => {
	const rule = width({ overflowInput: "error" });

	const ctx = makeCtx();
	rule.validate("abあいうえお", ctx);

	assert.equal(ctx._getErrors().length, 0);
});

test("width - fromDataset: tigRulesWidth が無ければ null", () => {
	const rule = width.fromDataset({}, /** @type {any} */ (null));
	assert.equal(rule, null);
});

test("width - fromDataset: オプションが正しく反映される", () => {
	const dataset = {
		tigRulesWidth: "1",
		tigRulesWidthMax: "3",
		tigRulesWidthOverflowInput: "error"
	};

	const rule = width.fromDataset(dataset, /** @type {any} */ (null));

	assert.ok(rule);
	assert.equal(rule.name, "length");

	const ctx = makeCtx();
	rule.validate("abあ", ctx); // 4幅

	const errs = ctx._getErrors();
	assert.equal(errs.length, 1);
	assert.deepEqual(errs[0].detail, { max: 3, actual: 4 });
});
