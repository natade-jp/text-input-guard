/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import Encode from "./encode/Encode.js";
import Unicode from "./encode/Unicode.js";
import Japanese from "./language/Japanese.js";
import CharacterAnalyzer from "./tools/MojiAnalyzer.js";
import CP932 from "./encode/CP932.js";

/**
 * 日本語を扱うための様々な機能を提供します
 */
export default class Mojix {
	// ---------------------------------
	// 文字列のエンコードとデコードを扱う関数
	// ---------------------------------

	/**
	 * 文字列からバイナリ配列にエンコードする
	 * @param {string} text - 変換したいテキスト
	 * @param {string} charset - キャラセット(UTF-8/16/32,Shift_JIS,Windows-31J)
	 * @param {boolean} [is_with_bom=false] - BOMをつけるかどうか
	 * @returns {number[]} バイナリ配列(失敗時はnull)
	 */
	static encode(text, charset, is_with_bom) {
		return Encode.encode(text, charset, is_with_bom);
	}

	/**
	 * バイナリ配列から文字列にデコードする
	 * @param {number[]} binary - 変換したいバイナリ配列
	 * @param {string} [charset="autodetect"] - キャラセット(UTF-8/16/32,Shift_JIS,Windows-31J)
	 * @returns {string} 変換した文字列（失敗したらnull）
	 */
	static decode(binary, charset) {
		return Encode.decode(binary, charset);
	}

	// ---------------------------------
	// Unicode を扱う関数群
	// ---------------------------------

	/**
	 * サロゲートペア対応のコードポイント取得
	 * @param {string} text - 対象テキスト
	 * @param {number} [index = 0] - インデックス
	 * @returns {number} コードポイント
	 */
	static codePointAt(text, index) {
		return Unicode.codePointAt(text, index);
	}

	/**
	 * コードポイントの数値データを文字列に変換
	 * @param {...(number|number[])} codepoint - 変換したいコードポイントの数値配列、又は数値を並べた可変引数
	 * @returns {string} 変換後のテキスト
	 */
	static fromCodePoint(codepoint) {
		if (Array.isArray(codepoint)) {
			return Unicode.fromCodePoint(codepoint);
		} else {
			const codepoint_array = [];
			for (let i = 0; i < arguments.length; i++) {
				codepoint_array[i] = arguments[i];
			}
			return Unicode.fromCodePoint(codepoint_array);
		}
	}

	/**
	 * コードポイント換算で文字列数をカウント
	 * @param {string} text - 対象テキスト
	 * @param {number} [beginIndex=0] - 最初のインデックス（省略可）
	 * @param {number} [endIndex] - 最後のインデックス（ここは含めない）（省略可）
	 * @returns {number} 文字数
	 */
	static codePointCount(text, beginIndex, endIndex) {
		return Unicode.codePointCount(text, beginIndex, endIndex);
	}

	/**
	 * 文字列をUTF32(コードポイント)の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF32(コードポイント)のデータが入った配列
	 */
	static toUTF32Array(text) {
		return Unicode.toUTF32Array(text);
	}

	/**
	 * UTF32の配列から文字列に変換
	 * @param {number[]} utf32 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF32Array(utf32) {
		return Unicode.fromUTF32Array(utf32);
	}

	/**
	 * 文字列をUTF16の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF16のデータが入った配列
	 */
	static toUTF16Array(text) {
		return Unicode.toUTF16Array(text);
	}

	/**
	 * UTF16の配列から文字列に変換
	 * @param {number[]} utf16 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF16Array(utf16) {
		return Unicode.fromUTF16Array(utf16);
	}

	/**
	 * 文字列をUTF8の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF8のデータが入った配列
	 */
	static toUTF8Array(text) {
		return Unicode.toUTF8Array(text);
	}

	/**
	 * UTF8の配列から文字列に変換
	 * @param {number[]} utf8 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF8Array(utf8) {
		return Unicode.fromUTF8Array(utf8);
	}

	// ---------------------------------
	// 文字を扱う関数群
	// ---------------------------------

	/**
	 * 結合した文字を考慮して文字列を文字の配列に変換する
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[][]} UTF32(コードポイント)の配列が入った配列
	 */
	static toMojiArrayFromString(text) {
		return Japanese.toMojiArrayFromString(text);
	}

	/**
	 * 結合した文字を考慮して文字の配列を文字列に変換する
	 * @param {number[][]} mojiarray - UTF32(コードポイント)の配列が入った配列
	 * @returns {string} UTF32(コードポイント)の配列が入った配列
	 */
	static toStringFromMojiArray(mojiarray) {
		return Japanese.toStringFromMojiArray(mojiarray);
	}

	// ---------------------------------
	// 切り出しを扱う関数群
	// ---------------------------------

	/**
	 * 指定したテキストを切り出す
	 * - 単位はコードポイントの文字数
	 * - 結合文字, 異体字セレクタ, スキントーン修飾子, タグ文字を考慮しません
	 * @param {string} text - 切り出したいテキスト
	 * @param {number} offset - 切り出し位置
	 * @param {number} size - 切り出す長さ
	 * @returns {string} 切り出したテキスト
	 */
	static cutTextForCodePoint(text, offset, size) {
		return Unicode.cutTextForCodePoint(text, offset, size);
	}

	/**
	 * 指定したテキストの横幅を半角／全角でカウント
	 * - 0幅 ... グラフェムを構成する要素
	 *           （結合文字, 異体字セレクタ, スキントーン修飾子,
	 *            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
	 * - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
	 * - 2幅 ... 上記以外
	 * @param {string} text - カウントしたいテキスト
	 * @returns {number} 文字の横幅
	 */
	static getWidth(text) {
		return Japanese.getWidth(text);
	}

	/**
	 * 指定したテキストを切り出す
	 * - 0幅 ... グラフェムを構成する要素
	 *           （結合文字, 異体字セレクタ, スキントーン修飾子,
	 *            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
	 * - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
	 * - 2幅 ... 上記以外
	 * @param {string} text - 切り出したいテキスト
	 * @param {number} offset - 切り出し位置
	 * @param {number} size - 切り出す長さ
	 * @returns {string} 切り出したテキスト
	 */
	static cutTextForWidth(text, offset, size) {
		return Japanese.cutTextForWidth(text, offset, size);
	}

	// ---------------------------------
	// 面区点コードの変換用
	// ---------------------------------

	/**
	 * 指定した文字から Windows-31J 上の区点番号に変換
	 * - 2文字以上を指定した場合は、1文字目のみを変換する
	 * @param {string} text - 変換したいテキスト
	 * @returns {import('./encode/SJIS.js').MenKuTen} 区点番号(存在しない場合（1バイトのJISコードなど）はnullを返す)
	 */
	static toKuTen(text) {
		return CP932.toKuTen(text);
	}

	// ---------------------------------
	// 日本語の変換用の関数群
	// ---------------------------------

	/**
	 * カタカナをひらがなに変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHiragana(text) {
		return Japanese.toHiragana(text);
	}

	/**
	 * ひらがなをカタカナに変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toKatakana(text) {
		return Japanese.toKatakana(text);
	}

	/**
	 * スペースを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthSpace(text) {
		return Japanese.toHalfWidthSpace(text);
	}

	/**
	 * スペースを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthSpace(text) {
		return Japanese.toFullWidthSpace(text);
	}

	/**
	 * 英数記号を半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthAsciiCode(text) {
		return Japanese.toHalfWidthAsciiCode(text);
	}

	/**
	 * 英数記号を全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthAsciiCode(text) {
		return Japanese.toFullWidthAsciiCode(text);
	}

	/**
	 * アルファベットを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthAlphabet(text) {
		return Japanese.toHalfWidthAlphabet(text);
	}

	/**
	 * アルファベットを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthAlphabet(text) {
		return Japanese.toFullWidthAlphabet(text);
	}

	/**
	 * 数値を半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthNumber(text) {
		return Japanese.toHalfWidthNumber(text);
	}

	/**
	 * 数値を全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthNumber(text) {
		return Japanese.toFullWidthNumber(text);
	}

	/**
	 * カタカナを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthKana(text) {
		return Japanese.toHalfWidthKana(text);
	}

	/**
	 * カタカナを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthKana(text) {
		return Japanese.toFullWidthKana(text);
	}

	/**
	 * 半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidth(text) {
		return Japanese.toHalfWidth(text);
	}

	/**
	 * 全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidth(text) {
		return Japanese.toFullWidth(text);
	}

	/**
	 * ローマ字からひらがなに変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHiraganaFromRomaji(text) {
		return Japanese.toHiraganaFromRomaji(text);
	}

	/**
	 * ローマ字からカタカナに変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toKatakanaFromRomaji(text) {
		return Japanese.toKatakanaFromRomaji(text);
	}

	/**
	 * ひらがなからローマ字に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toRomajiFromHiragana(text) {
		return Japanese.toRomajiFromHiragana(text);
	}

	/**
	 * カタカナからローマ字に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toRomajiFromKatakana(text) {
		return Japanese.toRomajiFromKatakana(text);
	}

	// ---------------------------------
	// 1つの文字データに対して調査を行う
	// ---------------------------------

	/**
	 * 指定した1つのUTF-32 コードポイントに関して、解析を行い情報を返します
	 * @param {number} unicode_codepoint - UTF-32 のコードポイント
	 * @returns {import('./tools/MojiAnalyzer.js').MojiData} 文字の情報がつまったオブジェクト
	 */
	static getMojiData(unicode_codepoint) {
		return CharacterAnalyzer.getMojiData(unicode_codepoint);
	}
}
