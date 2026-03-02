// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { length } from "./length.js";

const makeCtx = function ({
	lastAcceptedValue = "",
	lastAcceptedSelection = { start: 0, end: 0, direction: "forward" },
	inputData = null
} = {}) {
	/** @type {any[]} */
	const errors = [];
	/** @type {any[]} */
	const selections = [];

	/** @type {any} */
	const ctx = {
		lastAcceptedValue,
		lastAcceptedSelection,
		inputData,
		pushError(e) { errors.push(e); },
		requestSelection(s) { selections.push(s); },
		_getErrors() { return errors; },
		_getSelections() { return selections; }
	};

	return ctx;
};

test("length - normalizeStructure: overflowInput が block 以外なら何もしない", () => {
	const rule = length({ max: 3, overflowInput: "error" });

	const ctx = makeCtx({
		lastAcceptedValue: "abc",
		lastAcceptedSelection: { start: 3, end: 3, direction: "forward" },
		inputData: "d"
	});

	const out = rule.normalizeStructure("abcd", ctx);

	assert.equal(out, "abcd");
	assert.equal(ctx._getSelections().length, 0);
});

test("length - normalizeStructure: max 未指定なら制限なし（何もしない）", () => {
	const rule = length({ overflowInput: "block", unit: "grapheme" });

	const ctx = makeCtx({
		lastAcceptedValue: "abc",
		lastAcceptedSelection: { start: 3, end: 3, direction: "forward" },
		inputData: "d"
	});

	const out = rule.normalizeStructure("abcd", ctx);

	assert.equal(out, "abcd");
	assert.equal(ctx._getSelections().length, 0);
});

test("length - normalizeStructure: inputData が null/undefined なら何もしない", () => {
	const rule = length({ max: 3, overflowInput: "block" });

	const ctxNull = makeCtx({
		lastAcceptedValue: "abc",
		lastAcceptedSelection: { start: 3, end: 3, direction: "forward" },
		inputData: null
	});
	assert.equal(rule.normalizeStructure("abc", ctxNull), "abc");
	assert.equal(ctxNull._getSelections().length, 0);

	const ctxUndef = makeCtx({
		lastAcceptedValue: "abc",
		lastAcceptedSelection: { start: 3, end: 3, direction: "forward" },
		inputData: undefined
	});
	assert.equal(rule.normalizeStructure("abc", ctxUndef), "abc");
	assert.equal(ctxUndef._getSelections().length, 0);
});

test("length - normalizeStructure: grapheme 単位で超過分がカットされる（末尾挿入）", () => {
	const rule = length({ max: 3, overflowInput: "block", unit: "grapheme" });

	// org="abc"(3) に "d" を追加しようとするが max=3 なので add が全部カットされる
	const ctx = makeCtx({
		lastAcceptedValue: "abc",
		lastAcceptedSelection: { start: 3, end: 3, direction: "forward" },
		inputData: "d"
	});

	const out = rule.normalizeStructure("abcd", ctx);

	assert.equal(out, "abc");
	assert.deepEqual(ctx._getSelections(), [
		{ start: 3, end: 3, direction: "forward" }
	]);
});

test("length - normalizeStructure: 挿入位置が途中でも startPosition を基準に組み立てられる", () => {
	const rule = length({ max: 5, overflowInput: "block", unit: "grapheme" });

	// org="abXY" の position=2 に "c" を挿入 → "abcXY"
	const ctx = makeCtx({
		lastAcceptedValue: "abXY",
		lastAcceptedSelection: { start: 2, end: 2, direction: "forward" },
		inputData: "c"
	});

	const out = rule.normalizeStructure("abXY", ctx);

	assert.equal(out, "abcXY");
	assert.deepEqual(ctx._getSelections(), [
		{ start: 3, end: 3, direction: "forward" }
	]);
});

test("length - normalizeStructure: utf-16 単位ではサロゲートペアが 2 として数えられる", () => {
	const smile = "😀"; // UTF-16 だと length=2 の代表例

	// max=1 だと追加できない
	{
		const rule = length({ max: 1, overflowInput: "block", unit: "utf-16" });
		const ctx = makeCtx({
			lastAcceptedValue: "",
			lastAcceptedSelection: { start: 0, end: 0, direction: "forward" },
			inputData: smile
		});
		const out = rule.normalizeStructure(smile, ctx);
		assert.equal(out, "");
		assert.deepEqual(ctx._getSelections(), [
			{ start: 0, end: 0, direction: "forward" }
		]);
	}

	// max=2 なら追加できる（cut されない）
	{
		const rule = length({ max: 2, overflowInput: "block", unit: "utf-16" });
		const ctx = makeCtx({
			lastAcceptedValue: "",
			lastAcceptedSelection: { start: 0, end: 0, direction: "forward" },
			inputData: smile
		});
		const out = rule.normalizeStructure(smile, ctx);
		assert.equal(out, smile);
		assert.deepEqual(ctx._getSelections(), [
			{ start: smile.length, end: smile.length, direction: "forward" }
		]);
	}
});

test("length - normalizeStructure: utf-32 単位では結合文字列（例: e + ◌́）が 2 として数えられる", () => {
	const combined = "e\u0301"; // e + combining acute accent

	// utf-32 max=1 だと 2 code point のため追加できない
	const rule = length({ max: 1, overflowInput: "block", unit: "utf-32" });
	const ctx = makeCtx({
		lastAcceptedValue: "",
		lastAcceptedSelection: { start: 0, end: 0, direction: "forward" },
		inputData: combined
	});

	const out = rule.normalizeStructure(combined, ctx);

	assert.equal(out, "");
	assert.deepEqual(ctx._getSelections(), [
		{ start: 0, end: 0, direction: "forward" }
	]);
});

test("length - validate: overflowInput=error かつ max 超過ならエラーが積まれる", () => {
	const rule = length({ max: 3, overflowInput: "error", unit: "grapheme" });

	const ctx = makeCtx();
	rule.validate("abcd", ctx);

	const errs = ctx._getErrors();
	assert.equal(errs.length, 1);
	assert.equal(errs[0].code, "length.max_overflow");
	assert.equal(errs[0].rule, "length");
	assert.equal(errs[0].phase, "validate");
	assert.deepEqual(errs[0].detail, { max: 3, actual: 4 });
});

test("length - validate: overflowInput が error 以外なら何もしない", () => {
	const rule = length({ max: 3, overflowInput: "block", unit: "grapheme" });

	const ctx = makeCtx();
	rule.validate("abcd", ctx);

	assert.equal(ctx._getErrors().length, 0);
});

test("length - validate: max 未指定なら制限なし（何もしない）", () => {
	const rule = length({ overflowInput: "error", unit: "grapheme" });

	const ctx = makeCtx();
	rule.validate("abcd", ctx);

	assert.equal(ctx._getErrors().length, 0);
});

test("length - fromDataset: tigRulesLength が無ければ null", () => {
	const rule = length.fromDataset({}, /** @type {any} */ (null));
	assert.equal(rule, null);
});

test("length - fromDataset: tigRulesLength があれば length ルールが返る（オプションも反映）", () => {
	const dataset = {
		tigRulesLength: "1",
		tigRulesLengthMax: "3",
		tigRulesLengthOverflowInput: "error",
		tigRulesLengthUnit: "utf-16"
	};

	const rule = length.fromDataset(dataset, /** @type {any} */ (null));

	assert.ok(rule);
	assert.equal(rule.name, "length");

	const ctx = makeCtx();
	rule.validate("😀😀", ctx); // utf-16 だと 2文字=4 code unit
	const errs = ctx._getErrors();

	assert.equal(errs.length, 1);
	assert.deepEqual(errs[0].detail, { max: 3, actual: 4 });
});
