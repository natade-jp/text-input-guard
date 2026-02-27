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
 * 半角を全角に変換するルール
 * @returns {import("../text-input-guard.js").Rule}
 */
export function zenkaku() {
	return {
		name: "zenkaku",
		targets: ["input", "textarea"],

		/**
		 * 文字単位の正規化
		 *
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeChar(value) {
			return Mojix.toFullWidth(value);
		}
	};
}

/**
 * datasetから zenkaku ルールを生成する
 * - data-tig-rules-zenkaku が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-zenkaku -> dataset.tigRulesZenkaku
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
zenkaku.fromDataset = function fromDataset(dataset, _el) {
	// ON判定：data-tig-rules-zenkaku が無ければ対象外
	if (dataset.tigRulesZenkaku == null) {
		return null;
	}
	return zenkaku();
};
