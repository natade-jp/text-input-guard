// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { imeOff } from "./ime-off.js";

test("imeOff - imeOff(): rule shape（name/targets/normalizeChar）", () => {
	const rule = imeOff();

	assert.equal(rule.name, "imeOff");
	assert.deepEqual(rule.targets, ["input", "textarea"]);
	assert.equal(typeof rule.normalizeChar, "function");
});

test("imeOff - normalizeChar: 個別マップ文字を ASCII へ矯正する", () => {
	const rule = imeOff();

	assert.equal(rule.normalizeChar("　", {}), " ");
	assert.equal(rule.normalizeChar("、", {}), ",");
	assert.equal(rule.normalizeChar("。", {}), ".");
	assert.equal(rule.normalizeChar("「", {}), "[");
	assert.equal(rule.normalizeChar("」", {}), "]");
	assert.equal(rule.normalizeChar("〜", {}), "~");
	assert.equal(rule.normalizeChar("ー", {}), "-");
	assert.equal(rule.normalizeChar("￥", {}), "\\");
});

test("imeOff - normalizeChar: 全角ASCII を半角ASCIIへ変換する", () => {
	const rule = imeOff();
	const out = rule.normalizeChar("ＡＢＣ１２３！＠＃", {});

	assert.equal(out, "ABC123!@#");
});

test("imeOff - normalizeChar: シングルクォート系を ASCII の ' に統一する", () => {
	const rule = imeOff();

	assert.equal(rule.normalizeChar("\u2018", {}), "'");
	assert.equal(rule.normalizeChar("\u2019", {}), "'");
	assert.equal(rule.normalizeChar("\u201A", {}), "'");
	assert.equal(rule.normalizeChar("\u201B", {}), "'");
});

test('imeOff - normalizeChar: ダブルクォート系を ASCII の " に統一する', () => {
	const rule = imeOff();

	assert.equal(rule.normalizeChar("\u201C", {}), '"');
	assert.equal(rule.normalizeChar("\u201D", {}), '"');
	assert.equal(rule.normalizeChar("\u201E", {}), '"');
	assert.equal(rule.normalizeChar("\u201F", {}), '"');
});

test("imeOff - normalizeChar: 個別マップと全角ASCII変換を組み合わせて処理できる", () => {
	const rule = imeOff();
	const out = rule.normalizeChar("「ＡＢＣ」　１２３、。〜ー￥", {});

	assert.equal(out, "[ABC] 123,.~-\\");
});

test("imeOff - normalizeChar: ASCII文字はそのまま維持する", () => {
	const rule = imeOff();
	const src = "ABCabc123-_=+[]{}()!@#$%^&*~.,/\\'\" ";
	const out = rule.normalizeChar(src, {});

	assert.equal(out, src);
});

test("imeOff - normalizeChar: 変換対象外の日本語文字はそのまま維持する", () => {
	const rule = imeOff();
	const out = rule.normalizeChar("漢字かなカナ", {});

	assert.equal(out, "漢字かなカナ");
});

test("imeOff - normalizeChar: 空文字は空文字のまま返す", () => {
	const rule = imeOff();
	const out = rule.normalizeChar("", {});

	assert.equal(out, "");
});

test("imeOff - normalizeChar: null/number なども String() で文字列化して処理できる", () => {
	const rule = imeOff();

	assert.equal(rule.normalizeChar(null, {}), "null");
	assert.equal(rule.normalizeChar(123, {}), "123");
});

test("imeOff - normalizeChar: サロゲートペア文字を含んでも壊れない", () => {
	const rule = imeOff();
	const out = rule.normalizeChar("😀Ａ😀", {});

	assert.equal(out, "😀A😀");
});

test("imeOff - fromDataset: data-tig-rules-ime-off が無い場合は null を返す", () => {
	const dataset = {};
	const rule = imeOff.fromDataset(dataset, null);

	assert.equal(rule, null);
});

test("imeOff - fromDataset: data-tig-rules-ime-off が存在する場合は rule を返す", () => {
	const dataset = { tigRulesImeOff: "" };
	const rule = imeOff.fromDataset(dataset, null);

	assert.ok(rule);
	assert.equal(rule.name, "imeOff");
	assert.equal(rule.normalizeChar("「Ａ」", {}), "[A]");
});

test("imeOff - fromDataset: _el 引数は未使用だが渡しても問題ない", () => {
	const dataset = { tigRulesImeOff: "" };

	assert.doesNotThrow(() => {
		imeOff.fromDataset(dataset, { dummy: true });
	});
});
