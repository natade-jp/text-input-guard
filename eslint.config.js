// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import jestPlugin from "eslint-plugin-jest";
import unicornPlugin from "eslint-plugin-unicorn";
import jsoncPlugin from "eslint-plugin-jsonc";
import * as jsoncParser from "jsonc-eslint-parser";

export default [
	// ---- ESLint recommended ----
	js.configs.recommended,

	// ---- Global ignore ----
	{
		ignores: [
			"**/node_modules/**",
			"**/build/**",
			"**/dist/**",
			"**/out/**",
			"**/html/**",
			"**/docs/**",

			"**/*.md",
			"package-lock.json"
		]
	},

	// ---- JSON ----
	{
		files: ["**/*.json"],
		languageOptions: {
			parser: jsoncParser
		},
		plugins: {
			jsonc: jsoncPlugin
		},
		rules: {
			// インデントはタブで統一する
			"jsonc/indent": ["error", "tab"],

			// 文字列は常にダブルクォートを使用する
			"jsonc/quotes": ["error", "double"],

			// 末尾カンマは禁止する
			"jsonc/comma-dangle": ["error", "never"],

			// オブジェクトの {} の内側には必ずスペースを入れる
			"jsonc/object-curly-spacing": ["error", "always"],

			// 配列の [] の内側にはスペースを入れない
			"jsonc/array-bracket-spacing": ["error", "never"],

			// 複数行のオブジェクトは、各プロパティを改行して記述する
			"jsonc/object-curly-newline": ["error", { multiline: true, consistent: true }]
		}
	},

	// ---- JS ----
	{
		files: ["**/*.js"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		plugins: {
			jest: jestPlugin,
			unicorn: unicornPlugin
		},
		rules: {
			// インデントはタブ、switch の case は 1 段下げる
			indent: ["error", "tab", { SwitchCase: 1 }],

			// 改行コードは LF（Unix）に統一する
			"linebreak-style": ["error", "unix"],

			// 文字列はダブルクォート（必要ならエスケープ回避を許可）
			quotes: ["error", "double", { avoidEscape: true }],

			// 文末は必ずセミコロンを付ける
			semi: ["error", "always"],

			// 末尾カンマは禁止する
			"comma-dangle": ["error", "never"],

			// 定数条件（while(true) 等）は原則禁止（警告）
			"no-constant-condition": 1,

			// 未使用変数は原則禁止（警告）
			"no-unused-vars": 1,

			// console の使用は原則禁止（警告）
			"no-console": 1,

			// var は禁止し、let/const を使う
			"no-var": 2,

			// 再代入しない変数は const を優先する
			"prefer-const": 2,

			// 16進数リテラルは大文字（0xFF など）に統一する
			"unicorn/number-literal-case": ["error", { hexadecimalValue: "uppercase" }],

			// 以下は、Prettier 寄り（autofix重視）

			// オブジェクトのキーのクォートは不要な場合は省略する
			"quote-props": ["error", "as-needed"],

			// オブジェクトの {} の内側には必ずスペースを入れる
			"object-curly-spacing": ["error", "always"],

			// 配列の [] の内側にはスペースを入れない
			"array-bracket-spacing": ["error", "never"],

			// 計算プロパティの [] の内側にはスペースを入れない
			"computed-property-spacing": ["error", "never"],

			// カンマの前後のスペース（前なし・後あり）を統一する
			"comma-spacing": ["error", { before: false, after: true }],

			// オブジェクトのキーと : の前後スペース（前なし・後あり）を統一する
			"key-spacing": ["error", { beforeColon: false, afterColon: true }],

			// キーワード（if/for 等）の後ろのスペースを必須にする
			"keyword-spacing": ["error", { before: true, after: true }],

			// 演算子の前後にはスペースを入れる
			"space-infix-ops": "error",

			// ブロック開始の前にはスペースを入れる
			"space-before-blocks": ["error", "always"],

			// ブロック内の先頭/末尾にはスペースを入れる（{ a } の a の前後）
			"block-spacing": ["error", "always"],

			// 括弧内（( )）にはスペースを入れない
			"space-in-parens": ["error", "never"],

			// 関数呼び出しの前後に余計なスペースを入れない
			"func-call-spacing": ["error", "never"],

			// 行末の余計なスペースは禁止する
			"no-trailing-spaces": "error",

			// ファイル末尾は必ず改行で終える
			"eol-last": ["error", "always"],

			// 連続する空行は最大 1 行まで（先頭/末尾の空行は禁止）
			"no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 0 }],

			// ブロックの先頭/末尾の空行は禁止する
			"padded-blocks": ["error", "never"],

			// カンマは行末に置く（行頭カンマ禁止）
			"comma-style": ["error", "last"],

			// else/catch/finally は } と同じ行に置く（1TBS スタイル）
			"brace-style": ["error", "1tbs", { allowSingleLine: true }],

			// if/for 等は必ず {} を付ける（1行でも省略しない）
			curly: ["error", "all"],

			// セミコロンの前後のスペース（前なし・後あり）を統一する
			"semi-spacing": ["error", { before: false, after: true }],

			// 単項演算子（! ++ typeof 等）の前後スペースを統一する
			"space-unary-ops": ["error", { words: true, nonwords: false }],

			// 複数行のオブジェクトは {} 内の改行スタイルを統一する
			"object-curly-newline": ["error", { multiline: true, consistent: true }],

			// オブジェクトのプロパティは「全部同一行」か「全部改行」で混在させない
			"object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],

			// 関数の引数が複数行なら括弧内の改行スタイルを統一する
			"function-paren-newline": ["error", "multiline-arguments"],

			// 文字列の slice は substring/substr より slice を優先する
			"unicorn/prefer-string-slice": "error",

			// 配列/文字列の検索は indexOf より includes を優先する
			"unicorn/prefer-includes": "error",

			// 明示的な undefined を避けられる場合は省略する
			"unicorn/no-useless-undefined": "error",

			// printWidth: 120 相当（警告のみ、折り返しは自動化しにくい）
			"max-len": ["warn", { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }]
		}
	},

	// ---- Jest（テスト専用）----
	{
		files: ["**/*.{test,spec}.js", "**/__tests__/**/*.js"],
		languageOptions: {
			globals: {
				...globals.jest
			}
		}
	}
];
