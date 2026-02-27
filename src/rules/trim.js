/**
 * The script is part of TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

/**
 * トリムするルール
 * @returns {import("../text-input-guard.js").Rule}
 */
export function trim() {
	return {
		name: "trim",
		targets: ["input", "textarea"],

		/**
		 * 構造正規化
		 *
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeStructure(value) {
			return value.trim();
		}
	};
}

/**
 * datasetから trim ルールを生成する
 * - data-tig-rules-trim が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-trim -> dataset.tigRulesTrim
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
trim.fromDataset = function fromDataset(dataset, _el) {
	// ON判定：data-tig-rules-trim が無ければ対象外
	if (dataset.tigRulesTrim == null) {
		return null;
	}
	return trim();
};
