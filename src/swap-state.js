/**
 * The script is part of TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

/**
 * SwapState
 *
 * separateValue.mode="swap" のときに使用する
 * 元 input 要素の状態スナップショットおよび復元ロジックを管理するクラス
 *
 * 役割
 *  - swap前の input の属性状態を保持する
 *  - raw化および display生成時に必要な属性を適用する
 *  - detach時に元の状態へ復元する
 *
 * 設計方針
 *  - 送信用属性は raw に残す
 *  - UIおよびアクセシビリティ属性は display に適用する
 *  - tig内部用の data-* は display にコピーしない
 */
export class SwapState {
	/**
	 * 元 input の type 属性
	 * detach時に復元するため保持する
	 * @type {string}
	 */
	originalType;

	/**
	 * 元 input の id 属性
	 * swap時に display へ移し detach時に rawへ戻す
	 * @type {string|null}
	 */
	originalId;

	/**
	 * 元 input の name 属性
	 * 送信用属性のため raw側に残すが
	 * detach時の整合性のため保持する
	 * @type {string|null}
	 */
	originalName;

	/**
	 * 元 input の class 属性
	 * swap時に display へ移す
	 * @type {string}
	 */
	originalClass;

	/**
	 * UI系属性のスナップショット
	 * placeholder inputmode required などを保持する
	 *
	 * key 属性名
	 * value 属性値 未指定の場合は null
	 *
	 * @type {Object.<string, string|null>}
	 */
	originalUiAttrs;

	/**
	 * aria-* 属性のスナップショット
	 * アクセシビリティ維持のため display に適用する
	 *
	 * key aria属性名 例 aria-label
	 * value 属性値
	 *
	 * @type {Object.<string, string>}
	 */
	originalAriaAttrs;

	/**
	 * tig 以外の data-* 属性のスナップショット
	 * swap後も display へ引き継ぐ
	 *
	 * key datasetキー camelCase
	 * value 属性値
	 *
	 * @type {Object.<string, string>}
	 */
	originalDataset;

	/**
	 * swap時に生成された display 用 input 要素
	 * detach時に削除するため保持する
	 *
	 * @type {HTMLInputElement|null}
	 */
	createdDisplay;

	/**
	 * @param {HTMLInputElement} input
	 * swap前の元 input 要素
	 */
	constructor(input) {
		this.originalType = input.type;
		this.originalId = input.getAttribute("id");
		this.originalName = input.getAttribute("name");
		this.originalClass = input.className;

		this.originalUiAttrs = {};
		this.originalAriaAttrs = {};
		this.originalDataset = {};
		this.createdDisplay = null;

		const UI_ATTRS = [
			"placeholder",
			"inputmode",
			"autocomplete",
			"minlength",
			"maxlength",
			"pattern",
			"title",
			"tabindex",
			"style",
			"enterkeyhint",
			"spellcheck"
		];

		const UI_BOOL_ATTRS = [
			"required",
			"readonly",
			"disabled",
			"autofocus"
		];

		for (const name of UI_ATTRS) {
			this.originalUiAttrs[name] = input.hasAttribute(name) ? input.getAttribute(name) : null;
		}

		for (const name of UI_BOOL_ATTRS) {
			// booleanは「ある/ない」だけ記録
			this.originalUiAttrs[name] = input.hasAttribute(name) ? "" : null;
		}

		for (const attr of input.attributes) {
			if (attr.name.startsWith("aria-")) {
				this.originalAriaAttrs[attr.name] = attr.value ?? "";
			}
		}

		for (const [k, v] of Object.entries(input.dataset)) {
			if (k.startsWith("tig")) { continue; }
			this.originalDataset[k] = v;
		}
	}

	/**
	 * raw 元input を hidden 化する
	 * 送信担当要素として扱う
	 *
	 * @param {HTMLInputElement} input
	 * @returns {void}
	 */
	applyToRaw(input) {
		// raw化（送信担当）
		input.type = "hidden";
		input.removeAttribute("id");
		input.className = "";
		input.dataset.tigRole = "raw";

		// 元idのメタを残す（デバッグ/参照用）
		if (this.originalId) {
			input.dataset.tigOriginalId = this.originalId;
		}
		if (this.originalName) {
			input.dataset.tigOriginalName = this.originalName;
		}
	}

	/**
	 * display用 input を生成し UI属性 aria属性 data属性を適用
	 *
	 * @param {HTMLInputElement} raw hidden化された元input
	 * @returns {HTMLInputElement}
	 */
	createDisplay(raw) {
		const display = document.createElement("input");
		display.type = "text";
		display.dataset.tigRole = "display";

		if (this.originalId) {
			display.id = this.originalId;
		}

		display.className = this.originalClass ?? "";
		display.value = raw.value;

		for (const [name, v] of Object.entries(this.originalUiAttrs)) {
			if (v == null) {
				display.removeAttribute(name);
			} else {
				// booleanも "" をセットすればOK
				display.setAttribute(name, v);
			}
		}

		for (const [name, v] of Object.entries(this.originalAriaAttrs)) {
			display.setAttribute(name, v);
		}

		for (const [k, v] of Object.entries(this.originalDataset)) {
			display.dataset[k] = v;
		}

		this.createdDisplay = display;
		return display;
	}

	/**
	 * detach時に display 要素を削除する
	 *
	 * @returns {void}
	 */
	removeDisplay() {
		if (this.createdDisplay?.parentNode) {
			this.createdDisplay.parentNode.removeChild(this.createdDisplay);
		}
		this.createdDisplay = null;
	}

	/**
	 * raw hidden化された元input を元の状態へ復元する
	 *
	 * @param {HTMLInputElement} raw
	 * @returns {void}
	 */
	restoreRaw(raw) {
		raw.type = this.originalType;

		if (this.originalId) {
			raw.setAttribute("id", this.originalId);
		} else {
			raw.removeAttribute("id");
		}

		if (this.originalName) {
			raw.setAttribute("name", this.originalName);
		} else {
			raw.removeAttribute("name");
		}

		raw.className = this.originalClass ?? "";

		delete raw.dataset.tigRole;
		delete raw.dataset.tigOriginalId;
		delete raw.dataset.tigOriginalName;
	}
}
