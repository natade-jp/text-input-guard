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
 * numeric ルールのオプション
 * @typedef {Object} NumericRuleOptions
 * @property {boolean} [allowFullWidth=true] - 全角数字/記号を許可して半角へ正規化する
 * @property {boolean} [allowMinus=false] - マイナス記号を許可する（先頭のみ）
 * @property {boolean} [allowDecimal=false] - 小数点を許可する（1つだけ）
 */

/**
 * 数値入力向けルールを生成する
 * - normalize.char: 全角→半角、記号統一、不要文字の除去
 * - normalize.structure: 「-は先頭のみ」「.は1つだけ」など構造を整える
 * - fix: 確定時（blur）に「-」「.」「-.」や末尾の「.」を空/削除にする
 *
 * @param {NumericRuleOptions} [options]
 * @returns {import("../jp-input-guard.js").Rule}
 */
export function numeric(options = {}) {
	const opt = {
		allowFullWidth: options.allowFullWidth ?? true,
		allowMinus: options.allowMinus ?? false,
		allowDecimal: options.allowDecimal ?? false
	};

	/** @type {Set<string>} */
	const minusLike = new Set([
		"－", // FULLWIDTH HYPHEN-MINUS
		"−", // MINUS SIGN
		"‐", // HYPHEN
		"-", // NON-BREAKING HYPHEN
		"‒", // FIGURE DASH
		"–", // EN DASH
		"—", // EM DASH
		"―" // HORIZONTAL BAR
	]);

	/** @type {Set<string>} */
	const dotLike = new Set([
		"．", // FULLWIDTH FULL STOP
		"。", // IDEOGRAPHIC FULL STOP
		"｡" // HALFWIDTH IDEOGRAPHIC FULL STOP
	]);

	/**
	 * 全角数字（０〜９）を半角へ
	 * @param {string} ch
	 * @returns {string|null} 変換した1文字（対象外ならnull）
	 */
	function toHalfWidthDigit(ch) {
		const code = ch.charCodeAt(0);
		// '０'(FF10) .. '９'(FF19)
		if (0xFF10 <= code && code <= 0xFF19) {
			return String.fromCharCode(code - 0xFF10 + 0x30);
		}
		return null;
	}

	/**
	 * 1文字を「数字 / - / .」へ正規化する（許可されない場合は空）
	 * @param {string} ch
	 * @returns {string} 正規化後の文字（除去なら ""）
	 */
	function normalizeChar1(ch) {
		// 半角数字
		if (ch >= "0" && ch <= "9") {
			return ch;
		}

		// 全角数字
		if (opt.allowFullWidth) {
			const d = toHalfWidthDigit(ch);
			if (d) {
				return d;
			}
		}

		// 小数点
		if (ch === ".") {
			return opt.allowDecimal ? "." : "";
		}
		if (opt.allowFullWidth && dotLike.has(ch)) {
			return opt.allowDecimal ? "." : "";
		}

		// マイナス
		if (ch === "-") {
			return opt.allowMinus ? "-" : "";
		}
		if (opt.allowFullWidth && minusLike.has(ch)) {
			return opt.allowMinus ? "-" : "";
		}
		// 明示的に不要（+ や指数表記など）
		if (ch === "+" || ch === "＋") {
			return "";
		}
		if (ch === "e" || ch === "E" || ch === "ｅ" || ch === "Ｅ") {
			return "";
		}

		// その他は全部除去
		return "";
	}

	return {
		name: "numeric",
		targets: ["input"],

		/**
		 * 文字単位の正規化（全角→半角、記号統一、不要文字の除去）
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeChar(value) {
			let out = "";
			for (const ch of String(value)) {
				out += normalizeChar1(ch);
			}
			return out;
		},

		/**
		 * 構造正規化（-は先頭のみ、.は1つだけ）
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeStructure(value) {
			let out = "";
			let seenMinus = false;
			let seenDot = false;

			for (const ch of String(value)) {
				if (ch >= "0" && ch <= "9") {
					out += ch;
					continue;
				}

				if (ch === "-" && opt.allowMinus) {
					// マイナスは先頭のみ、1回だけ
					if (!seenMinus && out.length === 0) {
						out += "-";
						seenMinus = true;
					}
					continue;
				}

				if (ch === "." && opt.allowDecimal) {
					// 小数点は1つだけ（位置制約は設けない：digits側で精度などを管理）
					if (!seenDot) {
						out += ".";
						seenDot = true;
					}
					continue;
				}

				// その他は捨てる（normalizeCharでほぼ落ちてる想定）
			}

			return out;
		},

		/**
		 * 確定時にだけ消したい “未完成な数値” を整える
		 * - "-" / "." / "-." は空にする
		 * - 末尾の "." は削除する（"12." → "12"）
		 * @param {string} value
		 * @returns {string}
		 */
		fix(value) {
			const v = String(value);

			if (v === "-" || v === "." || v === "-.") {
				return "";
			}

			if (v.endsWith(".")) {
				return v.slice(0, -1);
			}

			return v;
		},

		/**
		 * numeric単体では基本エラーを出さない（入力途中を許容するため）
		 * ここでエラーにしたい場合は、将来オプションで強制できるようにしてもOK
		 * @param {string} _value
		 * @param {any} _ctx
		 * @returns {void}
		 */
		validate(_value, _ctx) {
			// no-op
		}
	};
}
