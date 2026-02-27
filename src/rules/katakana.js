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

/**
 * ひらがなをカタカナに変換するルール
 * @returns {import("../text-input-guard.js").Rule}
 */
export function katakana() {
	return {
		name: "katakana",
		targets: ["input", "textarea"],

		/**
		 * 文字単位の正規化
		 *
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeChar(value) {
			return Mojix.toKatakana(value);
		}
	};
}

/**
 * datasetから katakana ルールを生成する
 * - data-tig-rules-katakana が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-katakana -> dataset.tigRulesKatakana
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
katakana.fromDataset = function fromDataset(dataset, _el) {
	// ON判定：data-tig-rules-katakana が無ければ対象外
	if (dataset.tigRulesKatakana == null) {
		return null;
	}
	return katakana();
};
