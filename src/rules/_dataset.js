/**
 * datasetのboolean値を解釈する
 * - 未指定なら undefined
 * - "" / "true" / "1" / "yes" / "on" は true
 * - "false" / "0" / "no" / "off" は false
 * @param {string|undefined} v
 * @returns {boolean|undefined}
 */
function parseDatasetBool(v) {
	if (v == null) { return; }
	const s = String(v).trim().toLowerCase();
	if (s === "" || s === "true" || s === "1" || s === "yes" || s === "on") { return true; }
	if (s === "false" || s === "0" || s === "no" || s === "off") { return false; }
	return;
}

/**
 * datasetのnumber値を解釈する（整数想定）
 * - 未指定/空なら undefined
 * - 数値でなければ undefined
 * @param {string|undefined} v
 * @returns {number|undefined}
 */
function parseDatasetNumber(v) {
	if (v == null) { return; }
	const s = String(v).trim();
	if (s === "") { return; }
	const n = Number(s);
	return Number.isFinite(n) ? n : undefined;
}

/**
 * enumを解釈する（未指定なら undefined）
 * @template {string} T
 * @param {string|undefined} v
 * @param {readonly T[]} allowed
 * @returns {T|undefined}
 */
function parseDatasetEnum(v, allowed) {
	if (v == null) { return; }
	const s = String(v).trim();
	if (s === "") { return; }
	// 大文字小文字を区別したいならここを変える（今は厳密一致）
	return /** @type {T|undefined} */ (allowed.includes(/** @type {any} */ (s)) ? s : undefined);
}

export { parseDatasetBool, parseDatasetNumber, parseDatasetEnum };
