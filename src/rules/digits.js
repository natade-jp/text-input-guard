/**
 * The script is part of TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import { parseDatasetBool, parseDatasetNumber, parseDatasetEnum } from "./_dataset.js";

/**
 * digits ルールのオプション
 * @typedef {Object} DigitsRuleOptions
 * @property {number} [int] - 整数部の最大桁数（省略可）
 * @property {number} [frac] - 小数部の最大桁数（省略可）
 * @property {boolean} [countLeadingZeros=true] - 整数部の先頭ゼロを桁数に含める
 * @property {"none"|"truncateLeft"|"truncateRight"|"clamp"} [fixIntOnBlur="none"] - blur時の整数部補正
 * @property {"none"|"truncate"|"round"} [fixFracOnBlur="none"] - blur時の小数部補正
 * @property {"block"|"error"} [modeInt="block"] - 整数部が最大桁を超える入力の挙動
 * @property {"block"|"error"} [modeFrac="block"] - 小数部が最大桁を超える入力の挙動
 * @property {boolean} [forceFracOnBlur=false] - blur時に小数部を必ず表示（frac桁まで0埋め）
 */

/**
 * 数値文字列を「符号・整数部・小数部」に分解する
 * - numericルール後の値（数字/./-のみ）を想定
 * @param {string} value
 * @returns {{ sign: ""|"-", intPart: string, fracPart: string, hasDot: boolean }}
 */
function splitNumber(value) {
	const v = String(value);

	/** @type {""|"-"} */
	let sign = "";
	let s = v;

	if (s.startsWith("-")) {
		sign = "-";
		s = s.slice(1);
	}

	const dotIndex = s.indexOf(".");
	const hasDot = dotIndex >= 0;

	if (!hasDot) {
		return { sign, intPart: s, fracPart: "", hasDot: false };
	}

	const intPart = s.slice(0, dotIndex);
	const fracPart = s.slice(dotIndex + 1);

	return { sign, intPart, fracPart, hasDot: true };
}

/**
 * 整数部の桁数を数える（先頭ゼロを含める/含めないを選べる）
 * @param {string} intPart
 * @param {boolean} countLeadingZeros
 * @returns {number}
 */
function countIntDigits(intPart, countLeadingZeros) {
	const s = intPart ?? "";
	if (s.length === 0) { return 0; }

	if (countLeadingZeros) { return s.length; }

	// 先頭ゼロを除外して数える（全部ゼロなら 1 として扱う）
	const trimmed = s.replace(/^0+/, "");
	return trimmed.length === 0 ? 1 : trimmed.length;
}

/**
 * 任意桁の「+1」加算（10進文字列、非負のみ）
 * @param {string} dec
 * @returns {string}
 */
function addOne(dec) {
	let carry = 1;
	const arr = dec.split("");

	for (let i = arr.length - 1; i >= 0; i--) {
		const n = arr[i].charCodeAt(0) - 48 + carry;
		if (n >= 10) {
			arr[i] = "0";
			carry = 1;
		} else {
			arr[i] = String.fromCharCode(48 + n);
			carry = 0;
			break;
		}
	}

	if (carry === 1) { arr.unshift("1"); }
	return arr.join("");
}

/**
 * 小数を指定桁に四捨五入する（文字列ベース、浮動小数点を使わない）
 * @param {string} intPart
 * @param {string} fracPart
 * @param {number} fracLimit
 * @returns {{ intPart: string, fracPart: string }}
 */
function roundFraction(intPart, fracPart, fracLimit) {
	const f = fracPart ?? "";
	if (f.length <= fracLimit) {
		return { intPart, fracPart: f };
	}

	const keep = f.slice(0, fracLimit);
	const nextDigit = f.charCodeAt(fracLimit) - 48; // 0..9

	if (nextDigit < 5) {
		return { intPart, fracPart: keep };
	}

	// 繰り上げ
	if (fracLimit === 0) {
		const newInt = addOne(intPart.length ? intPart : "0");
		return { intPart: newInt, fracPart: "" };
	}

	// 小数部を +1（桁あふれをcarryで扱う）
	let carry = 1;
	const arr = keep.split("");

	for (let i = arr.length - 1; i >= 0; i--) {
		const n = (arr[i].charCodeAt(0) - 48) + carry;
		if (n >= 10) {
			arr[i] = "0";
			carry = 1;
		} else {
			arr[i] = String.fromCharCode(48 + n);
			carry = 0;
			break;
		}
	}

	const newFrac = arr.join("");
	let newInt = intPart;

	if (carry === 1) {
		newInt = addOne(intPart.length ? intPart : "0");
	}

	return { intPart: newInt, fracPart: newFrac };
}

/**
 * digits ルールを生成する
 * @param {DigitsRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
export function digits(options = {}) {
	/** @type {DigitsRuleOptions} */
	const opt = {
		int: typeof options.int === "number" ? options.int : undefined,
		frac: typeof options.frac === "number" ? options.frac : undefined,
		countLeadingZeros: options.countLeadingZeros ?? true,
		fixIntOnBlur: options.fixIntOnBlur ?? "none",
		fixFracOnBlur: options.fixFracOnBlur ?? "none",
		modeInt: options.modeInt ?? "block",
		modeFrac: options.modeFrac ?? "block",
		forceFracOnBlur: options.forceFracOnBlur ?? false
	};

	return {
		name: "digits",
		targets: ["input"],

		/**
		 * 桁数チェック（入力中：エラーを積むだけ）
		 * @param {string} value
		 * @param {import("../text-input-guard.js").GuardContext} ctx
		 * @returns {void}
		 */
		validate(value, ctx) {
			const v = String(value);

			// 入力途中は極力うるさくしない（numericのfixに任せる）
			if (v === "" || v === "-" || v === "." || v === "-.") { return; }

			const { intPart, fracPart } = splitNumber(v);

			// 整数部桁数
			if (typeof opt.int === "number") {
				const intDigits = countIntDigits(intPart, opt.countLeadingZeros);
				if (intDigits > opt.int) {
					// 入力ブロック（int）
					if (opt.modeInt === "block") {
						ctx.requestRevert({
							reason: "digits.int_overflow",
							detail: { limit: opt.int, actual: intDigits }
						});
						return; // もう戻すので、以降は触らない
					}

					// エラー積むだけ（従来どおり）
					ctx.pushError({
						code: "digits.int_overflow",
						rule: "digits",
						phase: "validate",
						detail: { limit: opt.int, actual: intDigits }
					});
				}
			}

			// 小数部桁数
			if (typeof opt.frac === "number") {
				const fracDigits = (fracPart ?? "").length;
				if (fracDigits > opt.frac) {
					// 入力ブロック（frac）
					if (opt.modeFrac === "block") {
						ctx.requestRevert({
							reason: "digits.frac_overflow",
							detail: { limit: opt.frac, actual: fracDigits }
						});
						return;
					}

					ctx.pushError({
						code: "digits.frac_overflow",
						rule: "digits",
						phase: "validate",
						detail: { limit: opt.frac, actual: fracDigits }
					});
				}
			}
		},

		/**
		 * blur時の穏やか補正（整数部/小数部）
		 * - 整数部: truncateLeft / truncateRight / clamp
		 * - 小数部: truncate / round
		 * @param {string} value
		 * @param {import("../text-input-guard.js").GuardContext} _ctx
		 * @returns {string}
		 */
		fix(value, _ctx) {
			const v = String(value);
			if (v === "" || v === "-" || v === "." || v === "-.") { return v; }

			const parts = splitNumber(v);
			let { intPart, fracPart } = parts;
			const { sign, hasDot } = parts;

			// --- 整数部補正 ---
			if (typeof opt.int === "number" && opt.fixIntOnBlur !== "none") {
				// ※ 補正は「見た目の桁数」で判定（先頭ゼロ含む）
				const actual = (intPart ?? "").length;

				if (actual > opt.int) {
					if (opt.fixIntOnBlur === "truncateLeft") {
						// 末尾 opt.int 桁を残す（先頭＝大きい桁を削る）
						intPart = intPart.slice(intPart.length - opt.int);
					} else if (opt.fixIntOnBlur === "truncateRight") {
						// 先頭 opt.int 桁を残す（末尾＝小さい桁を削る）
						intPart = intPart.slice(0, opt.int);
					} else if (opt.fixIntOnBlur === "clamp") {
						intPart = "9".repeat(opt.int);
					}
				}
			}

			// --- 小数部補正 ---
			if (typeof opt.frac === "number" && opt.fixFracOnBlur !== "none" && hasDot) {
				const limit = opt.frac;
				const f = fracPart ?? "";

				if (f.length > limit) {
					if (opt.fixFracOnBlur === "truncate") {
						fracPart = f.slice(0, limit);
					} else if (opt.fixFracOnBlur === "round") {
						const rounded = roundFraction(intPart, f, limit);
						intPart = rounded.intPart;
						fracPart = rounded.fracPart;
					}
				}
			}

			if (opt.forceFracOnBlur && typeof opt.frac === "number" && opt.frac > 0) {
				const limit = opt.frac;
				// "." が無いなら作る（12 → 12.00）
				if (!hasDot) {
					fracPart = "";
				}
				// 足りない分を 0 埋め（12.3 → 12.30 / 12. → 12.00）
				const f = fracPart ?? "";
				if (f.length < limit) {
					fracPart = f + "0".repeat(limit - f.length);
				}
			}

			// 組み立て
			if (typeof opt.frac !== "number") {
				// frac未指定なら、dot があっても digits は触らず intだけ返す方針（現状維持）
				return `${sign}${intPart}`;
			}

			if (opt.frac === 0) {
				// 小数0桁なら常に整数表示
				return `${sign}${intPart}`;
			}

			// frac 指定あり（1以上）
			if (hasDot || (opt.forceFracOnBlur && opt.frac > 0)) {
				// "." が無いけど forceFracOnBlur の場合もここに来る
				const f = fracPart ?? "";
				return `${sign}${intPart}.${f}`;
			}

			// "." が無くて force もしないなら整数表示
			return `${sign}${intPart}`;
		}
	};
}

/**
 * datasetから digits ルールを生成する
 * - data-tig-rules-digits が無ければ null
 * - オプションは data-tig-rules-digits-xxx から読む
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-digits                          -> dataset.tigRulesDigits
 * - data-tig-rules-digits-int                      -> dataset.tigRulesDigitsInt
 * - data-tig-rules-digits-frac                     -> dataset.tigRulesDigitsFrac
 * - data-tig-rules-digits-count-leading-zeros      -> dataset.tigRulesDigitsCountLeadingZeros
 * - data-tig-rules-digits-fix-int-on-blur          -> dataset.tigRulesDigitsFixIntOnBlur
 * - data-tig-rules-digits-fix-frac-on-blur         -> dataset.tigRulesDigitsFixFracOnBlur
 * - data-tig-rules-digits-mode-int                 -> dataset.tigRulesDigitsModeInt
 * - data-tig-rules-digits-mode-frac                -> dataset.tigRulesDigitsModeFrac
 * - data-tig-rules-digits-force-frac-on-blur       -> dataset.tigRulesDigitsForceFracOnBlur
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
digits.fromDataset = function fromDataset(dataset, _el) {
	// ON判定
	if (dataset.tigRulesDigits == null) {
		return null;
	}

	/** @type {DigitsRuleOptions} */
	const options = {};

	// int / frac
	const intN = parseDatasetNumber(dataset.tigRulesDigitsInt);
	if (intN != null) {
		options.int = intN;
	}

	const fracN = parseDatasetNumber(dataset.tigRulesDigitsFrac);
	if (fracN != null) {
		options.frac = fracN;
	}

	// countLeadingZeros
	const clz = parseDatasetBool(dataset.tigRulesDigitsCountLeadingZeros);
	if (clz != null) {
		options.countLeadingZeros = clz;
	}

	// fixIntOnBlur / fixFracOnBlur
	const fixInt = parseDatasetEnum(dataset.tigRulesDigitsFixIntOnBlur, [
		"none",
		"truncateLeft",
		"truncateRight",
		"clamp"
	]);
	if (fixInt != null) {
		options.fixIntOnBlur = fixInt;
	}

	const fixFrac = parseDatasetEnum(dataset.tigRulesDigitsFixFracOnBlur, [
		"none",
		"truncate",
		"round"
	]);
	if (fixFrac != null) {
		options.fixFracOnBlur = fixFrac;
	}

	// modeInt / modeFrac
	const modeInt = parseDatasetEnum(dataset.tigRulesDigitsModeInt, ["block", "error"]);
	if (modeInt != null) {
		options.modeInt = modeInt;
	}

	const modeFrac = parseDatasetEnum(dataset.tigRulesDigitsModeFrac, ["block", "error"]);
	if (modeFrac != null) {
		options.modeFrac = modeFrac;
	}

	// forceFracOnBlur
	const forceFrac = parseDatasetBool(dataset.tigRulesDigitsForceFracOnBlur);
	if (forceFrac != null) {
		options.forceFracOnBlur = forceFrac;
	}

	return digits(options);
};
