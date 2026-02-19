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

// core
export { attach } from "./jp-input-guard.js";

// rules (individual exports)
export { numeric } from "./rules/numeric.js";

// rules namespace export
import { numeric } from "./rules/numeric.js";

/**
 * ルール生成関数の名前空間（rules.xxx(...) で使う）
 */
export const rules = {
	numeric
};

/**
 * バージョン（ビルド時に置換したいならここを差し替える）
 * 例: rollup replace で "__VERSION__" を package.json の version に置換
 */
export const version = process.env.VERSION;
