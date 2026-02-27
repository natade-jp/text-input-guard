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
 * 全角を半角に変換するルール
 * @returns {import("../text-input-guard.js").Rule}
 */
export function hankaku() {
	return {
		name: "hankaku",
		targets: ["input", "textarea"],

		/**
		 * 文字単位の正規化
		 *
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeChar(value) {
			return Mojix.toHalfWidth(value);
		}
	};
}

/**
 * datasetから hankaku ルールを生成する
 * - data-tig-rules-hankaku が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-hankaku -> dataset.tigRulesHankaku
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
hankaku.fromDataset = function fromDataset(dataset, _el) {
	// ON判定：data-tig-rules-hankaku が無ければ対象外
	if (dataset.tigRulesHankaku == null) {
		return null;
	}
	return hankaku();
};
