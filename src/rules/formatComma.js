/**
 * The script is part of JPInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

/**
 * カンマ付与ルール
 * - blur時のみ整数部に3桁区切りカンマを付与する
 * @returns {import("../jp-input-guard.js").Rule}
 */
export function comma() {
	return {
		name: "comma",
		targets: ["input"],

		/**
		 * 表示整形（確定時のみ）
		 * @param {string} value
		 * @returns {string}
		 */
		format(value) {
			const v = String(value);
			if (v === "" || v === "-" || v === "." || v === "-.") {
				return v;
			}

			let sign = "";
			let s = v;

			if (s.startsWith("-")) {
				sign = "-";
				s = s.slice(1);
			}

			const dotIndex = s.indexOf(".");
			const intPart = dotIndex >= 0 ? s.slice(0, dotIndex) : s;
			const fracPart = dotIndex >= 0 ? s.slice(dotIndex + 1) : null;

			// 整数部にカンマ
			const withComma = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

			if (fracPart != null) {
				return `${sign}${withComma}.${fracPart}`;
			}
			return `${sign}${withComma}`;
		}
	};
}
/**
 * datasetから comma ルールを生成する
 * - data-jpig-rules-comma が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-jpig-rules-comma -> dataset.jpigRulesComma
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../jp-input-guard.js").Rule|null}
 */
comma.fromDataset = function fromDataset(dataset, _el) {
	// ON判定：data-jpig-rules-comma が無ければ対象外
	if (dataset.jpigRulesComma == null) {
		return null;
	}
	return comma();
};
