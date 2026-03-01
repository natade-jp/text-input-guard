/* eslint-disable max-len */
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
import SJIS from "./libs/encode/SJIS.js";
import CP932 from "./libs/encode/CP932.js";
import { parseDatasetEnum, parseDatasetEnumList } from "./_dataset.js";

/**
 * filter ルールのカテゴリ名
 *
 * - "digits"         : ASCII 数字 (0-9)
 * - "alpha-upper"    : ASCII 英字大文字 (A-Z)
 * - "alpha-lower"    : ASCII 英字小文字 (a-z)
 * - "ascii"          : ASCII 可視文字 + スペース含む (U+0020–U+007E)
 * - "hiragana"       : ひらがな (U+3040–U+309F)
 * - "katakana-full"  : 全角カタカナ (U+30A0–U+30FF)
 * - "katakana-half"  : 半角カタカナ (U+FF65–U+FF9F)
 * - "bmp-only"       : BMP のみ許可（U+0000–U+FFFF、サロゲートペア、補助平面禁止）
 * - "sjis-only"      : 正規 Shift_JIS（JIS X 0208 + 1バイト領域）のみ許可
 * - "cp932-only"     : Windows-31J (CP932) でエンコード可能な文字のみ許可
 * - "single-codepoint-only" : 単一コードポイントのみ許可（結合文字や異体字セレクタを含まない）
 *
 * @typedef {"digits"|"alpha-upper"|"alpha-lower"|"ascii"|"hiragana"|"katakana-full"|"katakana-half"|"bmp-only"|"sjis-only"|"cp932-only"|"single-codepoint-only"} FilterCategory
 */

/**
 * グラフェム（1グラフェムは、UTF-32の配列）
 * @typedef {number[]} Grapheme
 */

/** @type {readonly FilterCategory[]} */
const FILTER_CATEGORIES = [
	"digits",
	"alpha-upper",
	"alpha-lower",
	"ascii",
	"hiragana",
	"katakana-full",
	"katakana-half",
	"bmp-only",
	"sjis-only",
	"cp932-only",
	"single-codepoint-only"
];

/**
 * filter ルールの動作モード
 * @typedef {"drop"|"error"} FilterMode
 */

/**
 * filter ルールのオプション
 * - category は和集合で扱う（複数指定OK）
 * - allow は追加許可（和集合）
 * - deny は除外（差集合）
 *
 * allowed = (category の和集合 ∪ allow) − deny
 *
 * @typedef {Object} FilterRuleOptions
 * @property {FilterMode} [mode="drop"] - drop: 不要文字を削除 / error: 削除せずエラーを積む
 * @property {FilterCategory[]} [category] - カテゴリ（配列）
 * @property {RegExp|string} [allow] - 追加で許可する正規表現（1文字にマッチさせる想定）
 * @property {string} [allowFlags] - allow が文字列のときの flags（"iu" など。g/y は無視）
 * @property {RegExp|string} [deny] - 除外する正規表現（1文字にマッチさせる想定）
 * @property {string} [denyFlags] - deny が文字列のときの flags（"iu" など。g/y は無視）
 */

/**
 * /g や /y は lastIndex の罠があるので除去して使う
 * @param {string} flags
 * @returns {string}
 */
const stripStatefulFlags = function (flags) {
	return String(flags || "").replace(/[gy]/g, "");
};

/**
 * 正規表現（RegExp または pattern 文字列）を安全に RegExp 化する
 * - g/y を外す
 * - string の場合、flags 未指定なら "u" を付ける
 *
 * @param {RegExp|string|undefined} reOrPattern
 * @param {string|undefined} flags
 * @returns {RegExp|undefined}
 */
const toSafeRegExp = function (reOrPattern, flags) {
	if (reOrPattern == null) {
		return;
	}

	if (reOrPattern instanceof RegExp) {
		const safeFlags = stripStatefulFlags(reOrPattern.flags);
		return new RegExp(reOrPattern.source, safeFlags);
	}

	const f = stripStatefulFlags(flags ?? "u");
	return new RegExp(String(reOrPattern), f);
};

/**
 * カテゴリ判定関数を作る
 * @param {FilterCategory[]} categories
 * @returns {(g: Grapheme, s: string) => boolean}
 */
const createCategoryTester = function (categories) {
	/** @type {Record<FilterCategory, (g: Grapheme, s: string) => boolean>} */
	const table = {
		digits: (g, s) => {
			return g.length === 1 && g[0] >= 0x30 && g[0] <= 0x39; // '0'..'9'
		},
		"alpha-upper": (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			// 'A'..'Z'
			return c >= 0x41 && c <= 0x5A;
		},
		"alpha-lower": (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			// 'a'..'z'
			return c >= 0x61 && c <= 0x7A;
		},
		ascii: (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			return c >= 0x20 && c <= 0x7E;
		},
		hiragana: (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			return c >= 0x3040 && c <= 0x309F;
		},
		"katakana-full": (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			return c >= 0x30A0 && c <= 0x30FF;
		},
		"katakana-half": (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			return c >= 0xFF65 && c <= 0xFF9F;
		},
		"bmp-only": (g, s) => {
			// BMPのみ（サロゲートペア禁止）
			return g.every((cp) => cp <= 0xFFFF);
		},
		"sjis-only": (g, s) => {
			// Shift_JIS でエンコードできる文字かどうか
			if (g.length !== 1) { return false; }
			const cp932code = CP932.toCP932FromUnicode(g[0]);
			if (cp932code === undefined) { return false; }
			const kuten = SJIS.toKuTenFromSJISCode(cp932code);
			if (cp932code < 0x100) {
				return true;
			}
			if (!SJIS.isRegularMenKuten(kuten)) { return false; }
			return kuten.ku <= 94;
		},
		"cp932-only": (g, s) => {
			// Windows-31J (cp932) でエンコードできる文字かどうか
			if (g.length !== 1) { return false; }
			return CP932.toCP932FromUnicode(g[0]) !== undefined;
		},
		"single-codepoint-only": (g, s) => {
			// 1グラフェムが単一コードポイントのみで構成されていること
			return g.length === 1;
		}
	};

	// categories は「和集合」なので、該当する tester だけ抜いて使う
	const list = categories.map((c) => table[c]).filter(Boolean);

	if (list.length === 0) {
		return function () {
			return false;
		};
	}

	return function (g, s) {
		for (const test of list) {
			if (test(g, s)) {
				return true;
			}
		}
		return false;
	};
};

/**
 * 1文字が許可されるか判定する関数を作る
 * @param {FilterCategory[]} categoryList
 * @param {(graphem: Grapheme, s: string) => boolean} categoryTest
 * @param {RegExp|undefined} allowRe
 * @param {RegExp|undefined} denyRe
 * @returns {(g: Grapheme, s: string) => boolean}
 */
const createAllowedTester = function (categoryList, categoryTest, allowRe, denyRe) {
	const hasCategory = categoryList.length > 0;
	const hasAllow = allowRe != null;
	const hasDeny = denyRe != null;

	// deny だけの指定は「deny に当たる文字だけ落とす」ルールとして扱う
	const denyOnly = !hasCategory && !hasAllow && hasDeny;

	return function (g, s) {
		if (denyRe && denyRe.test(s)) {
			return false;
		}

		if (denyOnly) {
			return true;
		}

		if (hasCategory && categoryTest(g, s)) {
			return true;
		}
		if (allowRe && allowRe.test(s)) {
			return true;
		}

		return false;
	};
};

/**
 * 文字列を走査して、許可文字のみの文字列と、不正文字の集計を返す
 * @param {string} value
 * @param {(g: Grapheme, s: string) => boolean} isAllowed
 * @param {number} [maxInvalidChars=20]
 * @returns {{ filtered: string, invalidCount: number, invalidChars: string[] }}
 */
const scanByAllowed = function (value, isAllowed, maxInvalidChars = 20) {
	const v = String(value);

	let filtered = "";
	let invalidCount = 0;

	/** @type {Set<string>} */
	const invalidSet = new Set();

	/**
	 * グラフェムの配列
	 * @type {Grapheme[]}
	 */
	const graphemArray = Mojix.toMojiArrayFromString(v);

	// JS の文字列イテレータはコードポイント単位で回るので Array.from は不要
	for (const g of graphemArray) {
		const s = Mojix.toStringFromMojiArray([g]);
		if (isAllowed(g, s)) {
			filtered += s;
		} else {
			invalidCount++;
			if (invalidSet.size < maxInvalidChars) {
				invalidSet.add(s);
			}
		}
	}

	return {
		filtered,
		invalidCount,
		invalidChars: Array.from(invalidSet)
	};
};

/**
 * filter ルールを生成する
 * - mode="drop": 不要文字を落とすだけ
 * - mode="error": 文字は落とさず validate でエラーを積む
 *
 * @param {FilterRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
export function filter(options = {}) {
	/** @type {FilterRuleOptions} */
	const opt = {
		mode: options.mode ?? "drop",
		category: options.category ?? [],
		allow: options.allow,
		allowFlags: options.allowFlags,
		deny: options.deny,
		denyFlags: options.denyFlags
	};

	const categoryList = opt.category;
	const categoryTest = createCategoryTester(categoryList);

	const allowRe = toSafeRegExp(opt.allow, opt.allowFlags);
	const denyRe = toSafeRegExp(opt.deny, opt.denyFlags);

	const isAllowed = createAllowedTester(categoryList, categoryTest, allowRe, denyRe);

	const hasAny = categoryList.length > 0 || allowRe != null || denyRe != null;

	return {
		name: "filter",
		targets: ["input", "textarea"],

		/**
		 * 許可集合で落とす（drop モードのみ）
		 * @param {string} value
		 * @param {import("../text-input-guard.js").GuardContext} ctx
		 * @returns {string}
		 */
		normalizeChar(value, ctx) {
			if (!hasAny) {
				return value;
			}

			// error モードは何も落とさない（全て通す）
			if (opt.mode === "error") {
				return value;
			}

			return scanByAllowed(value, isAllowed).filtered;
		},

		/**
		 * 不正文字が含まれていたらエラーを積む（error モードのみ）
		 * @param {string} value
		 * @param {import("../text-input-guard.js").GuardContext} ctx
		 * @returns {void}
		 */
		validate(value, ctx) {
			if (!hasAny) {
				return;
			}
			if (opt.mode !== "error") {
				return;
			}

			const v = String(value);
			if (v === "") {
				return;
			}

			const r = scanByAllowed(v, isAllowed);
			if (r.invalidCount > 0) {
				ctx.pushError({
					code: "filter.invalid_char",
					rule: "filter",
					phase: "validate",
					detail: {
						count: r.invalidCount,
						chars: r.invalidChars,
						category: categoryList,
						hasAllow: allowRe != null,
						hasDeny: denyRe != null
					}
				});
			}
		}
	};
}

/**
 * datasetから filter ルールを生成する
 * - data-tig-rules-filter が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-filter               -> dataset.tigRulesFilter
 * - data-tig-rules-filter-mode          -> dataset.tigRulesFilterMode ("drop"|"error")
 * - data-tig-rules-filter-category      -> dataset.tigRulesFilterCategory ("a,b,c")
 * - data-tig-rules-filter-allow         -> dataset.tigRulesFilterAllow
 * - data-tig-rules-filter-allow-flags   -> dataset.tigRulesFilterAllowFlags
 * - data-tig-rules-filter-deny          -> dataset.tigRulesFilterDeny
 * - data-tig-rules-filter-deny-flags    -> dataset.tigRulesFilterDenyFlags
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {import("../text-input-guard.js").Rule|null}
 */
filter.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesFilter == null) {
		return null;
	}

	/** @type {FilterRuleOptions} */
	const options = {};

	const mode = parseDatasetEnum(dataset.tigRulesFilterMode, ["drop", "error"]);
	if (mode != null) {
		options.mode = mode;
	}

	const category = parseDatasetEnumList(dataset.tigRulesFilterCategory, FILTER_CATEGORIES);
	if (category != null) {
		options.category = category;
	}

	if (dataset.tigRulesFilterAllow != null) {
		const s = String(dataset.tigRulesFilterAllow).trim();
		if (s !== "") {
			options.allow = s;
		}
	}

	if (dataset.tigRulesFilterAllowFlags != null) {
		const s = String(dataset.tigRulesFilterAllowFlags).trim();
		if (s !== "") {
			options.allowFlags = s;
		}
	}

	if (dataset.tigRulesFilterDeny != null) {
		const s = String(dataset.tigRulesFilterDeny).trim();
		if (s !== "") {
			options.deny = s;
		}
	}

	if (dataset.tigRulesFilterDenyFlags != null) {
		const s = String(dataset.tigRulesFilterDenyFlags).trim();
		if (s !== "") {
			options.denyFlags = s;
		}
	}

	return filter(options);
};
