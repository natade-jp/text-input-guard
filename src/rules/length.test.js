// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { length } from "./length.js";

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

test("length - normalizeChar: mode が block 以外なら何もしない", () => {
	const rule = length({ max: 3, mode: "error" });

	const ctx = makeCtx({
		beforeText: "abc",
		insertedText: "d"
	});

	const out = rule.normalizeChar("d", ctx);

	assert.equal(out, "d");
});

test("length - normalizeChar: max 未指定なら制限なし", () => {
	const rule = length({ mode: "block" });

	const ctx = makeCtx({
		beforeText: "abc",
		insertedText: "d"
	});

	const out = rule.normalizeChar("d", ctx);

	assert.equal(out, "d");
});

test("length - normalizeChar: insertedText が空文字なら何もしない", () => {
	const rule = length({ max: 3, mode: "block" });

	const ctx = makeCtx({
		beforeText: "abc",
		insertedText: ""
	});

	const out = rule.normalizeChar("", ctx);

	assert.equal(out, "");
});

test("length - normalizeChar: grapheme 単位で超過分がカットされる", () => {
	const rule = length({ max: 3, mode: "block", unit: "grapheme" });

	// すでに3文字あるので追加はすべてカット
	const ctx = makeCtx({
		beforeText: "abc",
		insertedText: "d"
	});

	const out = rule.normalizeChar("d", ctx);

	assert.equal(out, "");
});

test("length - normalizeChar: 途中までなら追加できる", () => {
	const rule = length({ max: 5, mode: "block", unit: "grapheme" });

	const ctx = makeCtx({
		beforeText: "abc",
		insertedText: "de"
	});

	const out = rule.normalizeChar("de", ctx);

	assert.equal(out, "de");
});

test("length - normalizeChar: utf-16 単位ではサロゲートペアは 2 と数える", () => {
	const smile = "😀";

	// max=1 なら追加不可
	{
		const rule = length({ max: 1, mode: "block", unit: "utf-16" });
		const ctx = makeCtx({
			beforeText: "",
			insertedText: smile
		});
		const out = rule.normalizeChar(smile, ctx);
		assert.equal(out, "");
	}

	// max=2 なら追加可能
	{
		const rule = length({ max: 2, mode: "block", unit: "utf-16" });
		const ctx = makeCtx({
			beforeText: "",
			insertedText: smile
		});
		const out = rule.normalizeChar(smile, ctx);
		assert.equal(out, smile);
	}
});

test("length - normalizeChar: utf-32 単位では結合文字は 2 と数える", () => {
	const combined = "e\u0301"; // e + combining acute

	const rule = length({ max: 1, mode: "block", unit: "utf-32" });

	const ctx = makeCtx({
		beforeText: "",
		insertedText: combined
	});

	const out = rule.normalizeChar(combined, ctx);

	assert.equal(out, "");
});

test("length - validate: mode=error かつ max 超過ならエラー", () => {
	const rule = length({ max: 3, mode: "error", unit: "grapheme" });

	const ctx = makeCtx();
	rule.validate("abcd", ctx);

	const errs = ctx._getErrors();
	assert.equal(errs.length, 1);
	assert.equal(errs[0].code, "length.max_overflow");
	assert.equal(errs[0].rule, "length");
	assert.equal(errs[0].phase, "validate");
	assert.deepEqual(errs[0].detail, { max: 3, actual: 4 });
});

test("length - validate: mode が error 以外なら何もしない", () => {
	const rule = length({ max: 3, mode: "block", unit: "grapheme" });

	const ctx = makeCtx();
	rule.validate("abcd", ctx);

	assert.equal(ctx._getErrors().length, 0);
});

test("length - validate: max 未指定なら制限なし", () => {
	const rule = length({ mode: "error" });

	const ctx = makeCtx();
	rule.validate("abcd", ctx);

	assert.equal(ctx._getErrors().length, 0);
});

test("length - fromDataset: tigRulesLength が無ければ null", () => {
	const rule = length.fromDataset({}, /** @type {any} */ (null));
	assert.equal(rule, null);
});

test("length - fromDataset: オプションが正しく反映される", () => {
	const dataset = {
		tigRulesLength: "1",
		tigRulesLengthMax: "3",
		tigRulesLengthMode: "error",
		tigRulesLengthUnit: "utf-16"
	};

	const rule = length.fromDataset(dataset, /** @type {any} */ (null));

	assert.ok(rule);
	assert.equal(rule.name, "length");

	const ctx = makeCtx();
	rule.validate("😀😀", ctx); // utf-16 では4

	const errs = ctx._getErrors();
	assert.equal(errs.length, 1);
	assert.deepEqual(errs[0].detail, { max: 3, actual: 4 });
});
