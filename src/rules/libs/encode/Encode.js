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
import CP932 from "./CP932.js";

/**
 * Encode用のツールクラス
 * @ignore
 */
class EncodeTools {
	/**
	 * キャラセット名の正規化
	 * @param {string} charset
	 * @returns {string}
	 */
	static normalizeCharSetName(charset) {
		let x1, x2;
		let is_with_bom = false;
		// BOM の文字がある場合は BOM 付きとする
		if (/^bom\s+|\s+bom\s+|\s+bom$/i.test(x1)) {
			is_with_bom = true;
			x1 = charset.replace(/^bom\s+|(\s+with)?\s+bom\s+|(\s+with\s*)?\s+bom$/, "");
		} else {
			x1 = charset;
		}
		if (/^(unicode-1-1-utf-8|UTF[-_]?8)$/i.test(x1)) {
			x2 = "UTF-8";
		} else if (/^(csunicode|iso-10646-ucs-2|ucs-2|Unicode|UnicodeFEFF|UTF[-_]?16([-_]?LE)?)$/i.test(x1)) {
			x2 = "UTF-16LE";
		} else if (/^(UnicodeFFFE|UTF[-_]?16[-_]?BE)$/i.test(x1)) {
			x2 = "UTF-16BE";
		} else if (/^(utf32_littleendian|UTF[-_]?32([-_]?LE)?)$/i.test(x1)) {
			x2 = "UTF-32LE";
		} else if (/^(utf32_bigendian|UTF[-_]?32[-_]?BE)$/i.test(x1)) {
			x2 = "UTF-32BE";
		} else if (/^(csshiftjis|ms_kanji|(cp|ms)932|shift[-_]?jis|sjis|Windows[-_]?31J|x-sjis)$/i.test(x1)) {
			x2 = "Shift_JIS";
		} else {
			x2 = x1;
		}
		if (is_with_bom) {
			x2 += " with BOM";
		}
		return x2;
	}

	/**
	 * 同一の種別の文字列の重なりをカウントする
	 * @param {number[]} utf32_array
	 * @returns {number}
	 */
	static countWord(utf32_array) {
		let count = 0;
		let type;
		let old_type = -1;
		for (let i = 0; i < utf32_array.length; i++) {
			const ch = utf32_array[i];
			// a-zA-Z
			// prettier-ignore
			if ((0x41 <= ch && ch <= 0x5A) || (0x61 <= ch && ch <= 0x6A)) {
				type = 1;
			// prettier-ignore
			} else if (0x30 <= ch && ch <= 0x39) {
				// 0-9
				type = 2;
			// prettier-ignore
			} else if (0x3041 <= ch && ch <= 0x3093) {
				// ぁ-ん
				type = 3;
			// prettier-ignore
			} else if (0x30A1 <= ch && ch <= 0x30F3) {
				// ァ-ン
				type = 4;
			// prettier-ignore
			} else if ((0xFF21 <= ch && ch <= 0xFF3A) || (0xFF41 <= ch && ch <= 0xFF5A)) {
				// 全角英字
				type = 5;
			} else if (0xFF10 <= ch && ch <= 0xFF19) {
				// 全角数値
				type = 6;
			// prettier-ignore
			} else if (0xFF61 <= ch && ch < 0xFFA0) {
			// 半角カタカナ
				type = 7;
			// prettier-ignore
			} else if ((0x3400 <= ch && ch < 0xA000) || (0x20000 <= ch && ch < 0x2FA20)) {
				// CJK統合漢字拡張A - CJK統合漢字, 追加漢字面
				type = 8;
			} else {
				old_type = -1;
				continue;
			}
			if (type === old_type) {
				count++;
			}
			old_type = type;
		}
		return count;
	}
}

/**
 * 文字データのバイナリへのエンコード、文字列へのデコードを扱うクラス
 * @ignore
 */
export default class Encode {
	/**
	 * 文字列からバイナリ配列にエンコードする
	 * @param {string} text - 変換したいテキスト
	 * @param {string} charset - キャラセット(UTF-8/16/32,Shift_JIS,Windows-31J,Shift_JIS-2004,EUC-JP,EUC-JP-2004)
	 * @param {boolean} [is_with_bom=true] - BOMをつけるかどうか
	 * @returns {number[]} バイナリ配列(失敗時はnull)
	 */
	static encode(text, charset, is_with_bom) {
		const ncharset = charset ? EncodeTools.normalizeCharSetName(charset) : "autodetect";
		if (/^UTF-(8|16|32)/i.test(ncharset)) {
			const utf32_array = Unicode.toUTF32Array(text);
			return Unicode.toUTFBinaryFromCodePoint(utf32_array, ncharset, is_with_bom);
		} else if (/^Shift_JIS$/i.test(ncharset)) {
			return CP932.toCP932Binary(text);
		}
		return null;
	}

	/**
	 * バイナリ配列から文字列にデコードする
	 * @param {number[]} binary - 変換したいバイナリ配列
	 * @param {string} [charset="autodetect"] - キャラセット(UTF-8/16/32,Shift_JIS)
	 * @returns {string} 変換した文字列（失敗したらnull）
	 */
	static decode(binary, charset) {
		const ncharset = charset ? EncodeTools.normalizeCharSetName(charset) : "autodetect";
		if (/^UTF-(8|16|32)/i.test(ncharset)) {
			const ret = Unicode.toCodePointFromUTFBinary(binary, charset);
			if (ret) {
				return Unicode.fromUTF32Array(ret);
			}
		} else if (/^Shift_JIS$/i.test(ncharset)) {
			return CP932.fromCP932Array(binary);
		}
		return null;
	}
}
