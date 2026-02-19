import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";
import replace from "@rollup/plugin-replace";
import fs from "node:fs";

// package.json から version を読む（rollup config が ESM でも確実に動く方式）
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const VERSION = pkg.version;

/**
 * JSDoc の {import("...").X} を {X} に置換する
 * - Rollup でまとめられた後でも効く（最終コード文字列に対して置換）
 * - {import('./a.js').Foo.Bar} のような場合は最後の識別子 {Bar} にする
 * @returns {import("rollup").Plugin}
 */
function jsdocImportToLocalType() {
	// {import("...").X} / {import('...').X} を捕捉
	const re = /\{import\(\s*(['"])[^'"]+\1\s*\)\.([^}]+)\}/g;

	return {
		name: "jsdoc-import-to-local-type",
		renderChunk(code) {
			return code.replace(re, (_m, _q, typePath) => {
				const last = String(typePath).trim().split(".").pop();
				return `{${last}}`;
			});
		}
	};
}

/**
 * 公開用ファイルの設定データを作成
 * @param {Object} options - オプション
 * @param {string} options.banner - バナー（minify時に付与）
 * @param {string} options.globalName - UMD/IIFE でのグローバル変数名（例: "JPInputGuard"）
 * @param {string} options.input - 入力となるESMのトップファイル名
 * @param {string} options.outputFile - 出力するファイル名
 * @param {"umd"|"iife"|"cjs"|"esm"} options.format - 出力フォーマット
 * @param {boolean} options.isUglify - コードを最小化させるか否か
 * @returns {import("rollup").RollupOptions}
 */
const createData = function ({ banner, globalName, input, outputFile, format, isUglify }) {
	/** @type {import("rollup").RollupOptions} */
	const data = {
		input,
		output: {
			file: outputFile,
			format
		},
		/** @type {import("rollup").Plugin[]} */
		plugins: [
			replace({
				preventAssignment: true,
				values: {
					"process.env.VERSION": JSON.stringify(VERSION)
				}
			}),
			resolve(),
			commonjs(),
			jsdocImportToLocalType()
		]
	};

	// UMD/IIFE の場合のみグローバル名を設定
	if (format === "umd" || format === "iife") {
		data.output.name = globalName;
	}

	// minify時のみバナーを残す（/*! ... */ を残したいので comments: /^!/）
	if (isUglify) {
		data.output.banner = banner;
		data.plugins.push(
			terser({
				format: {
					comments: /^!/
				}
			})
		);
	}

	return data;
};

const banner = `/*!
 * JP Input Guard
 * AUTHOR: natade (https://github.com/natade-jp/)
 * LICENSE: MIT https://opensource.org/licenses/MIT
 */`;

const packageName = "jp-input-guard";
const globalName = "JPInputGuard";
const input = "./src/main.js";

/** @type {import("rollup").RollupOptions[]} */
const data = [];

// UMD（グローバルは JPInputGuard, ファイル名は jp-input-guard.js）
data.push(
	createData({
		banner,
		globalName,
		input,
		outputFile: `./dist/umd/${packageName}.js`,
		format: "umd",
		isUglify: false
	})
);

data.push(
	createData({
		banner,
		globalName,
		input,
		outputFile: `./dist/umd/${packageName}.min.js`,
		format: "umd",
		isUglify: true
	})
);

// CJS / ESM（グローバル名は不要だが、引数を統一するため渡してOK）
data.push(
	createData({
		banner,
		globalName,
		input,
		outputFile: `./dist/cjs/${packageName}.cjs`,
		format: "cjs",
		isUglify: false
	})
);

data.push(
	createData({
		banner,
		globalName,
		input,
		outputFile: `./dist/esm/${packageName}.js`,
		format: "esm",
		isUglify: false
	})
);

// types
data.push({
	input: `./tmp/types/${packageName}.d.ts`,
	output: {
		file: `./dist/types/${packageName}.d.ts`,
		format: "es"
	},
	plugins: [dts()]
});

export default data;
