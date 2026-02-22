/**
 * JP Input Guard - Public Entry
 * - ESM/CJS では named export（attach / rules / numeric...）
 * - UMD では globalName で指定したグローバル（例: window.JPInputGuard）に同じ形で露出させる
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

// rules (individual exports)
export { digits } from "./rules/digits.js";
export { numeric } from "./rules/numeric.js";
export { comma } from "./rules/formatComma.js";

import { attach } from "./jp-input-guard.js";
import { InputGuardAutoAttach } from "./auto-attach.js";

// rules namespace export
import { digits } from "./rules/digits.js";
import { numeric } from "./rules/numeric.js";
import { comma } from "./rules/formatComma.js";

const auto = new InputGuardAutoAttach(attach, [
//	{ name: "numeric", fromDataset: numeric.fromDataset },
//	{ name: "digits", fromDataset: digits.fromDataset }
//	{ name: "comma", fromDataset: comma.fromDataset }
]);

// core
export { attach };
export const autoAttach = (root) => auto.autoAttach(root);

/**
 * ルール生成関数の名前空間（rules.xxx(...) で使う）
 */
export const rules = {
	numeric,
	digits,
	comma
};

/**
 * バージョン（ビルド時に置換したいならここを差し替える）
 * 例: rollup replace で "__VERSION__" を package.json の version に置換
 */
// @ts-ignore
// eslint-disable-next-line no-undef
export const version = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";
