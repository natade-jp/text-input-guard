/**
 * JP Input Guard - Public Entry
 * - ESM/CJS: named exports (attach / autoAttach / rules / numeric / digits / comma / version)
 * - UMD: exposed to global (e.g. window.JPInputGuard) with the same shape
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import { attach, attachAll } from "./jp-input-guard.js";
import { InputGuardAutoAttach } from "./auto-attach.js";

// rules
import { numeric } from "./rules/numeric.js";
import { digits } from "./rules/digits.js";
import { comma } from "./rules/formatComma.js";

// ---- individual exports (ESM/CJS) ----
export { attach, attachAll };
export { numeric, digits, comma };

// ---- autoAttach ----
const auto = new InputGuardAutoAttach(attach, [
	{ name: "numeric", fromDataset: numeric.fromDataset },
	{ name: "digits", fromDataset: digits.fromDataset },
	{ name: "comma", fromDataset: comma.fromDataset }
]);

/**
 * data属性から自動で attach する
 * @param {Document|DocumentFragment|ShadowRoot|Element} [root=document]
 */
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
