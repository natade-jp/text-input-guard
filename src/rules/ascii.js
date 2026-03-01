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
import { parseDatasetBool, parseDatasetEnum } from "./_dataset.js";

/**
 * ascii ルールのオプション
 * @typedef {Object} AsciiRuleOptions
 * @property {"none"|"upper"|"lower"} [case] - 英字の大文字/小文字統一
 */

/**
 * ascii ルールを生成する
 * - 全角英数字・記号・全角スペースを半角へ正規化する
 * - 必要に応じて英字を大文字/小文字へ統一
 *
 * @param {AsciiRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
export function ascii(options = {}) {
	/** @type {AsciiRuleOptions} */
	const opt = {
		case: options.case ?? null
	};

	return {
		name: "ascii",
		targets: ["input", "textarea"],

		normalizeChar(value, ctx) {
			let s = String(value);

			// まず半角へ正規化
			s = Mojix.toHalfWidthAsciiCode(s);

			// 英字の大文字/小文字統一
			if (opt.case === "upper") {
				s = s.toUpperCase();
			} else if (opt.case === "lower") {
				s = s.toLowerCase();
			}

			return s;
		}
	};
}

/**
 * datasetから ascii ルールを生成する
 *
 * 対応する data 属性
 * - data-tig-rules-ascii
 * - data-tig-rules-ascii-case   ("none" | "upper" | "lower")
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
ascii.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesAscii == null) {
		return null;
	}

	const options = {};

	const caseOpt = parseDatasetEnum(dataset.tigRulesAsciiCase, [
		"none",
		"upper",
		"lower"
	]);
	if (caseOpt != null) {
		options.case = caseOpt;
	}

	return ascii(options);
};
