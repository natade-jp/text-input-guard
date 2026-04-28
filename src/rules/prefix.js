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
 * prefix ルールのオプション
 * @typedef {Object} PrefixRuleOptions
 * @property {string} text - 先頭に付ける文字列
 * @property {boolean} [showWhenEmpty=false] - 値が空でも表示するか
 */

/**
 * 先頭装飾（prefix）ルール
 * - 表示用として先頭に文字列を付与する
 * - 手動入力された同文字列は normalizeStructure で除去する
 *
 * @param {PrefixRuleOptions} options
 * @returns {import("../text-input-guard.js").Rule}
 */
export function prefix(options) {
	/** @type {PrefixRuleOptions} */
	const opt = {
		text: options?.text ?? "",
		showWhenEmpty: options?.showWhenEmpty ?? false
	};

	return {
		name: "prefix",
		targets: ["input", "textarea"],

		/**
		 * 手動入力された prefix を除去
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeStructure(value) {
			if (!opt.text) { return value; }

			let s = String(value);

			while (s.startsWith(opt.text)) {
				s = s.slice(opt.text.length);
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

			return opt.text + value;
		}
	};
}

/**
 * datasetから prefix ルールを生成する
 * - data-tig-rules-prefix が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-prefix                  -> dataset.tigRulesPrefix
 * - data-tig-rules-prefix-text             -> dataset.tigRulesPrefixText
 * - data-tig-rules-prefix-show-when-empty  -> dataset.tigRulesPrefixShowWhenEmpty
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
prefix.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesPrefix == null) {
		return null;
	}

	return prefix({
		text: dataset.tigRulesPrefixText ?? "",
		showWhenEmpty: dataset.tigRulesPrefixShowWhenEmpty === "true"
	});
};
