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
 * bytes ルールのオプション
 * @typedef {Object} BytesRuleOptions
 * @property {number} [max] - 最大長（グラフェム数）。未指定なら制限なし
 * @property {"block"|"error"} [mode="block"] - 入力中に最大長を超えたときの挙動
 * @property {"utf-8"|"utf-16"|"utf-32"|"sjis"|"cp932"} [unit="utf-8"] - サイズの単位(sjis系を使用する場合はfilterも必須)
 */

/**
 * グラフェム（1グラフェムは、UTF-32の配列）
 * @typedef {number[]} Grapheme
 */

/**
 * グラフェム/UTF-16コード単位/UTF-32コード単位の長さを調べる
 * @param {string} text
 * @param {"utf-8"|"utf-16"|"utf-32"|"sjis"|"cp932"} unit
 * @returns {number}
 */
const getTextBytesByUnit = function(text, unit) {
	if (text.length === 0) {
		return 0;
	}
	if (unit === "utf-8") {
		return Mojix.toUTF8Array(text).length;
	} else if (unit === "utf-16") {
		return Mojix.toUTF16Array(text).length * 2;
	} else if (unit === "utf-32") {
		return Mojix.toUTF32Array(text).length * 4;
	} else if (unit === "sjis" || unit === "cp932") {
		return Mojix.encode(text, "Shift_JIS").length;
	} else {
		// ここには来ない
		throw new Error(`Invalid unit: ${unit}`);
	}
};

/**
 * グラフェム/UTF-16コード単位/UTF-32コード単位でテキストを切る
 * @param {string} text
 * @param {"utf-8"|"utf-16"|"utf-32"|"sjis"|"cp932"} unit
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
		let byteCount = 0;
		if (unit === "utf-8") {
			byteCount = Mojix.toUTF8Array(Mojix.toStringFromMojiArray([g])).length;
		} else if (unit === "utf-16") {
			byteCount = Mojix.toUTF16Array(Mojix.toStringFromMojiArray([g])).length * 2;
		} else if (unit === "utf-32") {
			byteCount = Mojix.toUTF32Array(Mojix.toStringFromMojiArray([g])).length * 4;
		} else if (unit === "sjis" || unit === "cp932") {
			byteCount = Mojix.encode(Mojix.toStringFromMojiArray([g]), "Shift_JIS").length;
		}

		if (count + byteCount > max) {
			// 空配列を渡すとNUL文字を返すため、空配列のときは空文字を返す
			if (outputGraphemeArray.length === 0) {
				return "";
			}
			// 超える前の位置で文字列化して返す
			return Mojix.toStringFromMojiArray(outputGraphemeArray);
		}

		count += byteCount;
		outputGraphemeArray.push(g);
	}

	// 全部入るなら元の text を返す
	return text;
};

/**
 * 元のテキストと追加のテキストの合計が max を超える場合、追加のテキストを切って合計が max に収まるようにする
 * @param {string} beforeText 元のテキスト
 * @param {string} insertedText 追加するテキスト
 * @param {"utf-8"|"utf-16"|"utf-32"|"sjis"|"cp932"} unit
 * @param {number} max
 * @returns {string} 追加するテキストを切ったもの（切る必要がない場合は insertedText をそのまま返す）
 */
const cutBytes = function(beforeText, insertedText, unit, max) {
	const beforeTextLen = getTextBytesByUnit(beforeText, unit);

	// すでに最大長を超えている場合は追加のテキストを全て切る
	if (beforeTextLen >= max) { return ""; }

	const insertedTextLen = getTextBytesByUnit(insertedText, unit);
	const totalLen = beforeTextLen + insertedTextLen;

	if (totalLen <= max) {
		// 今回の追加で範囲内に収まるなら何もしない
		return insertedText;
	}

	// 超える場合は追加のテキストを切る
	const allowedAddLen = max - beforeTextLen;
	return cutTextByUnit(insertedText, unit, allowedAddLen);
};

/**
 * bytes ルールを生成する
 * @param {BytesRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
export function bytes(options = {}) {
	/** @type {BytesRuleOptions} */
	const opt = {
		max: typeof options.max === "number" ? options.max : undefined,
		mode: options.mode ?? "block",
		unit: options.unit ?? "utf-8"
	};

	return {
		name: "bytes",
		targets: ["input", "textarea"],

		normalizeChar(value, ctx) {
			// block 以外は何もしない
			if (opt.mode !== "block") {
				return value;
			}
			// max 未指定なら制限なし
			if (typeof opt.max !== "number") {
				return value;
			}

			const cutText = cutBytes(ctx.beforeText, value, opt.unit, opt.max);
			return cutText;
		},

		validate(value, ctx) {
			// error 以外は何もしない
			if (opt.mode !== "error") {
				return;
			}
			// max 未指定なら制限なし
			if (typeof opt.max !== "number") {
				return;
			}

			const len = getTextBytesByUnit(value, opt.unit);
			if (len > opt.max) {
				ctx.pushError({
					code: "bytes.max_overflow",
					rule: "bytes",
					phase: "validate",
					detail: { max: opt.max, actual: len }
				});
			}
		}
	};
}

/**
 * datasetから bytes ルールを生成する
 * - data-tig-rules-bytes が無ければ null
 * - オプションは data-tig-rules-bytes-xxx から読む
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-bytes                     -> dataset.tigRulesBytes
 * - data-tig-rules-bytes-max                 -> dataset.tigRulesBytesMax
 * - data-tig-rules-bytes-mode                -> dataset.tigRulesBytesMode
 * - data-tig-rules-bytes-unit                -> dataset.tigRulesBytesUnit
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
bytes.fromDataset = function fromDataset(dataset, _el) {
	// ON判定
	if (dataset.tigRulesBytes == null) {
		return null;
	}

	/** @type {BytesRuleOptions} */
	const options = {};

	const max = parseDatasetNumber(dataset.tigRulesBytesMax);
	if (max != null) {
		options.max = max;
	}

	const mode = parseDatasetEnum(dataset.tigRulesBytesMode, ["block", "error"]);
	if (mode != null) {
		options.mode = mode;
	}

	const unit = parseDatasetEnum(
		dataset.tigRulesBytesUnit,
		["utf-8", "utf-16", "utf-32", "sjis", "cp932"]
	);
	if (unit != null) {
		options.unit = unit;
	}

	return bytes(options);
};
