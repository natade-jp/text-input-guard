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
 * kana ルールのオプション
 * @typedef {Object} KanaRuleOptions
 * @property {"katakana-full"|"katakana-half"|"hiragana"} [target="katakana-full"] - 統一先
 * @property {boolean} [nfkc=true] - 事前に Unicode NFKC 正規化を行う（合体文字などを正規化）
 */

/**
 * kana ルールを生成する
 * @param {KanaRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
export function kana(options = {}) {
	/** @type {KanaRuleOptions} */
	const opt = {
		target: options.target ?? "katakana-full",
		nfkc: options.nfkc ?? true
	};

	return {
		name: "kana",
		targets: ["input", "textarea"],

		/**
		 * かな種別の正規化（入力中に都度かける）
		 * - (任意) NFKC 正規化
		 * - Mojix で target へ統一（ここは差し替え）
		 * @param {string} value
		 * @param {import("../text-input-guard.js").GuardContext} ctx
		 * @returns {string}
		 */
		normalizeChar(value, ctx) {
			let s = String(value);
			if (opt.nfkc) {
				// 古い環境で normalize が無い可能性もあるので安全に
				try {
					s = s.normalize("NFKC");
				} catch {
					// noop
				}
			}
			s = Mojix.toKatakana(s);
			if (opt.target === "katakana-full") {
				s = Mojix.toFullWidthSpace(s);
				s = Mojix.toFullWidthKana(s);
			} else if (opt.target === "katakana-half") {
				s = Mojix.toHalfWidthSpace(s);
				s = Mojix.toHalfWidthKana(s);
			} else {
				s = Mojix.toFullWidthSpace(s);
				s = Mojix.toFullWidthKana(s);
				s = Mojix.toHiragana(s);
			}
			return s;
		}
	};
}

/**
 * datasetから kana ルールを生成する
 * - data-tig-rules-kana が無ければ null
 * - オプションは data-tig-rules-kana-xxx から読む
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-kana               -> dataset.tigRulesKana
 * - data-tig-rules-kana-target        -> dataset.tigRulesKanaTarget
 * - data-tig-rules-kana-nfkc          -> dataset.tigRulesKanaNfkc
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
kana.fromDataset = function fromDataset(dataset, _el) {
	// ON判定
	if (dataset.tigRulesKana == null) {
		return null;
	}

	/** @type {KanaRuleOptions} */
	const options = {};

	const target = parseDatasetEnum(dataset.tigRulesKanaTarget, [
		"katakana-full",
		"katakana-half",
		"hiragana"
	]);
	if (target != null) {
		options.target = target;
	}

	const nfkc = parseDatasetBool(dataset.tigRulesKanaNfkc);
	if (nfkc != null) {
		options.nfkc = nfkc;
	}

	return kana(options);
};
