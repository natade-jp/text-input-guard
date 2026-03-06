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
 * IMEオフ入力相当の文字変換テーブル
 * @type {Record<string, string>}
 */
/* eslint-disable quote-props */
const IME_OFF_MAP = {
	"\u3000": "\u0020", // 全角スペース → space
	"\u3001": "\u002C", // 、 → ,
	"\u3002": "\u002E", // 。 → .
	"\u300C": "\u005B", // 「 → [
	"\u300D": "\u005D", // 」 → ]
	"\u301C": "\u007E", // 〜 → ~
	"\u30FC": "\u002D", // ー → -
	"\uFFE5": "\u005C"  // ￥ → \
};
/* eslint-enable quote-props */

/**
 * ASCII入力欄に日本語IMEで入った文字をASCIIへ矯正する
 * @param {string} text - 変換したいテキスト
 * @returns {string} 変換後のテキスト
 */
const toImeOff = function (text) {
	return Array.from(String(text), (ch) => {
		// 個別マップ
		if (ch in IME_OFF_MAP) {
			return IME_OFF_MAP[ch];
		}

		const code = ch.charCodeAt(0);

		// 全角ASCII
		if (code >= 0xFF01 && code <= 0xFF5E) {
			return String.fromCharCode(code - 0xFEE0);
		}

		// シングルクォート系
		if (code >= 0x2018 && code <= 0x201B) {
			return "'";
		}

		// ダブルクォート系
		if (code >= 0x201C && code <= 0x201F) {
			return '"';
		}

		return ch;
	}).join("");
};

/**
 * ASCII入力欄に日本語IMEで入った文字をASCIIへ矯正する
 *
 * 注意:
 * - これは「半角化」ではなく「IMEオフ入力相当への寄せ」
 * - ascii() とは責務が異なる
 *
 * @returns {import("../text-input-guard.js").Rule}
 */
export function imeOff() {
	return {
		name: "imeOff",
		targets: ["input", "textarea"],

		normalizeChar(value, ctx) {
			return toImeOff(value);
		}
	};
}

/**
 * dataset から imeOff ルールを生成する
 *
 * 対応する data 属性
 * - data-tig-rules-ime-off
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
imeOff.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesImeOff == null) {
		return null;
	}

	return imeOff();
};
