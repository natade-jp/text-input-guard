/**
 * The script is part of TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import Mojix from "./libs/mojix.js";
import { parseDatasetNumber, parseDatasetEnum } from "./_dataset.js";

/**
 * length ルールのオプション
 * @typedef {Object} LengthRuleOptions
 * @property {number} [max] - 最大長（グラフェム数）。未指定なら制限なし
 * @property {"block"|"error"} [overflowInput="block"] - 入力中に最大長を超えたときの挙動
 * @property {"grapheme"|"utf-16"|"utf-32"} [unit="grapheme"] - 長さの単位
 *
 * block   : 最大長を超える部分を切る
 * error   : エラーを積むだけ（値は変更しない）
 */

/**
 * グラフェム（1グラフェムは、UTF-32の配列）
 * @typedef {number[]} Grapheme
 */

/**
 * グラフェム/UTF-16コード単位/UTF-32コード単位の長さを調べる
 * @param {string} text
 * @param {"grapheme"|"utf-16"|"utf-32"} unit
 * @returns {number}
 */
const getTextLengthByUnit = function(text, unit) {
	if (unit === "grapheme") {
		return Mojix.toMojiArrayFromString(text).length;
	} else if (unit === "utf-16") {
		return Mojix.toUTF16Array(text).length;
	} else if (unit === "utf-32") {
		return Mojix.toUTF32Array(text).length;
	} else {
		// ここには来ない
		throw new Error(`Invalid unit: ${unit}`);
	}
};

/**
 * グラフェム/UTF-16コード単位/UTF-32コード単位でテキストを切る
 * @param {string} text
 * @param {"grapheme"|"utf-16"|"utf-32"} unit
 * @param {number} max
 * @returns {string}
 */
const cutTextByUnit = function(text, unit, max) {
	/**
	 * グラフェムの配列
	 * @type {Grapheme[]}
	 */
	const graphemeArray = Mojix.toMojiArrayFromString(text);

	/**
	 * 現在の位置
	 */
	let count = 0;

	/**
	 * グラフェムの配列（出力用）
	 * @type {Grapheme[]}
	 */
	const outputGraphemeArray = [];

	for (let i = 0; i < graphemeArray.length; i++) {
		const g = graphemeArray[i];

		// 1グラフェムあたりの長さ
		let graphemeCount = 0;
		if (unit === "grapheme") {
			graphemeCount = 1;
		} else if (unit === "utf-16") {
			graphemeCount = 0;
			for (let i = 0; i < g.length; i++) {
				graphemeCount += (g[i] > 0xFFFF) ? 2 : 1;
			}
		} else if (unit === "utf-32") {
			graphemeCount = g.length;
		}

		if (count + graphemeCount > max) {
			// 空配列を渡すとNUL文字を返すため、空配列のときは空文字を返す
			if (outputGraphemeArray.length === 0) {
				return "";
			}
			// 超える前の位置で文字列化して返す
			return Mojix.toStringFromMojiArray(outputGraphemeArray);
		}

		count += graphemeCount;
		outputGraphemeArray.push(g);
	}

	// 全部入るなら元の text を返す
	return text;
};

/**
 * 元のテキストと追加のテキストの合計が max を超える場合、追加のテキストを切って合計が max に収まるようにする
 * @param {string} orgText 元のテキスト
 * @param {string} addText 追加するテキスト
 * @param {"grapheme"|"utf-16"|"utf-32"} unit
 * @param {number} max
 * @returns {string} 追加するテキストを切ったもの（切る必要がない場合は addText をそのまま返す）
 */
const cutLength = function(orgText, addText, unit, max) {
	const orgLen = getTextLengthByUnit(orgText, unit);

	// すでに最大長を超えている場合は追加のテキストを全て切る
	if (orgLen >= max) { return ""; }

	const addLen = getTextLengthByUnit(addText, unit);
	const totalLen = orgLen + addLen;

	if (totalLen <= max) {
		// 今回の追加で範囲内に収まるなら何もしない
		return addText;
	}

	// 超える場合は追加のテキストを切る
	const allowedAddLen = max - orgLen;
	return cutTextByUnit(addText, unit, allowedAddLen);
};

/**
 * length ルールを生成する
 * @param {LengthRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
export function length(options = {}) {
	/** @type {LengthRuleOptions} */
	const opt = {
		max: typeof options.max === "number" ? options.max : undefined,
		overflowInput: options.overflowInput ?? "block",
		unit: options.unit ?? "grapheme"
	};

	return {
		name: "length",
		targets: ["input", "textarea"],

		normalizeStructure(value, ctx) {
			// block 以外は何もしない
			if (opt.overflowInput !== "block") {
				return value;
			}
			// max 未指定なら制限なし
			if (typeof opt.max !== "number") {
				return value;
			}

			const orgText = ctx.lastAcceptedValue;
			const startPosition = ctx.lastAcceptedSelection.start;
			const addText = ctx.inputData;
			if (addText === null || addText === undefined) {
				return value;
			}
			const cutText = cutLength(orgText, addText, opt.unit, opt.max);
			const newValue = orgText.slice(0, startPosition) + cutText + orgText.slice(startPosition);

			// cutText.length は UTF-16 code unit 長なので、
			// Selection は JS の index（UTF-16）前提で計算
			/**
			 * @type {import("../text-input-guard.js").SelectionState}
			 */
			const newSelection = { start: startPosition + cutText.length, end: startPosition + cutText.length, direction: "forward" };
			ctx.requestSelection(newSelection);
			return newValue;
		},

		validate(value, ctx) {
			// error 以外は何もしない
			if (opt.overflowInput !== "error") {
				return value;
			}
			// max 未指定なら制限なし
			if (typeof opt.max !== "number") {
				return;
			}

			const len = getTextLengthByUnit(value, opt.unit);
			if (len > opt.max) {
				ctx.pushError({
					code: "length.max_overflow",
					rule: "length",
					phase: "validate",
					detail: { max: opt.max, actual: len }
				});
			}
		}
	};
}

/**
 * datasetから length ルールを生成する
 * - data-tig-rules-length が無ければ null
 * - オプションは data-tig-rules-length-xxx から読む
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-length                     -> dataset.tigRulesLength
 * - data-tig-rules-length-max                 -> dataset.tigRulesLengthMax
 * - data-tig-rules-length-overflow-input      -> dataset.tigRulesLengthOverflowInput
 * - data-tig-rules-length-unit                -> dataset.tigRulesLengthUnit
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
length.fromDataset = function fromDataset(dataset, _el) {
	// ON判定
	if (dataset.tigRulesLength == null) {
		return null;
	}

	/** @type {LengthRuleOptions} */
	const options = {};

	const max = parseDatasetNumber(dataset.tigRulesLengthMax);
	if (max != null) {
		options.max = max;
	}

	const overflowInput = parseDatasetEnum(
		dataset.tigRulesLengthOverflowInput,
		["block", "error"]
	);
	if (overflowInput != null) {
		options.overflowInput = overflowInput;
	}

	const unit = parseDatasetEnum(
		dataset.tigRulesLengthUnit,
		["grapheme", "utf-16", "utf-32"]
	);
	if (unit != null) {
		options.unit = unit;
	}

	return length(options);
};
