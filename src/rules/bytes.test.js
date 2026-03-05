// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { bytes } from "./bytes.js";

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

test("bytes - normalizeChar: mode が block 以外なら何もしない", () => {
	const rule = bytes({ max: 4, mode: "error", unit: "utf-8" });

	const ctx = makeCtx({
		beforeText: "ab",
		insertedText: "cd"
	});

	const out = rule.normalizeChar("cd", ctx);

	assert.equal(out, "cd");
});

test("bytes - normalizeChar: max 未指定なら制限なし", () => {
	const rule = bytes({ mode: "block", unit: "utf-8" });

	const ctx = makeCtx({
		beforeText: "ab",
		insertedText: "cd"
	});

	const out = rule.normalizeChar("cd", ctx);

	assert.equal(out, "cd");
});

test("bytes - normalizeChar: すでに beforeText が max 以上なら追加は全カット", () => {
	// "abcd" は utf-8 で 4bytes、max=4 なので追加は不可
	const rule = bytes({ max: 4, mode: "block", unit: "utf-8" });

	const ctx = makeCtx({
		beforeText: "abcd",
		insertedText: "e"
	});

	const out = rule.normalizeChar("e", ctx);

	assert.equal(out, "");
});

test("bytes - normalizeChar: utf-8 で ASCII は 1byte、超過分がカットされる", () => {
	// before="ab"(2) + inserted="cde"(3) => total 5 > max 4 なので "cd" まで
	const rule = bytes({ max: 4, mode: "block", unit: "utf-8" });

	const ctx = makeCtx({
		beforeText: "ab",
		insertedText: "cde"
	});

	const out = rule.normalizeChar("cde", ctx);

	assert.equal(out, "cd");
});

test("bytes - normalizeChar: utf-8 で 日本語は 3byte、入るところまで切る", () => {
	// "あ" は utf-8 3bytes
	// before="a"(1) + inserted="あい"(6) => total 7 > max 4
	// 追加可能なのは 3bytes なので "あ" まで入る
	const rule = bytes({ max: 4, mode: "block", unit: "utf-8" });

	const ctx = makeCtx({
		beforeText: "a",
		insertedText: "あい"
	});

	const out = rule.normalizeChar("あい", ctx);

	assert.equal(out, "あ");
});

test("bytes - normalizeChar: utf-16 はコードユニット数×2（サロゲートペアは 4bytes）", () => {
	const smile = "😀"; // UTF-16 だと 2 code units => 4bytes

	// max=2 なら追加不可（4 > 2）
	{
		const rule = bytes({ max: 2, mode: "block", unit: "utf-16" });
		const ctx = makeCtx({ beforeText: "", insertedText: smile });
		const out = rule.normalizeChar(smile, ctx);
		assert.equal(out, "");
	}

	// max=4 なら追加可能
	{
		const rule = bytes({ max: 4, mode: "block", unit: "utf-16" });
		const ctx = makeCtx({ beforeText: "", insertedText: smile });
		const out = rule.normalizeChar(smile, ctx);
		assert.equal(out, smile);
	}
});

test("bytes - normalizeChar: utf-32 はコードポイント数×4（結合文字は別コードポイントで 8bytes）", () => {
	const combined = "e\u0301"; // e + combining acute => UTF-32 2 codepoints => 8bytes

	const rule = bytes({ max: 4, mode: "block", unit: "utf-32" });

	const ctx = makeCtx({
		beforeText: "",
		insertedText: combined
	});

	const out = rule.normalizeChar(combined, ctx);

	// 8bytes > 4bytes なので追加不可
	assert.equal(out, "");
});

test("bytes - normalizeChar: sjis/cp932 は Shift_JIS エンコード長で判定（ASCII 1byte, 全角 2byte 想定）", () => {
	// "a"(1) + "あ"(2) = 3 が max=3 に収まるので OK
	const rule = bytes({ max: 3, mode: "block", unit: "sjis" });

	const ctx = makeCtx({
		beforeText: "",
		insertedText: "aあ"
	});

	const out = rule.normalizeChar("aあ", ctx);

	assert.equal(out, "aあ");
});

test("bytes - normalizeChar: sjis/cp932 で超過する場合は入るところまで切る", () => {
	// before="a"(1) + inserted="あい"(4) => total 5 > max 3
	// 追加できるのは 2byte までなので "あ" だけ入る想定
	const rule = bytes({ max: 3, mode: "block", unit: "cp932" });

	const ctx = makeCtx({
		beforeText: "a",
		insertedText: "あい"
	});

	const out = rule.normalizeChar("あい", ctx);

	assert.equal(out, "あ");
});

test("bytes - validate: mode=error かつ max 超過ならエラー（utf-8）", () => {
	// "あ" は utf-8 3bytes、"aa" は 2bytes => total 5
	const rule = bytes({ max: 4, mode: "error", unit: "utf-8" });

	const ctx = makeCtx();
	rule.validate("aaあ", ctx);

	const errs = ctx._getErrors();
	assert.equal(errs.length, 1);
	assert.equal(errs[0].code, "bytes.max_overflow");
	assert.equal(errs[0].rule, "bytes");
	assert.equal(errs[0].phase, "validate");
	assert.deepEqual(errs[0].detail, { max: 4, actual: 5 });
});

test("bytes - validate: mode が error 以外なら何もしない", () => {
	const rule = bytes({ max: 4, mode: "block", unit: "utf-8" });

	const ctx = makeCtx();
	rule.validate("aaあ", ctx);

	assert.equal(ctx._getErrors().length, 0);
});

test("bytes - validate: max 未指定なら制限なし", () => {
	const rule = bytes({ mode: "error", unit: "utf-8" });

	const ctx = makeCtx();
	rule.validate("aaあ", ctx);

	assert.equal(ctx._getErrors().length, 0);
});

test("bytes - fromDataset: tigRulesBytes が無ければ null", () => {
	const rule = bytes.fromDataset({}, /** @type {any} */ (null));
	assert.equal(rule, null);
});

test("bytes - fromDataset: オプションが正しく反映される（utf-16）", () => {
	const dataset = {
		tigRulesBytes: "1",
		tigRulesBytesMax: "3",
		tigRulesBytesMode: "error",
		tigRulesBytesUnit: "utf-16"
	};

	const rule = bytes.fromDataset(dataset, /** @type {any} */ (null));

	assert.ok(rule);
	assert.equal(rule.name, "bytes");

	const ctx = makeCtx();
	rule.validate("😀", ctx); // utf-16 は 4bytes

	const errs = ctx._getErrors();
	assert.equal(errs.length, 1);
	assert.deepEqual(errs[0].detail, { max: 3, actual: 4 });
});

test("bytes - fromDataset: unit が不正（未対応値）なら default(utf-8) のまま", () => {
	const dataset = {
		tigRulesBytes: "1",
		tigRulesBytesMax: "4",
		tigRulesBytesMode: "error",
		tigRulesBytesUnit: "unknown"
	};

	const rule = bytes.fromDataset(dataset, /** @type {any} */ (null));

	assert.ok(rule);
	assert.equal(rule.name, "bytes");

	// utf-8 なら "aaあ" は 5bytes なので max=4 でエラーになる
	const ctx = makeCtx();
	rule.validate("aaあ", ctx);

	const errs = ctx._getErrors();
	assert.equal(errs.length, 1);
	assert.deepEqual(errs[0].detail, { max: 4, actual: 5 });
});
