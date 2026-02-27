/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import Unicode from "../encode/Unicode.js";
import SJIS from "../encode/SJIS.js";
import CP932 from "../encode/CP932.js";

/**
 * 調査用マップを作成するクラス
 * @ignore
 */
class MOJI_CHAR_MAP {
	/**
	 * 初期化
	 */
	static init() {
		if (MOJI_CHAR_MAP.is_initmap) {
			return;
		}
		MOJI_CHAR_MAP.is_initmap = true;
	}
}

/**
 * マップを初期化した否か
 */
MOJI_CHAR_MAP.is_initmap = false;

/**
 * 文字のエンコード情報
 * @typedef {Object} MojiEncodeData
 * @property {import('../encode/SJIS.js').MenKuTen} kuten 区点 コード
 * @property {number} cp932_code CP932(Windows-31J) コード
 * @property {number[]} utf8_array UTF-8 配列
 * @property {number[]} utf16_array UTF-16 配列
 * @property {number[]} utf32_array UTF-32 配列
 * @property {number[]} cp932_array CP932(Windows-31J) バイト配列
 * @property {number[]} shift_jis_array Shift_JIS バイト配列
 * @property {number[]} iso2022jp_array ISO-2022-JP バイト配列
 */

/**
 * 文字の種別情報
 * @typedef {Object} MojiTypeData
 * @property {boolean} is_regular_sjis Shift_JIS に登録された文字
 * @property {boolean} is_gaiji_cp932 Windows-31J(CP932) 外字
 * @property {boolean} is_IBM_extended_character Windows-31J(CP932) IBM拡張文字
 * @property {boolean} is_NEC_selection_IBM_extended_character Windows-31J(CP932) NEC選定IBM拡張文字
 * @property {boolean} is_NEC_special_character Windows-31J(CP932) NEC特殊文字
 * @property {number} kanji_suijun Shift_JIS-2004 を使用して漢字の水準調査(計算不可の場合 0)
 * @property {boolean} is_surrogate_pair 要 Unicode サロゲートペア
 * @property {string|null} control_name 制御文字名（制御文字ではない場合は null）
 * @property {boolean} is_control_character 制御文字
 * @property {string} blockname Unicodeブロック名
 * @property {boolean} is_kanji 漢字
 * @property {boolean} is_hiragana ひらがな
 * @property {boolean} is_katakana カタカナ
 * @property {boolean} is_fullwidth_ascii 全角ASCII
 * @property {boolean} is_halfwidth_katakana 半角カタカナ
 * @property {boolean} is_emoji 絵文字(絵文字表示されることが多い Unicode ブロックに属する文字)
 * @property {boolean} is_emoticons 顔文字(Emoticons ブロックに属する文字)
 * @property {boolean} is_symbol_base 記号(テキスト記号の定義だがVS16が続くと絵文字に切り替えが発生)
 * @property {boolean} is_gaiji 外字
 * @property {boolean} is_grapheme_component グラフェムを構成するための文字
 * @property {boolean} is_zero_width_character ゼロ幅文字
 * @property {boolean} is_combining_mark 結合文字
 * @property {boolean} is_variation_selector 異体字セレクタ
 * @property {boolean} is_skin_tone_modifier スキントーン修飾子
 * @property {boolean} is_tag_character タグ文字
 * @property {boolean} is_regional_indicator 国旗絵文字を構成するための Regional Indicator 文字（2文字で1つの国旗になる）
 */

/**
 * 文字の種別情報
 * @typedef {Object} MojiData
 * @property {MojiEncodeData} encode 文字のエンコード情報
 * @property {MojiTypeData} type 文字の種別情報
 * @property {string} character 解析した文字
 * @property {number} codepoint 解析した文字のコードポイント
 */

/**
 * 文字の解析用クラス
 * @ignore
 */
export default class MojiAnalyzer {
	/**
	 * 初期化
	 * @returns {MojiData}
	 * @ignore
	 */
	static _createMojiData() {
		/**
		 * @type {MojiEncodeData}
		 */
		const encode = {
			kuten: null,
			cp932_code: 0,
			utf8_array: [],
			utf16_array: [],
			utf32_array: [],
			cp932_array: [],
			shift_jis_array: [],
			iso2022jp_array: []
		};

		/**
		 * @type {MojiTypeData}
		 */
		const type = {
			is_regular_sjis: false,
			is_gaiji_cp932: false,
			is_IBM_extended_character: false,
			is_NEC_selection_IBM_extended_character: false,
			is_NEC_special_character: false,
			kanji_suijun: 0,
			is_surrogate_pair: false,
			control_name: null,
			is_control_character: false,
			blockname: "",
			is_kanji: false,
			is_hiragana: false,
			is_katakana: false,
			is_fullwidth_ascii: false,
			is_halfwidth_katakana: false,
			is_emoji: false,
			is_emoticons: false,
			is_symbol_base: false,
			is_gaiji: false,
			is_grapheme_component: false,
			is_zero_width_character: false,
			is_combining_mark: false,
			is_variation_selector: false,
			is_skin_tone_modifier: false,
			is_tag_character: false,
			is_regional_indicator: false
		};

		/**
		 * @type {MojiData}
		 */
		const data = {
			encode: encode,
			type: type,
			character: null,
			codepoint: 0
		};

		return data;
	}

	/**
	 * 指定した1つのUTF-32 コードポイントに関して、解析を行い情報を返します
	 * @param {number} unicode_codepoint - UTF-32 のコードポイント
	 * @returns {MojiData} 文字の情報がつまったオブジェクト
	 */
	static getMojiData(unicode_codepoint) {
		// 基本情報取得
		const cp932code = CP932.toCP932FromUnicode(unicode_codepoint);
		const kuten = SJIS.toKuTenFromSJISCode(cp932code);
		const is_regular_sjis = cp932code < 0x100 || SJIS.isRegularMenKuten(kuten);

		/**
		 * 出力データの箱を用意
		 * @type {MojiData}
		 */
		const data = MojiAnalyzer._createMojiData();
		const encode = data.encode;
		const type = data.type;
		const character = Unicode.fromCodePoint(unicode_codepoint);
		data.character = character;
		data.codepoint = unicode_codepoint;

		// 句点と面区点情報(ない場合はnullになる)
		encode.kuten = kuten;
		// コードの代入
		encode.cp932_code = cp932code ? cp932code : -1;

		// Shift_JIS として許容されるか
		type.is_regular_sjis = is_regular_sjis;

		// Windows-31J(CP932) に関しての調査
		// 外字, IBM拡張文字, NEC選定IBM拡張文字, NEC特殊文字
		// prettier-ignore
		type.is_gaiji_cp932 = cp932code ? 0xF040 <= cp932code && cp932code <= 0xF9FC : false;
		// prettier-ignore
		type.is_IBM_extended_character = cp932code ? 0xFA40 <= cp932code && cp932code <= 0xFC4B : false;
		// prettier-ignore
		type.is_NEC_selection_IBM_extended_character = cp932code ? 0xED40 <= cp932code && cp932code <= 0xEEFC : false;
		// prettier-ignore
		type.is_NEC_special_character = cp932code ? 0x8740 <= cp932code && cp932code <= 0x879C : false;

		// Unicodeの配列
		encode.utf8_array = Unicode.toUTF8Array(data.character);
		encode.utf16_array = Unicode.toUTF16Array(data.character);
		encode.utf32_array = [unicode_codepoint];
		type.is_surrogate_pair = encode.utf16_array.length > 1;

		// SJIS系の配列
		// prettier-ignore
		encode.cp932_array = cp932code ? (cp932code >= 0x100 ? [cp932code >> 8, cp932code & 0xFF] : [cp932code]) : [];

		// ISO-2022-JP , EUC-JP
		// prettier-ignore
		if (cp932code < 0xE0 || is_regular_sjis) {
			// prettier-ignore
			if (cp932code < 0x80) {
				encode.shift_jis_array = [cp932code];
				encode.iso2022jp_array = [];
				// prettier-ignore
			} else if (cp932code < 0xE0) {
				// 半角カタカナの扱い
				encode.shift_jis_array = [cp932code];
				encode.iso2022jp_array = [];
			} else if (kuten.ku <= 94) {
				// 区点は94まで利用できる。
				// つまり、最大でも 94 + 0xA0 = 0xFE となり 0xFF 以上にならない
				encode.shift_jis_array = [encode.cp932_array[0], encode.cp932_array[1]];
				encode.iso2022jp_array = [kuten.ku + 0x20, kuten.ten + 0x20];
			}
		} else {
			encode.shift_jis_array = [];
			encode.iso2022jp_array = [];
		}
		// SJISとして正規でなければ強制エンコード失敗
		if (!is_regular_sjis) {
			encode.shift_jis_array = [];
			encode.iso2022jp_array = [];
		}

		// 制御文字かどうか
		type.control_name = Unicode.toControlCharcterName(unicode_codepoint);
		type.is_control_character = type.control_name ? true : false;

		// Unicodeのブロック名
		type.blockname = Unicode.toBlockNameFromUnicode(unicode_codepoint);
		// ブロック名から判断
		type.is_kanji = /Ideographs/.test(type.blockname);
		type.is_hiragana = /Hiragana/.test(type.blockname);
		type.is_katakana = /Katakana/.test(type.blockname);
		type.is_fullwidth_ascii = /[\u3000\uFF01-\uFF5E]/.test(data.character);
		type.is_halfwidth_katakana = /[\uFF61-\uFF9F]/.test(data.character);
		// 絵文字
		type.is_emoji = /Pictographs|Transport and Map Symbols/.test(type.blockname);
		// 顔文字
		type.is_emoticons = /Emoticons/.test(type.blockname);
		// 記号(VS16 が付くと絵文字化)
		type.is_symbol_base = /Dingbats|Miscellaneous Symbols/.test(type.blockname);
		// 外字
		type.is_gaiji = /Private Use Area/.test(type.blockname);
		// グラフェムを構成するための文字
		type.is_grapheme_component = Unicode.isGraphemeComponentFromCodePoint(unicode_codepoint);
		// 横幅が 0 の文字
		type.is_zero_width_character = Unicode.isZeroWidthCharacterFromCodePoint(unicode_codepoint);
		// 結合文字
		type.is_combining_mark = Unicode.isCombiningMarkFromCodePoint(unicode_codepoint);
		// 異体字セレクタ
		type.is_variation_selector = Unicode.isVariationSelectorFromCodePoint(unicode_codepoint);
		// スキントーン修飾子
		type.is_skin_tone_modifier = Unicode.isEmojiModifierFromCodePoint(unicode_codepoint);
		// タグ文字
		type.is_tag_character = Unicode.isTagCharacterFromCodePoint(unicode_codepoint);
		// 国旗絵文字を構成するためのRI文字
		type.is_regional_indicator = Unicode.isRegionalIndicatorFromCodePoint(unicode_codepoint);

		return data;
	}
}
