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
 * suffix ルールのオプション
 * @typedef {Object} SuffixRuleOptions
 * @property {string} text - 末尾に付ける文字列
 * @property {boolean} [showWhenEmpty=false] - 値が空でも表示するか
 */

/**
 * 末尾装飾（suffix）ルール
 * - 表示用として末尾に文字列を付与する
 * - 手動入力された同文字列は normalizeStructure で除去する
 *
 * @param {SuffixRuleOptions} options
 * @returns {import("../text-input-guard.js").Rule}
 */
export function suffix(options) {
	/** @type {SuffixRuleOptions} */
	const opt = {
		text: options?.text ?? "",
		showWhenEmpty: options?.showWhenEmpty ?? false
	};

	return {
		name: "suffix",
		targets: ["input", "textarea"],

		/**
		 * 手動入力された suffix を除去
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeStructure(value) {
			if (!opt.text) { return value; }

			let s = String(value);

			while (s.endsWith(opt.text)) {
				s = s.slice(0, -opt.text.length);
			}

			return s;
		},

		/**
		 * 表示用整形
		 * @param {string} value
		 * @returns {string}
		 */
		format(value) {
			if (!opt.text) { return value; }

			if (!value) {
				return opt.showWhenEmpty ? opt.text : value;
			}

			return value + opt.text;
		}
	};
}

/**
 * datasetから suffix ルールを生成する
 * - data-tig-rules-suffix が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-suffix                  -> dataset.tigRulesSuffix
 * - data-tig-rules-suffix-text             -> dataset.tigRulesSuffixText
 * - data-tig-rules-suffix-show-when-empty  -> dataset.tigRulesSuffixShowWhenEmpty
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
suffix.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesSuffix == null) {
		return null;
	}

	return suffix({
		text: dataset.tigRulesSuffixText ?? "",
		showWhenEmpty: dataset.tigRulesSuffixShowWhenEmpty === "true"
	});
};
