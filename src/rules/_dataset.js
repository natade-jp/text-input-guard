/**
 * dataset/option の boolean 値を解釈する
 * - 未指定（null/undefined）の場合は defaultValue を返す
 * - 空文字 "" は常に true（HTML属性文化）
 * - 指定があるが解釈できない場合は undefined
 *
 * true  : true / 1 / "true" / "1" / "yes" / "on" / ""
 * false : false / 0 / "false" / "0" / "no" / "off"
 *
 * @param {string|number|boolean|undefined|null} v
 * @param {boolean} [defaultValue]
 * @returns {boolean|undefined}
 */
function parseDatasetBool(v, defaultValue) {
	if (v === null || v === undefined) { return defaultValue; }

	if (typeof v === "boolean") { return v; }

	if (typeof v === "number") {
		if (v === 1) { return true; }
		if (v === 0) { return false; }
		return;
	}

	const s = String(v).trim().toLowerCase();

	// dataset の属性存在を true とみなす（例: data-xxx=""）
	if (s === "") { return true; }

	if (s === "true" || s === "1" || s === "yes" || s === "on") { return true; }
	if (s === "false" || s === "0" || s === "no" || s === "off") { return false; }

	return;
}

/**
 * dataset/option の number 値を解釈する
 * - 未指定（null/undefined/空文字）の場合は defaultValue を返す
 * - 数値でなければ undefined
 * @param {string|number|undefined|null} v
 * @param {number} [defaultValue]
 * @returns {number|undefined}
 */
function parseDatasetNumber(v, defaultValue) {
	if (v === null || v === undefined) { return defaultValue; }

	if (typeof v === "number") {
		return Number.isFinite(v) ? v : undefined;
	}

	const s = String(v).trim();
	if (s === "") { return defaultValue; }

	const n = Number(s);
	return Number.isFinite(n) ? n : undefined;
}

/**
 * enumを解釈する
 * - 未指定（null/undefined/空文字）の場合は defaultValue を返す
 * - 値が指定されているが allowed に含まれない場合は undefined を返す
 *
 * @template {string} T
 * @param {string|undefined|null} v
 * @param {readonly T[]} allowed
 * @param {T} [defaultValue]
 * @returns {T|undefined}
 */
function parseDatasetEnum(v, allowed, defaultValue) {
	if (v === null || v === undefined) { return defaultValue; }

	const s = String(v).trim();
	if (s === "") { return defaultValue; }

	return /** @type {T|undefined} */ (
		allowed.includes(/** @type {any} */ (s)) ? s : undefined
	);
}

/**
 * enum のカンマ区切り複数指定を解釈する
 * - 未指定（null/undefined/空文字）の場合は defaultValue を返す
 * - 空要素は無視
 * - allowed に含まれないものは除外
 *
 * @template {string} T
 * @param {string|T[]|undefined|null} v
 * @param {readonly T[]} allowed
 * @param {T[]} [defaultValue]
 * @returns {T[]|undefined}
 */
function parseDatasetEnumList(v, allowed, defaultValue) {
	if (v === null || v === undefined) { return defaultValue; }

	// JSオプションで配列直渡しも許可
	if (Array.isArray(v)) {
		const result = v.filter(
			/** @returns {x is T} */
			(x) => allowed.includes(/** @type {any} */ (x))
		);
		return result;
	}

	const s = String(v).trim();
	if (s === "") { return defaultValue; }

	const list = s
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean);

	const result = list.filter(
		/** @returns {x is T} */
		(x) => allowed.includes(/** @type {any} */ (x))
	);

	return /** @type {T[]} */ (result);
}

export { parseDatasetBool, parseDatasetNumber, parseDatasetEnum, parseDatasetEnumList };
