/**
 * The script is part of JPInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

/**
 * @typedef {import("./jp-input-guard.js").GuardGroup} GuardGroup
 * @typedef {import("./jp-input-guard.js").Guard} Guard
 * @typedef {import("./jp-input-guard.js").AttachOptions} AttachOptions
 * @typedef {import("./jp-input-guard.js").Rule} Rule
 */

/**
 * data属性からルールを生成できるルールファクトリ
 * @typedef {Object} RuleFactory
 * @property {string} name
 * @property {(dataset: DOMStringMap, el: HTMLInputElement|HTMLTextAreaElement) => Rule|null} fromDataset
 */

/**
 * Boolean系のdata値を解釈する（未指定なら undefined を返す）
 * @param {string|undefined} v
 * @returns {boolean|undefined}
 */
function parseBool(v) {
	if (v == null) { return; }
	const s = String(v).trim().toLowerCase();
	if (s === "" || s === "true" || s === "1" || s === "yes" || s === "on") { return true; }
	if (s === "false" || s === "0" || s === "no" || s === "off") { return false; }
	return;
}

/**
 * separate mode を解釈する（未指定は "auto"）
 * @param {string|undefined} v
 * @returns {"auto"|"swap"|"off"}
 */
function parseSeparateMode(v) {
	if (v == null || String(v).trim() === "") { return "auto"; }
	const s = String(v).trim().toLowerCase();
	if (s === "auto" || s === "swap" || s === "off") { return /** @type {any} */ (s); }
	return "auto";
}

/**
 * その要素が autoAttach の対象かを判定する
 * - 設定系（data-jpig-separate / warn / invalid-class）
 * - ルール系（data-jpig-rules-* が1つでもある）
 * @param {DOMStringMap} ds
 * @returns {boolean}
 */
function hasAnyJpigConfig(ds) {
	// attach設定系
	if (ds.jpigSeparate != null) { return true; }
	if (ds.jpigWarn != null) { return true; }
	if (ds.jpigInvalidClass != null) { return true; }

	// ルール系（data-jpig-rules-*）
	for (const k in ds) {
		// data-jpig-rules-numeric -> ds.jpigRulesNumeric
		if (k.startsWith("jpigRules")) {
			return true;
		}
	}
	return false;
}

/**
 * autoAttach の実体（attach関数とルールレジストリを保持する）
 */
export class InputGuardAutoAttach {
	/**
	 * @param {(el: HTMLInputElement|HTMLTextAreaElement, options: AttachOptions) => Guard} attachFn
	 * @param {RuleFactory[]} ruleFactories
	 */
	constructor(attachFn, ruleFactories) {
		/** @type {(el: HTMLInputElement|HTMLTextAreaElement, options: AttachOptions) => Guard} */
		this.attachFn = attachFn;

		/** @type {RuleFactory[]} */
		this.ruleFactories = Array.isArray(ruleFactories) ? ruleFactories : [];
	}

	/**
	 * ルールファクトリを追加登録（将来用：必要なら使う）
	 * @param {RuleFactory} factory
	 * @returns {void}
	 */
	register(factory) {
		this.ruleFactories.push(factory);
	}

	/**
	 * root 配下の input/textarea を data属性から自動で attach する
	 * - 既に `data-jpig-attached` が付いているものはスキップ
	 * - `data-jpig-*`（設定）と `data-jpig-rules-*`（ルール）を拾って options を生成
	 *
	 * @param {Document|DocumentFragment|ShadowRoot|Element} [root=document]
	 * @returns {GuardGroup}
	 */
	autoAttach(root = document) {
		/** @type {Guard[]} */
		const guards = [];

		/** @type {(HTMLInputElement|HTMLTextAreaElement)[]} */
		const elements = [];

		// root配下
		if (/** @type {any} */ (root).querySelectorAll) {
			const nodeList = /** @type {any} */ (root).querySelectorAll("input, textarea");
			for (const el of nodeList) {
				if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
					elements.push(el);
				}
			}
		}

		// root自身
		if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement) {
			if (!elements.includes(root)) { elements.push(root); }
		}

		for (const el of elements) {
			const ds = el.dataset;

			// 二重attach防止
			if (ds.jpigAttached === "true") { continue; }

			// JPIGの設定が何も無ければ対象外
			if (!hasAnyJpigConfig(ds)) { continue; }

			/** @type {AttachOptions} */
			const options = {};

			// warn / invalidClass
			const warn = parseBool(ds.jpigWarn);
			if (warn != null) { options.warn = warn; }

			if (ds.jpigInvalidClass != null && String(ds.jpigInvalidClass).trim() !== "") {
				options.invalidClass = String(ds.jpigInvalidClass);
			}

			// separateValue（未指定は auto）
			options.separateValue = { mode: parseSeparateMode(ds.jpigSeparate) };

			// ルール収集
			/** @type {Rule[]} */
			const rules = [];
			for (const fac of this.ruleFactories) {
				try {
					const rule = fac.fromDataset(ds, el);
					if (rule) { rules.push(rule); }
				} catch (e) {
					const w = options.warn ?? true;
					if (w) {
						console.warn(`[jp-input-guard] autoAttach: rule "${fac.name}" fromDataset() threw an error.`, e);
					}
				}
			}
			if (rules.length > 0) { options.rules = rules; }

			// ルールが無いなら attach しない（v0.1方針）
			if (!options.rules || options.rules.length === 0) { continue; }

			// attach（init内で auto/swap 判定も完了）
			const guard = this.attachFn(el, options);
			guards.push(guard);

			// 二重attach防止フラグ
			el.dataset.jpigAttached = "true";
		}

		return {
			detach: () => { for (const g of guards) { g.detach(); } },
			isValid: () => guards.every((g) => g.isValid()),
			getErrors: () => guards.flatMap((g) => g.getErrors()),
			getGuards: () => guards
		};
	}
}
