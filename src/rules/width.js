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
 * width ルールのオプション
 * @typedef {Object} WidthRuleOptions
 * @property {number} [max] - 最大長（全角は2, 半角は1）
 * @property {"block"|"error"} [mode="block"] - 入力中に最大長を超えたときの挙動
 */

/**
 * width ルールを生成する
 * @param {WidthRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
export function width(options = {}) {
	/** @type {WidthRuleOptions} */
	const opt = {
		max: typeof options.max === "number" ? options.max : undefined,
		mode: options.mode ?? "block"
	};

	return {
		name: "length",
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

			/*
			 * 指定したテキストを切り出す
			 * - 0幅 ... グラフェムを構成する要素
			 *           （結合文字, 異体字セレクタ, スキントーン修飾子,
			 *            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
			 * - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
			 * - 2幅 ... 上記以外
			 * ※ Unicode が配布してる EastAsianWidth.txt は使用していません。
			 * （目的としては Shift_JIS 時代の半角全角だと思われるため）
			 */
			const cutText = Mojix.cutTextForWidth(value, 0, opt.max);
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

			/*
			* 指定したテキストの横幅を半角／全角でカウント
			* - 0幅 ... グラフェムを構成する要素
			*           （結合文字, 異体字セレクタ, スキントーン修飾子,
			*            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
			* - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
			* - 2幅 ... 上記以外
			* ※ Unicode が配布してる EastAsianWidth.txt は使用していません。
			* （目的としては Shift_JIS 時代の半角全角だと思われるため）
			*/
			const len = Mojix.getWidth(value);
			if (len > opt.max) {
				ctx.pushError({
					code: "width.max_overflow",
					rule: "width",
					phase: "validate",
					detail: { limit: opt.max, actual: len }
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
 * - data-tig-rules-length                     -> dataset.tigRulesWidth
 * - data-tig-rules-length-max                 -> dataset.tigRulesWidthMax
 * - data-tig-rules-length-mode                -> dataset.tigRulesWidthMode
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
width.fromDataset = function fromDataset(dataset, _el) {
	// ON判定
	if (dataset.tigRulesWidth == null) {
		return null;
	}

	/** @type {WidthRuleOptions} */
	const options = {};

	const max = parseDatasetNumber(dataset.tigRulesWidthMax);
	if (max != null) {
		options.max = max;
	}

	const mode = parseDatasetEnum(dataset.tigRulesWidthMode, ["block", "error"]);
	if (mode != null) {
		options.mode = mode;
	}

	return width(options);
};
