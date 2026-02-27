/**
 * TextInputGuard - Public Entry
 * - ESM/CJS: named exports (attach / autoAttach / rules / numeric / digits / comma / version)
 * - UMD: exposed to global (e.g. window.TextInputGuard) with the same shape
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

import { attach, attachAll } from "./text-input-guard.js";
import { InputGuardAutoAttach } from "./auto-attach.js";

// rules
import { numeric } from "./rules/numeric.js";
import { digits } from "./rules/digits.js";
import { comma } from "./rules/comma.js";
import { zenkaku } from "./rules/zenkaku.js";
import { hankaku } from "./rules/hankaku.js";
import { katakana } from "./rules/katakana.js";
import { hiragana } from "./rules/hiragana.js";
import { trim } from "./rules/trim.js";

// ---- individual exports (ESM/CJS) ----
export { attach, attachAll };
export { numeric, digits, comma, zenkaku, hankaku, katakana, hiragana, trim };

// ---- autoAttach ----
const auto = new InputGuardAutoAttach(attach, [
	{ name: "numeric", fromDataset: numeric.fromDataset },
	{ name: "digits", fromDataset: digits.fromDataset },
	{ name: "comma", fromDataset: comma.fromDataset },
	{ name: "katakana", fromDataset: katakana.fromDataset },
	{ name: "hiragana", fromDataset: hiragana.fromDataset },
	{ name: "zenkaku", fromDataset: zenkaku.fromDataset },
	{ name: "hankaku", fromDataset: hankaku.fromDataset },
	{ name: "trim", fromDataset: trim.fromDataset }
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
	comma,
	zenkaku,
	hankaku,
	katakana,
	hiragana,
	trim
};

/**
 * バージョン（ビルド時に置換したいならここを差し替える）
 * 例: rollup replace で "__VERSION__" を package.json の version に置換
 */
// @ts-ignore
// eslint-disable-next-line no-undef
export const version = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";
