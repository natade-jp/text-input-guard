/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import Unicode from "./Unicode.js";

/**
 * 面区点情報
 * @typedef {Object} MenKuTen
 * @property {string} [text] 面-区-点
 * @property {number} [men=1] 面
 * @property {number} ku 区
 * @property {number} ten 点
 */

/**
 * Shift_JIS を扱うクラス
 * @ignore
 */
export default class SJIS {
	/**
	 * 文字列を Shift_JIS の配列に変換。変換できない文字は "?" に変換される。
	 * @param {string} text - 変換したいテキスト
	 * @param {Record<number, number>} unicode_to_sjis - Unicode から Shift_JIS への変換マップ
	 * @returns {number[]} Shift_JIS のデータが入った配列
	 * @ignore
	 */
	static toSJISArray(text, unicode_to_sjis) {
		const map = unicode_to_sjis;
		const utf32 = Unicode.toUTF32Array(text);
		const sjis = [];
		const ng = "?".charCodeAt(0);
		for (let i = 0; i < utf32.length; i++) {
			const map_bin = map[utf32[i]];
			if (map_bin) {
				sjis.push(map_bin);
			} else {
				sjis.push(ng);
			}
		}
		return sjis;
	}

	/**
	 * 文字列を Shift_JIS のバイナリ配列に変換。変換できない文字は "?" に変換される。
	 * - 日本語文字は2バイトとして、配列も2つ分、使用します。
	 * @param {string} text - 変換したいテキスト
	 * @param {Record<number, number>} unicode_to_sjis - Unicode から Shift_JIS への変換マップ
	 * @returns {number[]} Shift_JIS のデータが入ったバイナリ配列
	 * @ignore
	 */
	static toSJISBinary(text, unicode_to_sjis) {
		const sjis = SJIS.toSJISArray(text, unicode_to_sjis);
		const sjisbin = [];
		for (let i = 0; i < sjis.length; i++) {
			if (sjis[i] < 0x100) {
				sjisbin.push(sjis[i]);
			} else {
				sjisbin.push(sjis[i] >> 8);
				sjisbin.push(sjis[i] & 0xFF);
			}
		}
		return sjisbin;
	}

	/**
	 * SJISの配列から文字列に変換
	 * @param {number[]} sjis - 変換したいテキスト
	 * @param {Record<number, number|number[]>} sjis_to_unicode - Shift_JIS から Unicode への変換マップ
	 * @returns {string} 変換後のテキスト
	 * @ignore
	 */
	static fromSJISArray(sjis, sjis_to_unicode) {
		const map = sjis_to_unicode;
		const utf16 = [];
		const ng = "?".charCodeAt(0);
		for (let i = 0; i < sjis.length; i++) {
			let x = sjis[i];
			/**
			 * @type {number|number[]}
			 */
			let y;
			if (x >= 0x100) {
				// すでに1つの変数にまとめられている
				y = map[x];
			} else {
				// 2バイト文字かのチェック
				// prettier-ignore
				if ((0x81 <= x && x <= 0x9F) || (0xE0 <= x && x <= 0xFC)) {
					x <<= 8;
					i++;
					x |= sjis[i];
					y = map[x];
				} else {
					y = map[x];
				}
			}
			if (y) {
				// 配列なら配列を結合
				// ※ Unicodeの結合文字の可能性があるため
				if (Array.isArray(y)) {
					for (let j = 0; j < y.length; j++) {
						utf16.push(y[j]);
					}
				} else {
				// 値しかない場合は値を結合
					utf16.push(y);
				}
			} else {
				utf16.push(ng);
			}
		}
		return Unicode.fromUTF32Array(utf16);
	}

	/**
	 * 指定したコードポイントの文字から Shift_JIS 上の符号化数値に変換
	 * @param {number} unicode_codepoint - Unicodeのコードポイント
	 * @param {Record<number, number>} unicode_to_sjis - Unicode から Shift_JIS への変換マップ
	 * @returns {number} 符号化数値(変換できない場合はnullとなる)
	 * @ignore
	 */
	static toSJISCodeFromUnicode(unicode_codepoint, unicode_to_sjis) {
		if (!unicode_to_sjis[unicode_codepoint]) {
			return null;
		}
		const utf16_text = Unicode.fromUTF32Array([unicode_codepoint]);
		const sjis_array = SJIS.toSJISArray(utf16_text, unicode_to_sjis);
		return sjis_array[0];
	}

	/**
	 * 指定した Shift_JIS のコードから区点番号に変換
	 * @param {number} sjis_code - Shift_JIS のコードポイント
	 * @returns {MenKuTen} 区点番号(存在しない場合（1バイトのJISコードなど）はnullを返す)
	 */
	static toKuTenFromSJISCode(sjis_code) {
		if (!sjis_code) {
			return null;
		}
		const x = sjis_code;
		if (x < 0x100) {
			return null;
		}
		// アルゴリズムは区点番号表からリバースエンジニアリング

		let s1 = x >> 8;
		let s2 = x & 0xFF;

		/** @type {number} */
		let ku;

		// 区の計算方法の切り替え
		// 63区から、0x9F→0xE0に飛ぶ
		// prettier-ignore
		if (s1 < 0xE0) {
			s1 = s1 - 0x81;
		} else {
			s1 = s1 - 0xC1;
		}

		// 区情報の位置判定
		// prettier-ignore
		if (s2 < 0x9F) {
			ku = s1 * 2 + 1;
			// 点情報の計算方法の切り替え
			// 0x7Fが欠番のため「+1」を除去
			// prettier-ignore
			if (s2 < 0x80) {
				// prettier-ignore
				s2 = s2 - 0x40 + 1;
			} else {
				// prettier-ignore
				s2 = s2 - 0x40;
			}
		} else {
			ku = s1 * 2 + 2;
			// prettier-ignore
			s2 = s2 - 0x9F + 1;
		}

		// 点情報の位置判定
		const ten = s2;

		return {
			text: ku + "-" + ten,
			men: 1,
			ku: ku,
			ten: ten
		};
	}

	/**
	 * 指定した面区点番号から Shift_JIS の仕様上、正規な物か判定
	 * @param {MenKuTen|string} menkuten - 面区点番号（面が省略された場合は、1とみなす）
	 * @returns {boolean} 正規なデータは true, 不正なデータは false
	 */
	static isRegularMenKuten(menkuten) {
		let m, k, t;

		// 引数のテスト
		if (menkuten instanceof Object) {
			m = menkuten.men ? menkuten.men : 1;
			k = menkuten.ku;
			t = menkuten.ten;
		} else if (typeof menkuten === "string") {
			const strmkt = menkuten.split("-");
			if (strmkt.length === 3) {
				m = parseInt(strmkt[0], 10);
				k = parseInt(strmkt[1], 10);
				t = parseInt(strmkt[2], 10);
			} else if (strmkt.length === 2) {
				m = 1;
				k = parseInt(strmkt[0], 10);
				t = parseInt(strmkt[1], 10);
			} else {
				return false;
			}
		} else {
			return false;
		}

		/**
		 * @type {Record<number, number>}
		 */
		const kmap = { 1: 1, 3: 1, 4: 1, 5: 1, 8: 1, 12: 1, 13: 1, 14: 1, 15: 1 };
		if (m === 1) {
			// 1面は1-94区まで存在
			if (!(1 <= k && k <= 94)) {
				return false;
			}
		} else if (m === 2) {
			// 2面は、1,3,4,5,8,12,13,14,15,78-94区まで存在
			if (!(kmap[k] || (78 <= k && k <= 94))) {
				return false;
			}
		} else {
			// 面が不正
			return false;
		}
		// 点は1-94点まで存在
		if (!(1 <= t && t <= 94)) {
			return false;
		}
		return true;
	}
}
