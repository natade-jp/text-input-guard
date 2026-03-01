'use strict';

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
class SwapState {
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
 * 対象要素の種別（現在は input と textarea のみ対応）
 * @typedef {"input"|"textarea"} ElementKind
 */

/**
 * ルール実行フェーズ名（パイプラインの固定順）
 * normalize.char → normalize.structure → validate → fix → format
 * @typedef {"normalize.char"|"normalize.structure"|"validate"|"fix"|"format"} PhaseName
 */

/**
 * バリデーションエラー情報を表すオブジェクト
 * @typedef {Object} TigError
 * @property {string} code - エラー識別子（例: "digits.int_overflow"）
 * @property {string} rule - エラーを発生させたルール名
 * @property {PhaseName} phase - 発生したフェーズ
 * @property {any} [detail] - 追加情報（制限値など）
 */

/**
 * setValue で設定できる値型
 * - number は String に変換して設定する
 * - null/undefined は空文字として扱う
 * @typedef {string | number | null | undefined} SetValueInput
 */

/**
 * setValue 実行モード
 * - "commit"  確定評価まで実行 normalize→validate→fix→format
 * - "input"   入力中評価のみ実行 normalize→validate
 * - "none"    評価は実行しない 値だけを反映
 *
 * 既定値は "commit"
 *
 * @typedef {"none"|"input"|"commit"} SetValueMode
 */

/**
 * attach() が返す公開API（利用者が触れる最小インターフェース）
 * @typedef {Object} Guard
 * @property {() => void} detach - ガード解除（イベント削除・swap復元）
 * @property {() => boolean} isValid - 現在エラーが無いかどうか
 * @property {() => TigError[]} getErrors - エラー一覧を取得
 * @property {() => string} getRawValue - 送信用の正規化済み値を取得
 * @property {() => string} getDisplayValue - ユーザーが実際に操作している要素の値を取得
 * @property {() => HTMLInputElement|HTMLTextAreaElement} getRawElement - 送信用の正規化済み値の要素
 * @property {() => HTMLInputElement|HTMLTextAreaElement} getDisplayElement - ユーザーが実際に操作している要素（swap時はdisplay専用）
 * @property {() => void} evaluate 入力中評価を手動実行 normalize→validate
 * @property {() => void} commit 確定評価を手動実行 normalize→validate→fix→format
 * @property {(value: SetValueInput, mode?: SetValueMode) => void} setValue
 */

/**
 * 各ルールに渡される実行コンテキスト
 * - DOM参照や状態、エラー登録用関数などをまとめたもの
 * @typedef {Object} GuardContext
 * @property {HTMLElement} hostElement - 元の要素（swap時はraw側）
 * @property {HTMLElement} displayElement - ユーザーが操作する表示要素
 * @property {HTMLInputElement|null} rawElement - 送信用hidden要素（swap時のみ）
 * @property {ElementKind} kind - 要素種別（input / textarea）
 * @property {boolean} warn - warnログを出すかどうか
 * @property {string} invalidClass - エラー時に付与するclass名
 * @property {boolean} composing - IME変換中かどうか
 * @property {(e: TigError) => void} pushError - エラーを登録する関数
 * @property {(req: RevertRequest) => void} requestRevert - 入力を直前の受理値へ巻き戻す要求
 */

/**
 * 1つの入力制御ルール定義
 * - 各フェーズの処理を必要に応じて実装する
 * @typedef {Object} Rule
 * @property {string} name - ルール名（識別用）
 * @property {("input"|"textarea")[]} targets - 適用可能な要素種別
 * @property {(value: string, ctx: GuardContext) => string} [normalizeChar] - 文字単位の正規化（全角→半角など）
 * @property {(value: string, ctx: GuardContext) => string} [normalizeStructure] - 構造の正規化（-位置修正など）
 * @property {(value: string, ctx: GuardContext) => void} [validate] - エラー判定（値は変更しない）
 * @property {(value: string, ctx: GuardContext) => string} [fix] - 確定時の穏やか補正（切り捨て等）
 * @property {(value: string, ctx: GuardContext) => string} [format] - 表示整形（カンマ付与など）
 */

/**
 * 表示値(display)と内部値(raw)の分離設定
 * @typedef {Object} SeparateValueOptions
 * @property {"auto"|"swap"|"off"} [mode="auto"]
 *   - "auto": format系ルールがある場合のみ自動でswapする（既定）
 *   - "swap": 常にswapする（inputのみ対応）
 *   - "off": 分離しない（displayとrawを同一に扱う）
 */

/**
 * attach() に渡す設定オプション
 * @typedef {Object} AttachOptions
 * @property {Rule[]} [rules] - 適用するルール配列（順番がフェーズ内実行順になる）
 * @property {boolean} [warn] - 非対応ルールなどを console.warn するか
 * @property {string} [invalidClass] - エラー時に付けるclass名
 * @property {SeparateValueOptions} [separateValue] - 表示値と内部値の分離設定
 */

/**
 * selection（カーソル/選択範囲）の退避情報
 * @typedef {Object} SelectionState
 * @property {number|null} start - selectionStart
 * @property {number|null} end - selectionEnd
 * @property {"forward"|"backward"|"none"|null} direction - selectionDirection
 */

/**
 * revert要求（入力を巻き戻す指示）
 * @typedef {Object} RevertRequest
 * @property {string} reason - ルール名や理由（例: "digits.int_overflow"）
 * @property {any} [detail] - デバッグ用の詳細
 */

const DEFAULT_INVALID_CLASS = "is-invalid";

/**
 * 対象要素が input / textarea のどちらかを判定する（対応外なら null）
 * @param {HTMLElement} el
 * @returns {ElementKind|null}
 */
function detectKind(el) {
	if (el instanceof HTMLInputElement) {
		return "input";
	}
	if (el instanceof HTMLTextAreaElement) {
		return "textarea";
	}
	return null;
}

/**
 * warn が true のときだけ console.warn を出す
 * @param {string} msg
 * @param {boolean} warn
 */
function warnLog(msg, warn) {
	if (warn) {
		console.warn(msg);
	}
}

/**
 * 指定した1要素に対してガードを適用し、Guard API を返す
 * @param {HTMLInputElement|HTMLTextAreaElement} element
 * @param {AttachOptions} [options]
 * @returns {Guard}
 */
function attach(element, options = {}) {
	const guard = new InputGuard(element, options);
	guard.init();
	return guard.toGuard();
}

/**
 * @typedef {Object} GuardGroup
 * @property {() => void} detach - 全部 detach
 * @property {() => boolean} isValid - 全部 valid なら true
 * @property {() => TigError[]} getErrors - 全部のエラーを集約
 * @property {() => Guard[]} getGuards - 個別Guard配列
 */

/**
 * @param {Iterable<HTMLInputElement|HTMLTextAreaElement>} elements
 * @param {AttachOptions} [options]
 * @returns {GuardGroup}
 */
function attachAll(elements, options = {}) {
	/** @type {Guard[]} */
	const guards = [];
	for (const el of elements) {
		guards.push(attach(el, options));
	}

	return {
		detach: () => { for (const g of guards) { g.detach(); } },
		isValid: () => guards.every((g) => g.isValid()),
		getErrors: () => guards.flatMap((g) => g.getErrors()),
		getGuards: () => guards
	};
}

class InputGuard {
	/**
	 * InputGuard の内部状態を初期化する（DOM/設定/イベント/パイプラインを持つ）
	 * @param {HTMLInputElement|HTMLTextAreaElement} element
	 * @param {AttachOptions} options
	 */
	constructor(element, options) {
		/**
		 * attach対象の元の要素（swap前の原本）
		 * detach時の復元や基準参照に使う
		 * @type {HTMLInputElement|HTMLTextAreaElement}
		 */
		this.originalElement = element;

		/**
		 * attach時に渡された設定オブジェクト
		 * @type {AttachOptions}
		 */
		this.options = options;

		const kind = detectKind(element);
		if (!kind) {
			throw new TypeError("[text-input-guard] attach() expects an <input> or <textarea> element.");
		}

		/**
		 * 対象要素の種別（"input" または "textarea"）
		 * @type {ElementKind}
		 */
		this.kind = kind;

		/**
		 * 非対応ルールなどの警告を console.warn するかどうか
		 * @type {boolean}
		 */
		this.warn = options.warn ?? true;

		/**
		 * エラー時に displayElement に付与するCSSクラス名
		 * @type {string}
		 */
		this.invalidClass = options.invalidClass ?? DEFAULT_INVALID_CLASS;

		/**
		 * 適用するルールの一覧（attach時に渡されたもの）
		 * @type {Rule[]}
		 */
		this.rules = Array.isArray(options.rules) ? options.rules : [];

		/**
		 * 実際に送信を担う要素（swap時は hidden(raw) 側）
		 * swapしない場合は originalElement と同一
		 * @type {HTMLElement}
		 */
		this.hostElement = element;

		/**
		 * ユーザーが直接入力する表示側要素
		 * swapしない場合は originalElement と同一
		 * @type {HTMLElement}
		 */
		this.displayElement = element;

		/**
		 * swap時に生成される hidden(raw) input
		 * swapしない場合は null
		 * @type {HTMLInputElement|null}
		 */
		this.rawElement = null;

		/**
		 * IME変換中かどうかのフラグ
		 * true の間は input処理を行わない
		 * @type {boolean}
		 */
		this.composing = false;

		/**
		 * 現在発生しているエラー一覧
		 * evaluateごとにリセットされる
		 * @type {TigError[]}
		 */
		this.errors = [];

		// --------------------------------------------------
		// pipeline（フェーズごとのルール配列）
		// --------------------------------------------------

		/**
		 * normalize.char フェーズ用ルール配列
		 * （文字単位の正規化）
		 * @type {Rule[]}
		 */
		this.normalizeCharRules = [];

		/**
		 * normalize.structure フェーズ用ルール配列
		 * （構造の正規化）
		 * @type {Rule[]}
		 */
		this.normalizeStructureRules = [];

		/**
		 * validate フェーズ用ルール配列
		 * （エラー判定）
		 * @type {Rule[]}
		 */
		this.validateRules = [];

		/**
		 * fix フェーズ用ルール配列
		 * （確定時の穏やか補正）
		 * @type {Rule[]}
		 */
		this.fixRules = [];

		/**
		 * format フェーズ用ルール配列
		 * （表示整形）
		 * @type {Rule[]}
		 */
		this.formatRules = [];

		// --------------------------------------------------
		// bind handlers（removeEventListener のため参照固定）
		// --------------------------------------------------

		/**
		 * IME開始イベントハンドラ（this固定）
		 */
		this.onCompositionStart = this.onCompositionStart.bind(this);

		/**
		 * IME終了イベントハンドラ（this固定）
		 */
		this.onCompositionEnd = this.onCompositionEnd.bind(this);

		/**
		 * inputイベントハンドラ（this固定）
		 */
		this.onInput = this.onInput.bind(this);

		/**
		 * blurイベントハンドラ（this固定）
		 */
		this.onBlur = this.onBlur.bind(this);

		/**
		 * focusイベントハンドラ（this固定）
		 */
		this.onFocus = this.onFocus.bind(this);

		/**
		 * キャレット/選択範囲の変化イベントハンドラ（this固定）
		 */
		this.onSelectionChange = this.onSelectionChange.bind(this);

		/**
		 * swap時に退避しておく元要素情報
		 * detach時に復元するために使用
		 * @type {SwapState|null}
		 */
		this.swapState = null;

		/**
		 * IME変換後のinputイベントが来ない環境向けのフラグ
		 * @type {boolean}
		 */
		this.pendingCompositionCommit = false;

		/**
		 * 直前に受理した表示値（block時の戻し先）
		 * @type {string}
		 */
		this.lastAcceptedValue = "";

		/**
		 *  直前に受理したselection（block時の戻し先）
		 * @type {SelectionState}
		 */
		this.lastAcceptedSelection = { start: null, end: null, direction: null };

		/**
		 * ルールからのrevert要求
		 * @type {RevertRequest|null}
		 */
		this.revertRequest = null;
	}

	/**
	 * 初期化処理（swap適用 → パイプライン構築 → イベント登録 → 初回評価）
	 * @returns {void}
	 */
	init() {
		// 指定されたオプションを確認するためにも先に実施
		this.buildPipeline();
		this.applySeparateValue();
		this.bindEvents();
		// 初期値を評価
		this.evaluateInput();
	}

	/**
	 * display要素のselection情報を読む
	 * @param {HTMLInputElement|HTMLTextAreaElement} el
	 * @returns {SelectionState}
	 */
	readSelection(el) {
		return {
			start: el.selectionStart,
			end: el.selectionEnd,
			direction: el.selectionDirection
		};
	}

	/**
	 * display要素のselection情報を復元する
	 * @param {HTMLInputElement|HTMLTextAreaElement} el
	 * @param {SelectionState} sel
	 * @returns {void}
	 */
	writeSelection(el, sel) {
		if (sel.start == null || sel.end == null) { return; }
		try {
			// direction は未対応環境があるので try で包む
			if (sel.direction) {
				el.setSelectionRange(sel.start, sel.end, sel.direction);
			} else {
				el.setSelectionRange(sel.start, sel.end);
			}
		} catch (_e) {
			// type=hidden などでは例外になることがある（今回は display が text 想定）
		}
	}

	/**
	 * separateValue.mode="swap" のとき、input を hidden(raw) にして display(input[type=text]) を生成する
	 * - textarea は非対応（warnして無視）
	 * @returns {void}
	 */
	applySeparateValue() {
		const userMode = this.options.separateValue?.mode ?? "auto";

		// autoの場合：format系ルールがあるときだけswap (つまり input を作成する)
		const mode =
		userMode === "auto"
			? (this.formatRules.length > 0 ? "swap" : "off")
			: userMode;

		if (mode !== "swap") {
			return;
		}

		if (this.kind !== "input") {
			warnLog('[text-input-guard] separateValue.mode="swap" is not supported for <textarea>. ignored.', this.warn);
			return;
		}

		const input = /** @type {HTMLInputElement} */ (this.originalElement);

		const state = new SwapState(input);
		state.applyToRaw(input);

		const display = state.createDisplay(input);
		input.after(display);

		this.swapState = state;

		// elements更新
		this.hostElement = input;      // raw
		this.displayElement = display; // display
		this.rawElement = input;

		// revert 機構
		this.lastAcceptedValue = display.value;
		this.lastAcceptedSelection = this.readSelection(display);
	}

	/**
	 * swapしていた場合、元のinputへ復元する（detach用）
	 * @returns {void}
	 */
	restoreSeparateValue() {
		// swapしていないならここで終わり
		if (!this.swapState) {
			return;
		}

		const state = this.swapState;

		// rawは元の input（hidden化されている）
		const raw = /** @type {HTMLInputElement} */ (this.hostElement);

		// displayが存在するなら、最新表示値をrawに同期してから消す（安全策）
		// ※ rawは常に正規化済みを持つ設計だけど、念のため
		const display = state.createdDisplay;
		if (display) {
			try {
				raw.value = raw.value || display.value;
			} catch (_e) {
				// ここは落とさない（復元を優先）
			}
		}

		// display削除
		state.removeDisplay();

		// rawを元に戻す（type）
		state.restoreRaw(raw);

		// elements参照を original に戻す
		this.hostElement = this.originalElement;
		this.displayElement = this.originalElement;
		this.rawElement = null;

		// swapState破棄
		this.swapState = null;
	}

	/**
	 * ガード解除
	 * @returns {void}
	 */
	detach() {
		// イベント解除（displayElementがswap後の可能性があるので先に外す）
		this.unbindEvents();
		// swap復元
		this.restoreSeparateValue();
		// 以後このインスタンスは利用不能にしてもいいが、今回は明示しない
	}

	/**
	 * rules をフェーズ別に振り分けてパイプラインを構築する
	 * - targets が合わないルールは warn してスキップ
	 * @returns {void}
	 */
	buildPipeline() {
		this.normalizeCharRules = [];
		this.normalizeStructureRules = [];
		this.validateRules = [];
		this.fixRules = [];
		this.formatRules = [];

		for (const rule of this.rules) {
			const supports =
				(this.kind === "input" && rule.targets.includes("input")) ||
				(this.kind === "textarea" && rule.targets.includes("textarea"));

			if (!supports) {
				warnLog(
					`[text-input-guard] Rule "${rule.name}" is not supported for <${this.kind}>. skipped.`,
					this.warn
				);
				continue;
			}

			if (rule.normalizeChar) {
				this.normalizeCharRules.push(rule);
			}
			if (rule.normalizeStructure) {
				this.normalizeStructureRules.push(rule);
			}
			if (rule.validate) {
				this.validateRules.push(rule);
			}
			if (rule.fix) {
				this.fixRules.push(rule);
			}
			if (rule.format) {
				this.formatRules.push(rule);
			}
		}
	}

	/**
	 * displayElement にイベントを登録する（IME・input・blur）
	 * @returns {void}
	 */
	bindEvents() {
		this.displayElement.addEventListener("compositionstart", this.onCompositionStart);
		this.displayElement.addEventListener("compositionend", this.onCompositionEnd);
		this.displayElement.addEventListener("input", this.onInput);
		this.displayElement.addEventListener("blur", this.onBlur);

		// フォーカスで編集用に戻す
		this.displayElement.addEventListener("focus", this.onFocus);

		// キャレット/選択範囲の変化を拾う（block時の不自然ジャンプ対策）
		this.displayElement.addEventListener("keyup", this.onSelectionChange);
		this.displayElement.addEventListener("mouseup", this.onSelectionChange);
		this.displayElement.addEventListener("select", this.onSelectionChange);
		this.displayElement.addEventListener("focus", this.onSelectionChange);
	}

	/**
	 * displayElement からイベントを解除する（detach用）
	 * @returns {void}
	 */
	unbindEvents() {
		this.displayElement.removeEventListener("compositionstart", this.onCompositionStart);
		this.displayElement.removeEventListener("compositionend", this.onCompositionEnd);
		this.displayElement.removeEventListener("input", this.onInput);
		this.displayElement.removeEventListener("blur", this.onBlur);
		this.displayElement.removeEventListener("focus", this.onFocus);
		this.displayElement.removeEventListener("keyup", this.onSelectionChange);
		this.displayElement.removeEventListener("mouseup", this.onSelectionChange);
		this.displayElement.removeEventListener("select", this.onSelectionChange);
		this.displayElement.removeEventListener("focus", this.onSelectionChange);
	}

	/**
	 * 直前の受理値へ巻き戻す（表示値＋raw同期＋selection復元）
	 * - block用途なので、余計な正規化/formatは走らせずに戻す
	 * @param {RevertRequest} req
	 * @returns {void}
	 */
	revertDisplay(req) {
		const display = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement);

		// いまの入力を取り消して、直前の受理値へ戻す
		display.value = this.lastAcceptedValue;

		// selection復元（取れている場合のみ）
		this.writeSelection(display, this.lastAcceptedSelection);

		// raw も同じ値へ（swapでも整合する）
		this.syncRaw(this.lastAcceptedValue);

		// block なので、エラー表示は基本クリア（「入らなかった」だけにする）
		this.clearErrors();
		this.applyInvalidClass();

		// 連鎖防止（次の処理に持ち越さない）
		this.revertRequest = null;

		if (this.warn) ;
	}

	/**
	 * ルール実行に渡すコンテキストを作る（pushErrorで errors に積める）
	 * @returns {GuardContext}
	 */
	createCtx() {
		return {
			hostElement: this.hostElement,
			displayElement: this.displayElement,
			rawElement: this.rawElement,
			kind: this.kind,
			warn: this.warn,
			invalidClass: this.invalidClass,
			composing: this.composing,
			pushError: (e) => this.errors.push(e),
			requestRevert: (req) => {
				// 1回でもrevert要求が出たら採用（最初の理由を保持）
				if (!this.revertRequest) {
					this.revertRequest = req;
				}
			}
		};
	}

	/**
	 * errors を初期化する（評価のたびに呼ぶ）
	 * @returns {void}
	 */
	clearErrors() {
		this.errors = [];
	}

	/**
	 * normalize.char フェーズを実行する（文字の正規化）
	 * @param {string} value
 	 * @param {GuardContext} ctx
	 * @returns {string}
	 */
	runNormalizeChar(value, ctx) {
		let v = value;
		for (const rule of this.normalizeCharRules) {
			v = rule.normalizeChar ? rule.normalizeChar(v, ctx) : v;
		}
		return v;
	}

	/**
	 * normalize.structure フェーズを実行する（構造の正規化）
	 * @param {string} value
 	 * @param {GuardContext} ctx
	 * @returns {string}
	 */
	runNormalizeStructure(value, ctx) {
		let v = value;
		for (const rule of this.normalizeStructureRules) {
			v = rule.normalizeStructure ? rule.normalizeStructure(v, ctx) : v;
		}
		return v;
	}

	/**
	 * validate フェーズを実行する（エラーを積むだけで、値は変えない想定）
	 * @param {string} value
 	 * @param {GuardContext} ctx
	 * @returns {void}
	 */
	runValidate(value, ctx) {
		for (const rule of this.validateRules) {
			if (rule.validate) {
				rule.validate(value, ctx);
			}
		}
	}

	/**
	 * fix フェーズを実行する（commit時のみ：切り捨て/四捨五入などの穏やか補正）
	 * @param {string} value
 	 * @param {GuardContext} ctx
	 * @returns {string}
	 */
	runFix(value, ctx) {
		let v = value;
		for (const rule of this.fixRules) {
			v = rule.fix ? rule.fix(v, ctx) : v;
		}
		return v;
	}

	/**
	 * format フェーズを実行する（commit時のみ：カンマ付与など表示整形）
	 * @param {string} value
 	 * @param {GuardContext} ctx
	 * @returns {string}
	 */
	runFormat(value, ctx) {
		let v = value;
		for (const rule of this.formatRules) {
			v = rule.format ? rule.format(v, ctx) : v;
		}
		return v;
	}

	/**
	 * errors の有無で invalidClass を displayElement に付け外しする
	 * @returns {void}
	 */
	applyInvalidClass() {
		const el = /** @type {HTMLElement} */ (this.displayElement);
		if (this.errors.length > 0) {
			el.classList.add(this.invalidClass);
		} else {
			el.classList.remove(this.invalidClass);
		}
	}

	/**
	 * rawElement（hidden）がある場合、そこへ正規化済み値を同期する
	 * @param {string} normalized
	 * @returns {void}
	 */
	syncRaw(normalized) {
		if (this.rawElement) {
			this.rawElement.value = normalized;
		}
	}

	/**
	 * displayElement へ値を書き戻す（normalize/fix/format で値が変わったとき）
	 * @param {string} normalized
	 * @returns {void}
	 */
	syncDisplay(normalized) {
		if (this.displayElement instanceof HTMLInputElement || this.displayElement instanceof HTMLTextAreaElement) {
			this.displayElement.value = normalized;
		}
	}

	/**
	 * IME変換開始：composition中フラグを立てる（input処理で触らないため）
	 * @returns {void}
	 */
	onCompositionStart() {
		// console.log("[text-input-guard] compositionstart");
		this.composing = true;
	}

	/**
	 * IME変換終了：composition中フラグを下ろす
	 * - 環境によって input が飛ばない/遅れるので、ここでフォールバック評価を入れる
	 * @returns {void}
	 */
	onCompositionEnd() {
		// console.log("[text-input-guard] compositionend");
		this.composing = false;

		// compositionend後に input が来ない環境向けのフォールバック
		this.pendingCompositionCommit = true;

		queueMicrotask(() => {
			// その後 input で処理済みなら何もしない
			if (!this.pendingCompositionCommit) { return; }

			this.pendingCompositionCommit = false;
			this.evaluateInput();
		});
	}

	/**
	 * inputイベント：入力中評価（normalize → validate、表示/raw同期、class更新）
	 * @returns {void}
	 */
	onInput() {
		// console.log("[text-input-guard] input");
		// compositionend後に input が来た場合、フォールバックを無効化
		this.pendingCompositionCommit = false;
		this.evaluateInput();
	}

	/**
	 * blurイベント：確定時評価（normalize → validate → fix → format、同期、class更新）
	 * @returns {void}
	 */
	onBlur() {
		// console.log("[text-input-guard] blur");
		this.evaluateCommit();
	}

	/**
	 * focusイベント：表示整形（カンマ等）を剥がして編集しやすい状態にする
	 * - validate は走らせない（触っただけで赤くしたくないため）
	 * @returns {void}
	 */
	onFocus() {
		if (this.composing) { return; }

		const display = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement);
		const current = display.value;

		const ctx = this.createCtx();

		let v = current;
		v = this.runNormalizeChar(v, ctx);       // カンマ除去が効く
		v = this.runNormalizeStructure(v, ctx);

		if (v !== current) {
			this.setDisplayValuePreserveCaret(display, v, ctx);
			this.syncRaw(v);
		}

		// 受理値更新（blockで戻す位置も自然になる）
		this.lastAcceptedValue = v;
		this.lastAcceptedSelection = this.readSelection(display);

		// キャレット/選択範囲の変化も反映しておく（blockで戻す位置も自然になる）
		this.onSelectionChange();
	}

	/**
	 * キャレット/選択範囲の変化を lastAcceptedSelection に反映する
	 * - 値が変わっていない状態でもキャレットは動くため、block時に自然な位置へ戻すために使う
	 * @returns {void}
	 */
	onSelectionChange() {
		// IME変換中は無視（この間はキャレット位置が不安定になることがあるため）
		if (this.composing) {
			return;
		}
		const el = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement);
		this.lastAcceptedSelection = this.readSelection(el);
	}

	/**
	 * display.value を更新しつつ、可能ならカーソル位置を保つ（入力中用）
	 * - 文字が削除される/増える可能性があるので、左側だけ正規化した長さで補正する
	 * @param {HTMLInputElement|HTMLTextAreaElement} el
	 * @param {string} nextValue
	 * @param {GuardContext} ctx
	 * @returns {void}
	 */
	setDisplayValuePreserveCaret(el, nextValue, ctx) {
		const prevValue = el.value;
		if (prevValue === nextValue) { return; }

		const start = el.selectionStart;
		const end = el.selectionEnd;

		// selectionが取れないなら単純代入
		if (start == null || end == null) {
			el.value = nextValue;
			return;
		}

		// 左側の文字列を「同じ正規化」で処理して、新しいカーソル位置を推定
		const leftPrev = prevValue.slice(0, start);
		let leftNext = leftPrev;
		leftNext = this.runNormalizeChar(leftNext, ctx);
		leftNext = this.runNormalizeStructure(leftNext, ctx);

		el.value = nextValue;

		const newPos = Math.min(leftNext.length, nextValue.length);
		try {
			el.setSelectionRange(newPos, newPos);
		} catch (_e) {
			// type=hidden/number などでは例外の可能性があるが、ここはtext想定
		}
	}

	/**
	 * 入力中の評価（IME中は何もしない）
	 * - 固定順：normalize.char → normalize.structure → validate
	 * - 値が変わったら display に反映し、raw も同期する
	 * @returns {void}
	 */
	evaluateInput() {
		if (this.composing) {
			return;
		}

		this.clearErrors();
		this.revertRequest = null;

		const display = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement);
		const current = display.value;

		const ctx = this.createCtx();

		// raw候補（入力中は表示値＝rawとして扱う）
		let raw = current;

		raw = this.runNormalizeChar(raw, ctx);
		raw = this.runNormalizeStructure(raw, ctx);

		// normalizeで変わったら反映（selection補正）
		if (raw !== current) {
			this.setDisplayValuePreserveCaret(display, raw, ctx);
		}

		// validate（入力中：エラー出すだけ）
		this.runValidate(raw, ctx);

		// revert要求が出たら巻き戻して終了
		if (this.revertRequest) {
			this.revertDisplay(this.revertRequest);
			return;
		}

		// rawは常に最新に（swapでも非swapでもOK）
		this.syncRaw(raw);

		this.applyInvalidClass();

		// 受理値は常にrawとして保存（revert先・getRawValueの一貫性）
		this.lastAcceptedValue = raw;
		this.lastAcceptedSelection = this.readSelection(display);
	}

	/**
	 * 確定時（blur）の評価（IME中は何もしない）
	 * - 固定順：normalize.char → normalize.structure → validate → fix → format
	 * - raw は format 前、display は format 後
	 * @returns {void}
	 */
	evaluateCommit() {
		if (this.composing) {
			return;
		}

		this.clearErrors();
		this.revertRequest = null;

		const display = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement);
		const ctx = this.createCtx();

		// 1) raw候補（displayから取得）
		let raw = display.value;

		// 2) 正規化（rawとして扱う形に揃える）
		raw = this.runNormalizeChar(raw, ctx);
		raw = this.runNormalizeStructure(raw, ctx);

		// 3) 入力内容の検査（fix前）
		this.runValidate(raw, ctx);

		// block要求があれば戻す（将来用）
		if (this.revertRequest) {
			this.revertDisplay(this.revertRequest);
			return;
		}

		// 4) commitのみの補正（丸め・切り捨て・繰り上がりなど）
		raw = this.runFix(raw, ctx);

		// 5) 最終rawで検査し直す（fixで値が変わった場合に対応）
		this.clearErrors();
		this.revertRequest = null;
		this.runValidate(raw, ctx);

		if (this.revertRequest) {
			this.revertDisplay(this.revertRequest);
			return;
		}

		// 6) raw同期（format前を入れる）
		this.syncRaw(raw);

		// 7) 表示用は format 後（カンマ等）
		let shown = raw;
		shown = this.runFormat(shown, ctx);

		this.syncDisplay(shown);

		this.applyInvalidClass();

		// 8) 受理値は raw を保持（revertやgetRawValueが安定する）
		this.lastAcceptedValue = raw;
		this.lastAcceptedSelection = this.readSelection(display);
	}

	/**
	 * 現在のエラー有無を返す（errorsが空なら true）
	 * @returns {boolean}
	 */
	isValid() {
		return this.errors.length === 0;
	}

	/**
	 * エラー配列のコピーを返す（外から破壊されないように slice）
	 * @returns {TigError[]}
	 */
	getErrors() {
		return this.errors.slice();
	}

	/**
	 * 送信用の値（rawがあれば raw、なければ display の値）を返す
	 * @returns {string}
	 */
	getRawValue() {
		return /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.hostElement).value;
	}

	/**
	 * 表示用の値を返す（displayの値）
	 * @returns {string}
	 */
	getDisplayValue() {
		return /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement).value;
	}

	/**
	 * 表示要素の値をプログラムから設定する
	 *
	 * @param {SetValueInput} value
	 * @param {SetValueMode} [mode="commit"]
	 * @returns {void}
	 */
	setValue(value, mode = "commit") {
		/** @type {string} */
		let s;

		if (value == null) {
			s = "";
		} else if (typeof value === "number") {
		// NaN/Infinity は事故りやすいので空に寄せる（方針）
			s = Number.isFinite(value) ? String(value) : "";
		} else {
			s = String(value);
		}

		const display = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement);
		display.value = s;

		if (mode === "none") {
			this.syncRaw(s);
			this.lastAcceptedValue = s;
			this.lastAcceptedSelection = this.readSelection(display);
			return;
		}
		if (mode === "input") {
			this.evaluateInput();
			return;
		}
		this.evaluateCommit();
	}

	/**
	 * 外部に公開する Guard API を生成して返す
	 * - InputGuard 自体を公開せず、最小の操作だけを渡す
	 * @returns {Guard}
	 */
	toGuard() {
		return {
			detach: () => this.detach(),
			isValid: () => this.isValid(),
			getErrors: () => this.getErrors(),
			getRawValue: () => this.getRawValue(),
			getDisplayValue: () => this.getDisplayValue(),
			getRawElement: () => /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.hostElement),
			getDisplayElement: () => /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement),
			evaluate: () => this.evaluateInput(),
			commit: () => this.evaluateCommit(),
			setValue: (value, mode) => this.setValue(value, mode)
		};
	}
}

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

/**
 * enum のカンマ区切り複数指定を解釈する（未指定なら undefined）
 * - 未指定なら undefined
 * - 空要素は無視
 * - allowed に含まれないものは除外
 *
 * 例:
 * - "a,b,c" -> ["a","b","c"]（allowed に含まれるもののみ）
 * - "" / "   " -> undefined
 * - "x,y"（どちらも allowed 外）-> []
 *
 * @template {string} T
 * @param {string|undefined} v
 * @param {readonly T[]} allowed
 * @returns {T[]|undefined}
 */
function parseDatasetEnumList(v, allowed) {
	if (v == null) { return; }
	const s = String(v).trim();
	if (s === "") { return; }

	/** @type {string[]} */
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
 * @typedef {GuardGroup} GuardGroup
 * @typedef {Guard} Guard
 * @typedef {AttachOptions} AttachOptions
 * @typedef {Rule} Rule
 */

/**
 * data属性からルールを生成できるルールファクトリ
 * @typedef {Object} RuleFactory
 * @property {string} name
 * @property {(dataset: DOMStringMap, el: HTMLInputElement|HTMLTextAreaElement) => Rule|null} fromDataset
 */

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
 * - 設定系（data-tig-separate / warn / invalid-class）
 * - ルール系（data-tig-rules-* が1つでもある）
 * @param {DOMStringMap} ds
 * @returns {boolean}
 */
function hasAnyJpigConfig(ds) {
	// attach設定系
	if (ds.tigSeparate != null) { return true; }
	if (ds.tigWarn != null) { return true; }
	if (ds.tigInvalidClass != null) { return true; }

	// ルール系（data-tig-rules-*）
	for (const k in ds) {
		// data-tig-rules-numeric -> ds.tigRulesNumeric
		if (k.startsWith("tigRules")) {
			return true;
		}
	}
	return false;
}

/**
 * autoAttach の実体（attach関数とルールレジストリを保持する）
 */
class InputGuardAutoAttach {
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
	 * - 既に `data-tig-attached` が付いているものはスキップ
	 * - `data-tig-*`（設定）と `data-tig-rules-*`（ルール）を拾って options を生成
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
			if (ds.tigAttached === "true") { continue; }

			// JPIGの設定が何も無ければ対象外
			if (!hasAnyJpigConfig(ds)) { continue; }

			/** @type {AttachOptions} */
			const options = {};

			// warn / invalidClass
			const warn = parseDatasetBool(ds.tigWarn);
			if (warn != null) { options.warn = warn; }

			if (ds.tigInvalidClass != null && String(ds.tigInvalidClass).trim() !== "") {
				options.invalidClass = String(ds.tigInvalidClass);
			}

			// separateValue（未指定は auto）
			options.separateValue = { mode: parseSeparateMode(ds.tigSeparate) };

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
						console.warn(`[text-input-guard] autoAttach: rule "${fac.name}" fromDataset() threw an error.`, e);
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
			el.dataset.tigAttached = "true";
		}

		return {
			detach: () => { for (const g of guards) { g.detach(); } },
			isValid: () => guards.every((g) => g.isValid()),
			getErrors: () => guards.flatMap((g) => g.getErrors()),
			getGuards: () => guards
		};
	}
}

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
 * numeric ルールのオプション
 * @typedef {Object} NumericRuleOptions
 * @property {boolean} [allowFullWidth=true] - 全角数字/記号を許可して半角へ正規化する
 * @property {boolean} [allowMinus=false] - マイナス記号を許可する（先頭のみ）
 * @property {boolean} [allowDecimal=false] - 小数点を許可する（1つだけ）
 * @property {boolean} [allowEmpty=true] - 空文字を許可するか
 */

/**
 * 数値入力向けルールを生成する
 * - normalize.char: 全角→半角、記号統一、不要文字の除去
 * - normalize.structure: 「-は先頭のみ」「.は1つだけ」など構造を整える
 * - fix: 確定時（blur）に「-」「.」「-.」や末尾の「.」を空/削除にする
 *
 * @param {NumericRuleOptions} [options]
 * @returns {Rule}
 */
function numeric(options = {}) {
	/** @type {NumericRuleOptions} */
	const opt = {
		allowFullWidth: options.allowFullWidth ?? true,
		allowMinus: options.allowMinus ?? false,
		allowDecimal: options.allowDecimal ?? false,
		allowEmpty: options.allowEmpty ?? true
	};

	/** @type {Set<string>} */
	const minusLike = new Set([
		"ー", // KATAKANA-HIRAGANA PROLONGED SOUND MARK
		"－", // FULLWIDTH HYPHEN-MINUS
		"−", // MINUS SIGN
		"‐", // HYPHEN
		"-", // NON-BREAKING HYPHEN
		"‒", // FIGURE DASH
		"–", // EN DASH
		"—", // EM DASH
		"―" // HORIZONTAL BAR
	]);

	/** @type {Set<string>} */
	const dotLike = new Set([
		"．", // FULLWIDTH FULL STOP
		"。", // IDEOGRAPHIC FULL STOP
		"｡" // HALFWIDTH IDEOGRAPHIC FULL STOP
	]);

	/**
	 * 全角数字（０〜９）を半角へ
	 * @param {string} ch
	 * @returns {string|null} 変換した1文字（対象外ならnull）
	 */
	function toHalfWidthDigit(ch) {
		const code = ch.charCodeAt(0);
		// '０'(FF10) .. '９'(FF19)
		if (0xFF10 <= code && code <= 0xFF19) {
			return String.fromCharCode(code - 0xFF10 + 0x30);
		}
		return null;
	}

	/**
	 * 1文字を「数字 / - / .」へ正規化する（許可されない場合は空）
	 * @param {string} ch
	 * @returns {string} 正規化後の文字（除去なら ""）
	 */
	function normalizeChar1(ch) {
		// 半角数字
		if (ch >= "0" && ch <= "9") {
			return ch;
		}

		// 全角数字
		if (opt.allowFullWidth) {
			const d = toHalfWidthDigit(ch);
			if (d) {
				return d;
			}
		}

		// 小数点
		if (ch === ".") {
			return opt.allowDecimal ? "." : "";
		}
		if (opt.allowFullWidth && dotLike.has(ch)) {
			return opt.allowDecimal ? "." : "";
		}

		// マイナス
		if (ch === "-") {
			return opt.allowMinus ? "-" : "";
		}
		if (opt.allowFullWidth && minusLike.has(ch)) {
			return opt.allowMinus ? "-" : "";
		}
		// 明示的に不要（+ や指数表記など）
		if (ch === "+" || ch === "＋") {
			return "";
		}
		if (ch === "e" || ch === "E" || ch === "ｅ" || ch === "Ｅ") {
			return "";
		}

		// その他は全部除去
		return "";
	}

	return {
		name: "numeric",
		targets: ["input"],

		/**
		 * 文字単位の正規化（全角→半角、記号統一、不要文字の除去）
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeChar(value) {
			let v = String(value);

			// 表示専用装飾の除去（format対策）
			v = v.replace(/,/g, "");

			let out = "";
			for (const ch of v) {
				out += normalizeChar1(ch);
			}
			return out;
		},

		/**
		 * 構造正規化（-は先頭のみ、.は1つだけ）
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeStructure(value) {
			let out = "";
			let seenMinus = false;
			let seenDot = false;

			for (const ch of String(value)) {
				if (ch >= "0" && ch <= "9") {
					out += ch;
					continue;
				}

				if (ch === "-" && opt.allowMinus) {
					// マイナスは先頭のみ、1回だけ
					if (!seenMinus && out.length === 0) {
						out += "-";
						seenMinus = true;
					}
					continue;
				}

				if (ch === "." && opt.allowDecimal) {
					// 小数点は1つだけ（位置制約は設けない：digits側で精度などを管理）
					if (!seenDot) {
						out += ".";
						seenDot = true;
					}
					continue;
				}

				// その他は捨てる（normalizeCharでほぼ落ちてる想定）
			}

			return out;
		},

		/**
		 * 確定時にだけ消したい “未完成な数値” を整える
		 * - "-" / "." / "-." は空にする
		 * - 末尾の "." は削除する（"12." → "12"）
		 * - ".1" → "0.1"
		 * - "-.1" → "-0.1"
		 * - 整数部の不要な先頭ゼロを除去（"00" → "0", "-0" → "0"）
		 * @param {string} value
		 * @returns {string}
		 */
		fix(value) {
			let v = String(value);

			// 空文字の扱い
			if (v === "") {
				return opt.allowEmpty ? "" : "0";
			}

			// 未完成な数値は空にする
			if (v === "-" || v === "." || v === "-.") {
				return opt.allowEmpty ? "" : "0";
			}

			// "-.1" → "-0.1"
			if (v.startsWith("-.")) {
				v = "-0" + v.slice(1);
			}

			// ".1" → "0.1"
			if (v.startsWith(".")) {
				v = "0" + v;
			}

			// "12." → "12"
			if (v.endsWith(".")) {
				v = v.slice(0, -1);
			}

			// ---- ここからゼロ正規化 ----

			// 符号分離
			let sign = "";
			if (v.startsWith("-")) {
				sign = "-";
				v = v.slice(1);
			}

			const dotIndex = v.indexOf(".");
			let intPart = dotIndex >= 0 ? v.slice(0, dotIndex) : v;
			const fracPart = dotIndex >= 0 ? v.slice(dotIndex + 1) : "";

			// 先頭ゼロ削除（全部ゼロなら "0"）
			intPart = intPart.replace(/^0+/, "");
			if (intPart === "") {
				intPart = "0";
			}

			// "-0" は "0" にする
			if (sign === "-" && intPart === "0" && (!fracPart || /^0*$/.test(fracPart))) {
				sign = "";
			}

			// 再構築
			if (dotIndex >= 0) {
				return `${sign}${intPart}.${fracPart}`;
			}
			return `${sign}${intPart}`;
		},

		/**
		 * numeric単体では基本エラーを出さない（入力途中を許容するため）
		 * ここでエラーにしたい場合は、将来オプションで強制できるようにしてもOK
		 * @param {string} _value
		 * @param {any} _ctx
		 * @returns {void}
		 */
		validate(_value, _ctx) {
			// no-op
		}
	};
}

/**
 * datasetから numeric ルールを生成する
 * - data-tig-rules-numeric が無ければ null
 * - オプションは data-tig-rules-numeric-xxx から読む
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-numeric                       -> dataset.tigRulesNumeric
 * - data-tig-rules-numeric-allow-full-width      -> dataset.tigRulesNumericAllowFullWidth
 * - data-tig-rules-numeric-allow-minus           -> dataset.tigRulesNumericAllowMinus
 * - data-tig-rules-numeric-allow-decimal         -> dataset.tigRulesNumericAllowDecimal
 * - data-tig-rules-numeric-allow-empty           -> dataset.tigRulesNumericAllowEmpty
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
numeric.fromDataset = function fromDataset(dataset, _el) {
	// ON判定：data-tig-rules-numeric が無ければ対象外
	if (dataset.tigRulesNumeric == null) {
		return null;
	}

	/** @type {NumericRuleOptions} */
	const options = {};

	// allowFullWidth（未指定なら numeric側デフォルト true）
	const allowFullWidth = parseDatasetBool(dataset.tigRulesNumericAllowFullWidth);
	if (allowFullWidth != null) {
		options.allowFullWidth = allowFullWidth;
	}

	// allowMinus（未指定なら numeric側デフォルト false）
	const allowMinus = parseDatasetBool(dataset.tigRulesNumericAllowMinus);
	if (allowMinus != null) {
		options.allowMinus = allowMinus;
	}

	// allowDecimal（未指定なら numeric側デフォルト false）
	const allowDecimal = parseDatasetBool(dataset.tigRulesNumericAllowDecimal);
	if (allowDecimal != null) {
		options.allowDecimal = allowDecimal;
	}

	// data-tig-rules-numeric-allow-empty（未指定なら numeric側デフォルト true）
	const allowEmpty = parseDatasetBool(dataset.tigRulesNumericAllowEmpty);
	if (allowEmpty != null) {
		options.allowEmpty = allowEmpty;
	}

	return numeric(options);
};

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
 * digits ルールのオプション
 * @typedef {Object} DigitsRuleOptions
 * @property {number} [int] - 整数部の最大桁数（省略可）
 * @property {number} [frac] - 小数部の最大桁数（省略可）
 * @property {boolean} [countLeadingZeros=true] - 整数部の先頭ゼロを桁数に含める
 * @property {"none"|"truncateLeft"|"truncateRight"|"clamp"} [fixIntOnBlur="none"] - blur時の整数部補正
 * @property {"none"|"truncate"|"round"} [fixFracOnBlur="none"] - blur時の小数部補正
 * @property {"none"|"block"} [overflowInputInt="none"] - 入力中：整数部が最大桁を超える入力をブロックする
 * @property {"none"|"block"} [overflowInputFrac="none"] - 入力中：小数部が最大桁を超える入力をブロックする
 * @property {boolean} [forceFracOnBlur=false] - blur時に小数部を必ず表示（frac桁まで0埋め）
 */

/**
 * 数値文字列を「符号・整数部・小数部」に分解する
 * - numericルール後の値（数字/./-のみ）を想定
 * @param {string} value
 * @returns {{ sign: ""|"-", intPart: string, fracPart: string, hasDot: boolean }}
 */
function splitNumber(value) {
	const v = String(value);

	/** @type {""|"-"} */
	let sign = "";
	let s = v;

	if (s.startsWith("-")) {
		sign = "-";
		s = s.slice(1);
	}

	const dotIndex = s.indexOf(".");
	const hasDot = dotIndex >= 0;

	if (!hasDot) {
		return { sign, intPart: s, fracPart: "", hasDot: false };
	}

	const intPart = s.slice(0, dotIndex);
	const fracPart = s.slice(dotIndex + 1);

	return { sign, intPart, fracPart, hasDot: true };
}

/**
 * 整数部の桁数を数える（先頭ゼロを含める/含めないを選べる）
 * @param {string} intPart
 * @param {boolean} countLeadingZeros
 * @returns {number}
 */
function countIntDigits(intPart, countLeadingZeros) {
	const s = intPart ?? "";
	if (s.length === 0) { return 0; }

	if (countLeadingZeros) { return s.length; }

	// 先頭ゼロを除外して数える（全部ゼロなら 1 として扱う）
	const trimmed = s.replace(/^0+/, "");
	return trimmed.length === 0 ? 1 : trimmed.length;
}

/**
 * 任意桁の「+1」加算（10進文字列、非負のみ）
 * @param {string} dec
 * @returns {string}
 */
function addOne(dec) {
	let carry = 1;
	const arr = dec.split("");

	for (let i = arr.length - 1; i >= 0; i--) {
		const n = arr[i].charCodeAt(0) - 48 + carry;
		if (n >= 10) {
			arr[i] = "0";
			carry = 1;
		} else {
			arr[i] = String.fromCharCode(48 + n);
			carry = 0;
			break;
		}
	}

	if (carry === 1) { arr.unshift("1"); }
	return arr.join("");
}

/**
 * 小数を指定桁に四捨五入する（文字列ベース、浮動小数点を使わない）
 * @param {string} intPart
 * @param {string} fracPart
 * @param {number} fracLimit
 * @returns {{ intPart: string, fracPart: string }}
 */
function roundFraction(intPart, fracPart, fracLimit) {
	const f = fracPart ?? "";
	if (f.length <= fracLimit) {
		return { intPart, fracPart: f };
	}

	const keep = f.slice(0, fracLimit);
	const nextDigit = f.charCodeAt(fracLimit) - 48; // 0..9

	if (nextDigit < 5) {
		return { intPart, fracPart: keep };
	}

	// 繰り上げ
	if (fracLimit === 0) {
		const newInt = addOne(intPart.length ? intPart : "0");
		return { intPart: newInt, fracPart: "" };
	}

	// 小数部を +1（桁あふれをcarryで扱う）
	let carry = 1;
	const arr = keep.split("");

	for (let i = arr.length - 1; i >= 0; i--) {
		const n = (arr[i].charCodeAt(0) - 48) + carry;
		if (n >= 10) {
			arr[i] = "0";
			carry = 1;
		} else {
			arr[i] = String.fromCharCode(48 + n);
			carry = 0;
			break;
		}
	}

	const newFrac = arr.join("");
	let newInt = intPart;

	if (carry === 1) {
		newInt = addOne(intPart.length ? intPart : "0");
	}

	return { intPart: newInt, fracPart: newFrac };
}

/**
 * digits ルールを生成する
 * @param {DigitsRuleOptions} [options]
 * @returns {Rule}
 */
function digits(options = {}) {
	/** @type {DigitsRuleOptions} */
	const opt = {
		int: typeof options.int === "number" ? options.int : undefined,
		frac: typeof options.frac === "number" ? options.frac : undefined,
		countLeadingZeros: options.countLeadingZeros ?? true,
		fixIntOnBlur: options.fixIntOnBlur ?? "none",
		fixFracOnBlur: options.fixFracOnBlur ?? "none",
		overflowInputInt: options.overflowInputInt ?? "none",
		overflowInputFrac: options.overflowInputFrac ?? "none",
		forceFracOnBlur: options.forceFracOnBlur ?? false
	};

	return {
		name: "digits",
		targets: ["input"],

		/**
		 * 桁数チェック（入力中：エラーを積むだけ）
		 * @param {string} value
		 * @param {GuardContext} ctx
		 * @returns {void}
		 */
		validate(value, ctx) {
			const v = String(value);

			// 入力途中は極力うるさくしない（numericのfixに任せる）
			if (v === "" || v === "-" || v === "." || v === "-.") { return; }

			const { intPart, fracPart } = splitNumber(v);

			// 整数部桁数
			if (typeof opt.int === "number") {
				const intDigits = countIntDigits(intPart, opt.countLeadingZeros);
				if (intDigits > opt.int) {
					// 入力ブロック（int）
					if (opt.overflowInputInt === "block") {
						ctx.requestRevert({
							reason: "digits.int_overflow",
							detail: { limit: opt.int, actual: intDigits }
						});
						return; // もう戻すので、以降は触らない
					}

					// エラー積むだけ（従来どおり）
					ctx.pushError({
						code: "digits.int_overflow",
						rule: "digits",
						phase: "validate",
						detail: { limit: opt.int, actual: intDigits }
					});
				}
			}

			// 小数部桁数
			if (typeof opt.frac === "number") {
				const fracDigits = (fracPart ?? "").length;
				if (fracDigits > opt.frac) {
					// 入力ブロック（frac）
					if (opt.overflowInputFrac === "block") {
						ctx.requestRevert({
							reason: "digits.frac_overflow",
							detail: { limit: opt.frac, actual: fracDigits }
						});
						return;
					}

					ctx.pushError({
						code: "digits.frac_overflow",
						rule: "digits",
						phase: "validate",
						detail: { limit: opt.frac, actual: fracDigits }
					});
				}
			}
		},

		/**
		 * blur時の穏やか補正（整数部/小数部）
		 * - 整数部: truncateLeft / truncateRight / clamp
		 * - 小数部: truncate / round
		 * @param {string} value
		 * @param {GuardContext} _ctx
		 * @returns {string}
		 */
		fix(value, _ctx) {
			const v = String(value);
			if (v === "" || v === "-" || v === "." || v === "-.") { return v; }

			const parts = splitNumber(v);
			let { intPart, fracPart } = parts;
			const { sign, hasDot } = parts;

			// --- 整数部補正 ---
			if (typeof opt.int === "number" && opt.fixIntOnBlur !== "none") {
				// ※ 補正は「見た目の桁数」で判定（先頭ゼロ含む）
				const actual = (intPart ?? "").length;

				if (actual > opt.int) {
					if (opt.fixIntOnBlur === "truncateLeft") {
						// 末尾 opt.int 桁を残す（先頭＝大きい桁を削る）
						intPart = intPart.slice(intPart.length - opt.int);
					} else if (opt.fixIntOnBlur === "truncateRight") {
						// 先頭 opt.int 桁を残す（末尾＝小さい桁を削る）
						intPart = intPart.slice(0, opt.int);
					} else if (opt.fixIntOnBlur === "clamp") {
						intPart = "9".repeat(opt.int);
					}
				}
			}

			// --- 小数部補正 ---
			if (typeof opt.frac === "number" && opt.fixFracOnBlur !== "none" && hasDot) {
				const limit = opt.frac;
				const f = fracPart ?? "";

				if (f.length > limit) {
					if (opt.fixFracOnBlur === "truncate") {
						fracPart = f.slice(0, limit);
					} else if (opt.fixFracOnBlur === "round") {
						const rounded = roundFraction(intPart, f, limit);
						intPart = rounded.intPart;
						fracPart = rounded.fracPart;
					}
				}
			}

			if (opt.forceFracOnBlur && typeof opt.frac === "number" && opt.frac > 0) {
				const limit = opt.frac;
				// "." が無いなら作る（12 → 12.00）
				if (!hasDot) {
					fracPart = "";
				}
				// 足りない分を 0 埋め（12.3 → 12.30 / 12. → 12.00）
				const f = fracPart ?? "";
				if (f.length < limit) {
					fracPart = f + "0".repeat(limit - f.length);
				}
			}

			// 組み立て
			if (typeof opt.frac !== "number") {
				// frac未指定なら、dot があっても digits は触らず intだけ返す方針（現状維持）
				return `${sign}${intPart}`;
			}

			if (opt.frac === 0) {
				// 小数0桁なら常に整数表示
				return `${sign}${intPart}`;
			}

			// frac 指定あり（1以上）
			if (hasDot || (opt.forceFracOnBlur && opt.frac > 0)) {
				// "." が無いけど forceFracOnBlur の場合もここに来る
				const f = fracPart ?? "";
				return `${sign}${intPart}.${f}`;
			}

			// "." が無くて force もしないなら整数表示
			return `${sign}${intPart}`;
		}
	};
}

/**
 * datasetから digits ルールを生成する
 * - data-tig-rules-digits が無ければ null
 * - オプションは data-tig-rules-digits-xxx から読む
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-digits                          -> dataset.tigRulesDigits
 * - data-tig-rules-digits-int                      -> dataset.tigRulesDigitsInt
 * - data-tig-rules-digits-frac                     -> dataset.tigRulesDigitsFrac
 * - data-tig-rules-digits-count-leading-zeros      -> dataset.tigRulesDigitsCountLeadingZeros
 * - data-tig-rules-digits-fix-int-on-blur          -> dataset.tigRulesDigitsFixIntOnBlur
 * - data-tig-rules-digits-fix-frac-on-blur         -> dataset.tigRulesDigitsFixFracOnBlur
 * - data-tig-rules-digits-overflow-input-int       -> dataset.tigRulesDigitsOverflowInputInt
 * - data-tig-rules-digits-overflow-input-frac      -> dataset.tigRulesDigitsOverflowInputFrac
 * - data-tig-rules-digits-force-frac-on-blur       -> dataset.tigRulesDigitsForceFracOnBlur
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
digits.fromDataset = function fromDataset(dataset, _el) {
	// ON判定
	if (dataset.tigRulesDigits == null) {
		return null;
	}

	/** @type {DigitsRuleOptions} */
	const options = {};

	// int / frac
	const intN = parseDatasetNumber(dataset.tigRulesDigitsInt);
	if (intN != null) {
		options.int = intN;
	}

	const fracN = parseDatasetNumber(dataset.tigRulesDigitsFrac);
	if (fracN != null) {
		options.frac = fracN;
	}

	// countLeadingZeros
	const clz = parseDatasetBool(dataset.tigRulesDigitsCountLeadingZeros);
	if (clz != null) {
		options.countLeadingZeros = clz;
	}

	// fixIntOnBlur / fixFracOnBlur
	const fixInt = parseDatasetEnum(dataset.tigRulesDigitsFixIntOnBlur, [
		"none",
		"truncateLeft",
		"truncateRight",
		"clamp"
	]);
	if (fixInt != null) {
		options.fixIntOnBlur = fixInt;
	}

	const fixFrac = parseDatasetEnum(dataset.tigRulesDigitsFixFracOnBlur, [
		"none",
		"truncate",
		"round"
	]);
	if (fixFrac != null) {
		options.fixFracOnBlur = fixFrac;
	}

	// overflowInputInt / overflowInputFrac
	const ovInt = parseDatasetEnum(dataset.tigRulesDigitsOverflowInputInt, ["none", "block"]);
	if (ovInt != null) {
		options.overflowInputInt = ovInt;
	}

	const ovFrac = parseDatasetEnum(dataset.tigRulesDigitsOverflowInputFrac, ["none", "block"]);
	if (ovFrac != null) {
		options.overflowInputFrac = ovFrac;
	}

	// forceFracOnBlur
	const forceFrac = parseDatasetBool(dataset.tigRulesDigitsForceFracOnBlur);
	if (forceFrac != null) {
		options.forceFracOnBlur = forceFrac;
	}

	return digits(options);
};

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
 * カンマ付与ルール
 * - blur時のみ整数部に3桁区切りカンマを付与する
 * @returns {Rule}
 */
function comma() {
	return {
		name: "comma",
		targets: ["input"],

		/**
		 * 表示整形（確定時のみ）
		 *
		 * 前提:
		 * - numeric / digits 等で正規化済みの数値文字列が渡される
		 * - 整数部・小数部・符号のみを含む（カンマは含まない想定）
		 *
		 * @param {string} value
		 * @returns {string}
		 */
		format(value) {
			const v = String(value);
			if (v === "" || v === "-" || v === "." || v === "-.") {
				return v;
			}

			let sign = "";
			let s = v;

			if (s.startsWith("-")) {
				sign = "-";
				s = s.slice(1);
			}

			const dotIndex = s.indexOf(".");
			const intPart = dotIndex >= 0 ? s.slice(0, dotIndex) : s;
			const fracPart = dotIndex >= 0 ? s.slice(dotIndex + 1) : null;

			// 整数部にカンマ
			const withComma = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

			if (fracPart != null) {
				return `${sign}${withComma}.${fracPart}`;
			}
			return `${sign}${withComma}`;
		}
	};
}
/**
 * datasetから comma ルールを生成する
 * - data-tig-rules-comma が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-comma -> dataset.tigRulesComma
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
comma.fromDataset = function fromDataset(dataset, _el) {
	// ON判定：data-tig-rules-comma が無ければ対象外
	if (dataset.tigRulesComma == null) {
		return null;
	}
	return comma();
};

/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */

/**
 * 制御文字マップ
 * @type {Record<number, string>}
 * @ignore
 */
let control_charcter_map = null;

/**
 * コードポイントからUnicodeのブロック名に変換する
 * @type {(codepoint: number) => (string)}
 * @ignore
 */
let toBlockNameFromUnicode = null;

/**
 * コードポイントから異体字セレクタの判定をする
 * @type {(codepoint: number, annotate?: boolean) => (string|null)}
 * @ignore
 */
let getVariationSelectorsnumberFromCodePoint = null;

/**
 * コードポイントからタグ文字の判定をする
 * @type {(codepoint: number) => (string|null)}
 * @ignore
 */
let getTagCharacterFromCodePoint = null;

/**
 * Unicode を扱うクラス
 * @ignore
 */
class Unicode {
	/**
	 * 初期化
	 */
	static init() {
		if (Unicode.is_initmap) {
			return;
		}
		Unicode.is_initmap = true;

		/**
		 * 制御文字、VS、タグ文字は多いため含めていない
		 */
		// prettier-ignore
		control_charcter_map = {
			// --- C0 control characters (ASCII 0x00–0x1F) ---
			0: "NUL", // Null
			1: "SOH", // Start of Heading
			2: "STX", // Start of Text
			3: "ETX", // End of Text
			4: "EOT", // End of Transmission
			5: "ENQ", // Enquiry
			6: "ACK", // Acknowledge
			7: "BEL", // Bell (beep)

			8: "BS",  // Backspace
			9: "HT",  // Horizontal Tab
			10: "LF",  // Line Feed
			11: "VT",  // Vertical Tab
			12: "FF",  // Form Feed
			13: "CR",  // Carriage Return
			14: "SO",  // Shift Out
			15: "SI",  // Shift In

			16: "DLE", // Data Link Escape
			17: "DC1", // Device Control 1 (XON)
			18: "DC2", // Device Control 2
			19: "DC3", // Device Control 3 (XOFF)
			20: "DC4", // Device Control 4
			21: "NAK", // Negative Acknowledge
			22: "SYN", // Synchronous Idle
			23: "ETB", // End of Transmission Block

			24: "CAN", // Cancel
			25: "EM",  // End of Medium
			26: "SUB", // Substitute
			27: "ESC", // Escape
			28: "FS",  // File Separator
			29: "GS",  // Group Separator
			30: "RS",  // Record Separator
			31: "US",  // Unit Separator

			// --- DEL ---
			127: "DEL", // Delete

			// --- C1 control characters (ISO/IEC 6429, 0x80–0x9F) ---
			128: "PAD", // Padding Character
			129: "HOP", // High Octet Preset
			130: "BPH", // Break Permitted Here
			131: "NBH", // No Break Here
			132: "IND", // Index
			133: "NEL", // Next Line
			134: "SSA", // Start of Selected Area
			135: "ESA", // End of Selected Area
			136: "HTS", // Horizontal Tab Set
			137: "HTJ", // Horizontal Tab with Justification
			138: "VTS", // Vertical Tab Set
			139: "PLD", // Partial Line Down
			140: "PLU", // Partial Line Up
			141: "RI",  // Reverse Index
			142: "SS2", // Single Shift 2
			143: "SS3", // Single Shift 3
			144: "DCS", // Device Control String
			145: "PU1", // Private Use 1
			146: "PU2", // Private Use 2
			147: "STS", // Set Transmit State
			148: "CCH", // Cancel Character
			149: "MW",  // Message Waiting
			150: "SPA", // Start of Protected Area
			151: "EPA", // End of Protected Area
			152: "SOS", // Start of String
			153: "SGCI", // Single Graphic Character Introducer
			154: "SCI", // Single Character Introducer
			155: "CSI", // Control Sequence Introducer
			156: "ST",  // String Terminator
			157: "OSC", // Operating System Command
			158: "PM",  // Privacy Message
			159: "APC", // Application Program Command

			// --- Unicode but制御的に扱われる文字 ---
			160: "NBSP", // No-Break Space（表示は空白だが改行不可）
			173: "SHY",  // Soft Hyphen（通常は表示されない）

			// --- Unicode Interlinear Annotation ---
			65529: "IAA", // Interlinear Annotation Anchor
			65530: "IAS", // Interlinear Annotation Separator
			65531: "IAT", // Interlinear Annotation Terminator

			// Zero Width / Joiner 系（Cf）
			0x200B: "ZWSP",   // ZERO WIDTH SPACE ゼロ幅スペース
			0x200C: "ZWNJ",   // ZERO WIDTH NON-JOINER ゼロ幅非接合子
			0x200D: "ZWJ",    // ZERO WIDTH JOINER ゼロ幅接合子
			0x2060: "WJ",     // WORD JOINER 単語結合子
			0xFEFF: "BOM",    // BYTE ORDER MARK / ZERO WIDTH NO-BREAK SPACE

			// 双方向（BiDi）制御文字
			0x202A: "LRE",    // LEFT-TO-RIGHT EMBEDDING
			0x202B: "RLE",    // RIGHT-TO-LEFT EMBEDDING
			0x202C: "PDF",    // POP DIRECTIONAL FORMATTING
			0x202D: "LRO",    // LEFT-TO-RIGHT OVERRIDE
			0x202E: "RLO",    // RIGHT-TO-LEFT OVERRIDE

			0x2066: "LRI",    // LEFT-TO-RIGHT ISOLATE
			0x2067: "RLI",    // RIGHT-TO-LEFT ISOLATE
			0x2068: "FSI",    // FIRST STRONG ISOLATE
			0x2069: "PDI",    // POP DIRECTIONAL ISOLATE

			// Unicode Noncharacter（検証・防御用途）
			0xFFFE: "NONCHAR_FFFE",
			0xFFFF: "NONCHAR_FFFF"
		};

		// prettier-ignore
		const unicode_blockname_array = [
			"Basic Latin", "Latin-1 Supplement", "Latin Extended-A", "Latin Extended-B", "IPA Extensions", "Spacing Modifier Letters", "Combining Diacritical Marks", "Greek and Coptic",
			"Cyrillic", "Cyrillic Supplement", "Armenian", "Hebrew", "Arabic", "Syriac", "Arabic Supplement", "Thaana",
			"NKo", "Samaritan", "Mandaic", "Syriac Supplement", "Arabic Extended-B", "Arabic Extended-A", "Devanagari", "Bengali",
			"Gurmukhi", "Gujarati", "Oriya", "Tamil", "Telugu", "Kannada", "Malayalam", "Sinhala",
			"Thai", "Lao", "Tibetan", "Myanmar", "Georgian", "Hangul Jamo", "Ethiopic", "Ethiopic Supplement",
			"Cherokee", "Unified Canadian Aboriginal Syllabics", "Ogham", "Runic", "Tagalog", "Hanunoo", "Buhid", "Tagbanwa",
			"Khmer", "Mongolian", "Unified Canadian Aboriginal Syllabics Extended", "Limbu", "Tai Le", "New Tai Lue", "Khmer Symbols", "Buginese",
			"Tai Tham", "Combining Diacritical Marks Extended", "Balinese", "Sundanese", "Batak", "Lepcha", "Ol Chiki", "Cyrillic Extended-C",
			"Georgian Extended", "Sundanese Supplement", "Vedic Extensions", "Phonetic Extensions", "Phonetic Extensions Supplement", "Combining Diacritical Marks Supplement", "Latin Extended Additional", "Greek Extended",
			"General Punctuation", "Superscripts and Subscripts", "Currency Symbols", "Combining Diacritical Marks for Symbols", "Letterlike Symbols", "Number Forms", "Arrows", "Mathematical Operators",
			"Miscellaneous Technical", "Control Pictures", "Optical Character Recognition", "Enclosed Alphanumerics", "Box Drawing", "Block Elements", "Geometric Shapes", "Miscellaneous Symbols",
			"Dingbats", "Miscellaneous Mathematical Symbols-A", "Supplemental Arrows-A", "Braille Patterns", "Supplemental Arrows-B", "Miscellaneous Mathematical Symbols-B", "Supplemental Mathematical Operators", "Miscellaneous Symbols and Arrows",
			"Glagolitic", "Latin Extended-C", "Coptic", "Georgian Supplement", "Tifinagh", "Ethiopic Extended", "Cyrillic Extended-A", "Supplemental Punctuation",
			"CJK Radicals Supplement", "Kangxi Radicals", "Ideographic Description Characters", "CJK Symbols and Punctuation", "Hiragana", "Katakana", "Bopomofo", "Hangul Compatibility Jamo",
			"Kanbun", "Bopomofo Extended", "CJK Strokes", "Katakana Phonetic Extensions", "Enclosed CJK Letters and Months", "CJK Compatibility", "CJK Unified Ideographs Extension A", "Yijing Hexagram Symbols",
			"CJK Unified Ideographs", "Yi Syllables", "Yi Radicals", "Lisu", "Vai", "Cyrillic Extended-B", "Bamum", "Modifier Tone Letters",
			"Latin Extended-D", "Syloti Nagri", "Common Indic Number Forms", "Phags-pa", "Saurashtra", "Devanagari Extended", "Kayah Li", "Rejang",
			"Hangul Jamo Extended-A", "Javanese", "Myanmar Extended-B", "Cham", "Myanmar Extended-A", "Tai Viet", "Meetei Mayek Extensions", "Ethiopic Extended-A",
			"Latin Extended-E", "Cherokee Supplement", "Meetei Mayek", "Hangul Syllables", "Hangul Jamo Extended-B", "High Surrogates", "High Private Use Surrogates", "Low Surrogates",
			"Private Use Area", "CJK Compatibility Ideographs", "Alphabetic Presentation Forms", "Arabic Presentation Forms-A", "Variation Selectors", "Vertical Forms", "Combining Half Marks", "CJK Compatibility Forms",
			"Small Form Variants", "Arabic Presentation Forms-B", "Halfwidth and Fullwidth Forms", "Specials", "Linear B Syllabary", "Linear B Ideograms", "Aegean Numbers", "Ancient Greek Numbers",
			"Ancient Symbols", "Phaistos Disc", "Lycian", "Carian", "Coptic Epact Numbers", "Old Italic", "Gothic", "Old Permic",
			"Ugaritic", "Old Persian", "Deseret", "Shavian", "Osmanya", "Osage", "Elbasan", "Caucasian Albanian",
			"Vithkuqi", "Linear A", "Latin Extended-F", "Cypriot Syllabary", "Imperial Aramaic", "Palmyrene", "Nabataean", "Hatran",
			"Phoenician", "Lydian", "Meroitic Hieroglyphs", "Meroitic Cursive", "Kharoshthi", "Old South Arabian", "Old North Arabian", "Manichaean",
			"Avestan", "Inscriptional Parthian", "Inscriptional Pahlavi", "Psalter Pahlavi", "Old Turkic", "Old Hungarian", "Hanifi Rohingya", "Rumi Numeral Symbols",
			"Yezidi", "Arabic Extended-C", "Old Sogdian", "Sogdian", "Old Uyghur", "Chorasmian", "Elymaic", "Brahmi",
			"Kaithi", "Sora Sompeng", "Chakma", "Mahajani", "Sharada", "Sinhala Archaic Numbers", "Khojki", "Multani",
			"Khudawadi", "Grantha", "Newa", "Tirhuta", "Siddham", "Modi", "Mongolian Supplement", "Takri",
			"Ahom", "Dogra", "Warang Citi", "Dives Akuru", "Nandinagari", "Zanabazar Square", "Soyombo", "Unified Canadian Aboriginal Syllabics Extended-A",
			"Pau Cin Hau", "Devanagari Extended-A", "Bhaiksuki", "Marchen", "Masaram Gondi", "Gunjala Gondi", "Makasar", "Kawi",
			"Lisu Supplement", "Tamil Supplement", "Cuneiform", "Cuneiform Numbers and Punctuation", "Early Dynastic Cuneiform", "Cypro-Minoan", "Egyptian Hieroglyphs", "Egyptian Hieroglyph Format Controls",
			"Anatolian Hieroglyphs", "Bamum Supplement", "Mro", "Tangsa", "Bassa Vah", "Pahawh Hmong", "Medefaidrin", "Miao",
			"Ideographic Symbols and Punctuation", "Tangut", "Tangut Components", "Khitan Small Script", "Tangut Supplement", "Kana Extended-B", "Kana Supplement", "Kana Extended-A",
			"Small Kana Extension", "Nushu", "Duployan", "Shorthand Format Controls", "Znamenny Musical Notation", "Byzantine Musical Symbols", "Musical Symbols", "Ancient Greek Musical Notation",
			"Kaktovik Numerals", "Mayan Numerals", "Tai Xuan Jing Symbols", "Counting Rod Numerals", "Mathematical Alphanumeric Symbols", "Sutton SignWriting", "Latin Extended-G", "Glagolitic Supplement",
			"Cyrillic Extended-D", "Nyiakeng Puachue Hmong", "Toto", "Wancho", "Nag Mundari", "Ethiopic Extended-B", "Mende Kikakui", "Adlam",
			"Indic Siyaq Numbers", "Ottoman Siyaq Numbers", "Arabic Mathematical Alphabetic Symbols", "Mahjong Tiles", "Domino Tiles", "Playing Cards", "Enclosed Alphanumeric Supplement", "Enclosed Ideographic Supplement",
			"Miscellaneous Symbols and Pictographs", "Emoticons", "Ornamental Dingbats", "Transport and Map Symbols", "Alchemical Symbols", "Geometric Shapes Extended", "Supplemental Arrows-C", "Supplemental Symbols and Pictographs",
			"Chess Symbols", "Symbols and Pictographs Extended-A", "Symbols for Legacy Computing", "CJK Unified Ideographs Extension B", "CJK Unified Ideographs Extension C", "CJK Unified Ideographs Extension D", "CJK Unified Ideographs Extension E", "CJK Unified Ideographs Extension F", "CJK Unified Ideographs Extension I",
			"CJK Compatibility Ideographs Supplement", "CJK Unified Ideographs Extension G", "CJK Unified Ideographs Extension H", "CJK Unified Ideographs Extension J", "Tags", "Variation Selectors Supplement", "Supplementary Private Use Area-A", "Supplementary Private Use Area-B"
		];

		/* eslint-disable max-len */
		// prettier-ignore
		const unicode_blockaddress_array = [
			0x007F, 0x00FF, 0x017F, 0x024F, 0x02AF, 0x02FF, 0x036F, 0x03FF, 0x04FF, 0x052F, 0x058F, 0x05FF, 0x06FF, 0x074F, 0x077F, 0x07BF,
			0x07FF, 0x083F, 0x085F, 0x086F, 0x089F, 0x08FF, 0x097F, 0x09FF, 0x0A7F, 0x0AFF, 0x0B7F, 0x0BFF, 0x0C7F, 0x0CFF, 0x0D7F, 0x0DFF,
			0x0E7F, 0x0EFF, 0x0FFF, 0x109F, 0x10FF, 0x11FF, 0x137F, 0x139F, 0x13FF, 0x167F, 0x169F, 0x16FF, 0x171F, 0x173F, 0x175F, 0x177F,
			0x17FF, 0x18AF, 0x18FF, 0x194F, 0x197F, 0x19DF, 0x19FF, 0x1A1F, 0x1AAF, 0x1AFF, 0x1B7F, 0x1BBF, 0x1BFF, 0x1C4F, 0x1C7F, 0x1C8F,
			0x1CBF, 0x1CCF, 0x1CFF, 0x1D7F, 0x1DBF, 0x1DFF, 0x1EFF, 0x1FFF, 0x206F, 0x209F, 0x20CF, 0x20FF, 0x214F, 0x218F, 0x21FF, 0x22FF,
			0x23FF, 0x243F, 0x245F, 0x24FF, 0x257F, 0x259F, 0x25FF, 0x26FF, 0x27BF, 0x27EF, 0x27FF, 0x28FF, 0x297F, 0x29FF, 0x2AFF, 0x2BFF,
			0x2C5F, 0x2C7F, 0x2CFF, 0x2D2F, 0x2D7F, 0x2DDF, 0x2DFF, 0x2E7F, 0x2EFF, 0x2FDF, 0x2FFF, 0x303F, 0x309F, 0x30FF, 0x312F, 0x318F,
			0x319F, 0x31BF, 0x31EF, 0x31FF, 0x32FF, 0x33FF, 0x4DBF, 0x4DFF, 0x9FFF, 0xA48F, 0xA4CF, 0xA4FF, 0xA63F, 0xA69F, 0xA6FF, 0xA71F,
			0xA7FF, 0xA82F, 0xA83F, 0xA87F, 0xA8DF, 0xA8FF, 0xA92F, 0xA95F, 0xA97F, 0xA9DF, 0xA9FF, 0xAA5F, 0xAA7F, 0xAADF, 0xAAFF, 0xAB2F,
			0xAB6F, 0xABBF, 0xABFF, 0xD7AF, 0xD7FF, 0xDB7F, 0xDBFF, 0xDFFF, 0xF8FF, 0xFAFF, 0xFB4F, 0xFDFF, 0xFE0F, 0xFE1F, 0xFE2F, 0xFE4F,
			0xFE6F, 0xFEFF, 0xFFEF, 0xFFFF, 0x1007F, 0x100FF, 0x1013F, 0x1018F, 0x101CF, 0x101FF, 0x1029F, 0x102DF, 0x102FF, 0x1032F, 0x1034F, 0x1037F,
			0x1039F, 0x103DF, 0x1044F, 0x1047F, 0x104AF, 0x104FF, 0x1052F, 0x1056F, 0x105BF, 0x1077F, 0x107BF, 0x1083F, 0x1085F, 0x1087F, 0x108AF, 0x108FF,
			0x1091F, 0x1093F, 0x1099F, 0x109FF, 0x10A5F, 0x10A7F, 0x10A9F, 0x10AFF, 0x10B3F, 0x10B5F, 0x10B7F, 0x10BAF, 0x10C4F, 0x10CFF, 0x10D3F, 0x10E7F,
			0x10EBF, 0x10EFF, 0x10F2F, 0x10F6F, 0x10FAF, 0x10FDF, 0x10FFF, 0x1107F, 0x110CF, 0x110FF, 0x1114F, 0x1117F, 0x111DF, 0x111FF, 0x1124F, 0x112AF,
			0x112FF, 0x1137F, 0x1147F, 0x114DF, 0x115FF, 0x1165F, 0x1167F, 0x116CF, 0x1174F, 0x1184F, 0x118FF, 0x1195F, 0x119FF, 0x11A4F, 0x11AAF, 0x11ABF,
			0x11AFF, 0x11B5F, 0x11C6F, 0x11CBF, 0x11D5F, 0x11DAF, 0x11EFF, 0x11F5F, 0x11FBF, 0x11FFF, 0x123FF, 0x1247F, 0x1254F, 0x12FFF, 0x1342F, 0x1345F,
			0x1467F, 0x16A3F, 0x16A6F, 0x16ACF, 0x16AFF, 0x16B8F, 0x16E9F, 0x16F9F, 0x16FFF, 0x187FF, 0x18AFF, 0x18CFF, 0x18D7F, 0x1AFFF, 0x1B0FF, 0x1B12F,
			0x1B16F, 0x1B2FF, 0x1BC9F, 0x1BCAF, 0x1CFCF, 0x1D0FF, 0x1D1FF, 0x1D24F, 0x1D2DF, 0x1D2FF, 0x1D35F, 0x1D37F, 0x1D7FF, 0x1DAAF, 0x1DFFF, 0x1E02F,
			0x1E08F, 0x1E14F, 0x1E2BF, 0x1E2FF, 0x1E4FF, 0x1E7FF, 0x1E8DF, 0x1E95F, 0x1ECBF, 0x1ED4F, 0x1EEFF, 0x1F02F, 0x1F09F, 0x1F0FF, 0x1F1FF, 0x1F2FF,
			0x1F5FF, 0x1F64F, 0x1F67F, 0x1F6FF, 0x1F77F, 0x1F7FF, 0x1F8FF, 0x1F9FF, 0x1FA6F, 0x1FAFF, 0x1FBFF, 0x2A6DF, 0x2B73F, 0x2B81F, 0x2CEAF, 0x2EBEF, 0x2EE5F,
			0x2FA1F, 0x3134F, 0x323AF, 0x3347F, 0xE007F, 0xE01EF, 0xFFFFF, 0x10FFFF
		];
		/* eslint-enable max-len */

		/**
		 * コードポイントからUnicodeのブロック名に変換する
		 * 変換できない場合は "-" を返す
		 * @param {number} codepoint - コードポイント
		 * @returns {string}
		 */
		toBlockNameFromUnicode = function (codepoint) {
			for (let i = 0; i < unicode_blockname_array.length; i++) {
				if (codepoint <= unicode_blockaddress_array[i]) {
					return unicode_blockname_array[i];
				}
			}
			return "-";
		};

		/**
		 * コードポイントから異体字セレクタの判定
		 * @param {number} codepoint - コードポイント
		 * @param {boolean} [annotate = false] - 注釈をつけるか否か
		 * @returns {string|null} 確認結果(異体字セレクタではない場合はNULLを返す)
		 */
		getVariationSelectorsnumberFromCodePoint = function (codepoint, annotate) {
			// prettier-ignore
			if (0x180B <= codepoint && codepoint <= 0x180D) {
				// モンゴル自由字形選択子 U+180B〜U+180D (3個)
				// prettier-ignore
				return "FVS" + (codepoint - 0x180B + 1);
			}
			// prettier-ignore
			if (0xFE00 <= codepoint && codepoint <= 0xFE0F) {
				// SVSで利用される異体字セレクタ U+FE00〜U+FE0F (VS1～VS16) (16個)
				// prettier-ignore
				const n = codepoint - 0xFE00 + 1;
				if (!annotate) { return "VS" + n; }
				// prettier-ignore
				if (codepoint === 0xFE0E) { return "VS15 (text)"; }
				// prettier-ignore
				if (codepoint === 0xFE0F) { return "VS16 (emoji)"; }
				return "VS" + n;
			// prettier-ignore
			} else if (0xE0100 <= codepoint && codepoint <= 0xE01EF) {
				// IVSで利用される異体字セレクタ U+E0100〜U+E01EF (VS17～VS256) (240個)
				// prettier-ignore
				return "VS" + (codepoint - 0xE0100 + 17);
			}
			return null;
		};

		/**
		 * コードポイントからタグ文字の判定
		 * @param {number} codepoint - コードポイント
		 * @returns {string|null} 確認結果(タグ文字ではない場合はNULLを返す)
		 */
		getTagCharacterFromCodePoint = function (codepoint) {
			// TAG characters U+E0020..U+E007F
			// prettier-ignore
			if (0xE0020 <= codepoint && codepoint <= 0xE007F) {
				// CANCEL TAG
				// prettier-ignore
				if (codepoint === 0xE007F) {
					return "CANCEL_TAG";
				}
				// TAG_20..TAG_7E のように返す
				// prettier-ignore
				const ascii = codepoint - 0xE0000; // 0x20..0x7E
				return "TAG_" + ascii.toString(16).toUpperCase().padStart(2, "0");
			}
			return null;
		};
	}

	/**
	 * 上位のサロゲートペアの判定
	 * @param {string} text - 対象テキスト
	 * @param {number} index - インデックス
	 * @returns {boolean} 確認結果
	 */
	static isHighSurrogateAt(text, index) {
		const ch = text.charCodeAt(index);
		// prettier-ignore
		return 0xD800 <= ch && ch <= 0xDBFF;
	}

	/**
	 * 下位のサロゲートペアの判定
	 * @param {string} text - 対象テキスト
	 * @param {number} index - インデックス
	 * @returns {boolean} 確認結果
	 */
	static isLowSurrogateAt(text, index) {
		const ch = text.charCodeAt(index);
		// prettier-ignore
		return 0xDC00 <= ch && ch <= 0xDFFF;
	}

	/**
	 * サロゲートペアの判定
	 * @param {string} text - 対象テキスト
	 * @param {number} index - インデックス
	 * @returns {boolean} 確認結果
	 */
	static isSurrogatePairAt(text, index) {
		const ch = text.charCodeAt(index);
		// prettier-ignore
		return 0xD800 <= ch && ch <= 0xDFFF;
	}

	/**
	 * サロゲートペア対応のコードポイント取得
	 * @param {string} text - 対象テキスト
	 * @param {number} [index = 0] - インデックス
	 * @returns {number} コードポイント
	 */
	static codePointAt(text, index) {
		const index_ = index !== undefined ? index : 0;
		if (Unicode.isHighSurrogateAt(text, index_)) {
			const high = text.charCodeAt(index_);
			const low = text.charCodeAt(index_ + 1);
			// prettier-ignore
			return (((high - 0xD800) << 10) | (low - 0xDC00)) + 0x10000;
		} else {
			return text.charCodeAt(index_);
		}
	}

	/**
	 * インデックスの前にあるコードポイント
	 * @param {string} text - 対象テキスト
	 * @param {number} index - インデックス
	 * @returns {number} コードポイント
	 */
	static codePointBefore(text, index) {
		if (!Unicode.isLowSurrogateAt(text, index - 1)) {
			return text.charCodeAt(index - 1);
		} else {
			return text.codePointAt(index - 2);
		}
	}

	/**
	 * コードポイント換算で文字列数をカウント
	 * @param {string} text - 対象テキスト
	 * @param {number} [beginIndex=0] - 最初のインデックス（省略可）
	 * @param {number} [endIndex] - 最後のインデックス（ここは含めない）（省略可）
	 * @returns {number} 文字数
	 */
	static codePointCount(text, beginIndex, endIndex) {
		if (beginIndex === undefined) {
			beginIndex = 0;
		}
		if (endIndex === undefined) {
			endIndex = text.length;
		}
		let count = 0;
		for (; beginIndex < endIndex; beginIndex++) {
			count++;
			if (Unicode.isSurrogatePairAt(text, beginIndex)) {
				beginIndex++;
			}
		}
		return count;
	}

	/**
	 * コードポイント換算で文字列配列の位置を計算
	 * @param {string} text - 対象テキスト
	 * @param {number} index - オフセット
	 * @param {number} codePointOffset - ずらすコードポイント数
	 * @returns {number} ずらしたインデックス
	 */
	static offsetByCodePoints(text, index, codePointOffset) {
		let count = 0;
		if (codePointOffset === 0) {
			return index;
		}
		if (codePointOffset > 0) {
			for (; index < text.length; index++) {
				count++;
				if (Unicode.isHighSurrogateAt(text, index)) {
					index++;
				}
				if (count === codePointOffset) {
					return index + 1;
				}
			}
		} else {
			codePointOffset = -codePointOffset;
			for (; index >= 0; index--) {
				count++;
				if (Unicode.isLowSurrogateAt(text, index - 1)) {
					index--;
				}
				if (count === codePointOffset) {
					return index - 1;
				}
			}
		}
		throw "error offsetByCodePoints";
	}

	/**
	 * コードポイントの数値データをUTF16の配列に変換
	 * @param {...(number|number[])} codepoint - 変換したいUTF-32の配列、又はコードポイントを並べた可変引数
	 * @returns {number[]} 変換後のテキスト
	 */
	static toUTF16ArrayFromCodePoint() {
		/**
		 * @type {number[]}
		 */
		const utf16_array = [];
		/**
		 * @type {number[]}
		 */
		let codepoint_array = [];
		if (arguments[0].length) {
			codepoint_array = arguments[0];
		} else {
			for (let i = 0; i < arguments.length; i++) {
				codepoint_array[i] = arguments[i];
			}
		}
		for (let i = 0; i < codepoint_array.length; i++) {
			const codepoint = codepoint_array[i];
			if (0x10000 <= codepoint) {
				// prettier-ignore
				const high = ((codepoint - 0x10000) >> 10) + 0xD800;
				// prettier-ignore
				const low = (codepoint & 0x3FF) + 0xDC00;
				utf16_array.push(high);
				utf16_array.push(low);
			} else {
				utf16_array.push(codepoint);
			}
		}
		return utf16_array;
	}

	/**
	 * コードポイントの数値データを文字列に変換
	 * @param {...(number|number[])} codepoint - 変換したいコードポイントの数値配列、又は数値を並べた可変引数
	 * @returns {string} 変換後のテキスト
	 */
	static fromCodePoint(codepoint) {
		/** @type {number[]} */
		let utf16_array;
		if (Array.isArray(codepoint)) {
			utf16_array = Unicode.toUTF16ArrayFromCodePoint(codepoint);
		} else {
			const codepoint_array = [];
			for (let i = 0; i < arguments.length; i++) {
				codepoint_array[i] = arguments[i];
			}
			utf16_array = Unicode.toUTF16ArrayFromCodePoint(codepoint_array);
		}
		const text = [];
		for (let i = 0; i < utf16_array.length; i++) {
			text[text.length] = String.fromCharCode(utf16_array[i]);
		}
		return text.join("");
	}

	/**
	 * 文字列をUTF32(コードポイント)の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF32(コードポイント)のデータが入った配列
	 */
	static toUTF32Array(text) {
		const utf32 = [];
		for (let i = 0; i < text.length; i = Unicode.offsetByCodePoints(text, i, 1)) {
			utf32.push(Unicode.codePointAt(text, i));
		}
		return utf32;
	}

	/**
	 * UTF32の配列から文字列に変換
	 * @param {number[]} utf32 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF32Array(utf32) {
		return Unicode.fromCodePoint(utf32);
	}

	/**
	 * 文字列をUTF16の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF16のデータが入った配列
	 */
	static toUTF16Array(text) {
		const utf16 = [];
		for (let i = 0; i < text.length; i++) {
			utf16[i] = text.charCodeAt(i);
		}
		return utf16;
	}

	/**
	 * UTF16の配列から文字列に変換
	 * @param {number[]} utf16 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF16Array(utf16) {
		const text = [];
		for (let i = 0; i < utf16.length; i++) {
			text[i] = String.fromCharCode(utf16[i]);
		}
		return text.join("");
	}

	/**
	 * 文字列をUTF8の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF8のデータが入った配列
	 */
	static toUTF8Array(text) {
		return Unicode.toUTFBinaryFromCodePoint(Unicode.toUTF32Array(text), "utf-8", false);
	}

	/**
	 * UTF8の配列から文字列に変換
	 * @param {number[]} utf8 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF8Array(utf8) {
		return Unicode.fromCodePoint(Unicode.toCodePointFromUTFBinary(utf8, "utf-8"));
	}

	/**
	 * 指定したテキストを切り出す
	 * - 単位は文字数
	 * @param {string} text - 切り出したいテキスト
	 * @param {number} offset - 切り出し位置
	 * @param {number} size - 切り出す長さ
	 * @returns {string} 切り出したテキスト
	 */
	static cutTextForCodePoint(text, offset, size) {
		const utf32 = Unicode.toUTF32Array(text);
		const cut = [];
		for (let i = 0, point = offset; i < size && point < utf32.length; i++, point++) {
			cut.push(utf32[point]);
		}
		return Unicode.fromUTF32Array(cut);
	}

	/**
	 * UTFのバイナリ配列からバイトオーダーマーク(BOM)を調査する
	 * @param {number[]} utfbinary - 調査するバイナリ配列
	 * @returns {string} 符号化形式(不明時はnull)
	 */
	static getCharsetFromBOM(utfbinary) {
		if (utfbinary.length >= 4) {
			// prettier-ignore
			if (utfbinary[0] === 0x00 && utfbinary[1] === 0x00 && utfbinary[2] === 0xFE && utfbinary[3] === 0xFF) {
				return "UTF-32BE";
			}
			// prettier-ignore
			if (utfbinary[0] === 0xFF && utfbinary[1] === 0xFE && utfbinary[2] === 0x00 && utfbinary[3] === 0x00) {
				return "UTF-32LE";
			}
		}
		if (utfbinary.length >= 3) {
			// prettier-ignore
			if (utfbinary[0] === 0xEF && utfbinary[1] === 0xBB && utfbinary[2] === 0xBF) {
				return "UTF-8";
			}
		}
		if (utfbinary.length >= 2) {
			// prettier-ignore
			if (utfbinary[0] === 0xFE && utfbinary[1] === 0xFF) {
				return "UTF-16BE";
			}
			// prettier-ignore
			if (utfbinary[0] === 0xFF && utfbinary[1] === 0xFE) {
				return "UTF-16LE";
			}
		}
		return null;
	}

	/**
	 * UTFのバイナリ配列からコードポイントに変換
	 * @param {number[]} binary - 変換したいバイナリ配列
	 * @param {string} [charset] - UTFの種類（省略した場合はBOM付きを期待する）
	 * @returns {number[]} コードポイントの配列(失敗時はnull)
	 */
	static toCodePointFromUTFBinary(binary, charset) {
		const utf32_array = [];
		let check_charset = charset;
		let offset = 0;
		// バイトオーダーマーク(BOM)がある場合は BOM を優先
		const charset_for_bom = Unicode.getCharsetFromBOM(binary);
		if (charset_for_bom) {
			check_charset = charset_for_bom;
			if (/utf-?8/i.test(charset_for_bom)) {
				offset = 3;
			} else if (/utf-?16/i.test(charset_for_bom)) {
				offset = 2;
			} else if (/utf-?32/i.test(charset_for_bom)) {
				offset = 4;
			}
		}
		// BOM付きではない＋指定もしていないので変換失敗
		if (!charset_for_bom && !charset) {
			return null;
		}
		if (/utf-?8n?/i.test(check_charset)) {
			// UTF-8
			let size = 0;
			let write = 0;
			for (let i = offset; i < binary.length; i++) {
				const bin = binary[i];
				if (size === 0) {
					if (bin < 0x80) {
						utf32_array.push(bin);
						// prettier-ignore
					} else if (bin < 0xE0) {
						size = 1;
						// prettier-ignore
						write = bin & 0x1F; // 0001 1111
						// prettier-ignore
					} else if (bin < 0xF0) {
						size = 2;
						// prettier-ignore
						write = bin & 0xF; // 0000 1111
					} else {
						size = 3;
						// prettier-ignore
						write = bin & 0x7; // 0000 0111
					}
				} else {
					write <<= 6;
					// prettier-ignore
					write |= bin & 0x3F; // 0011 1111
					size--;
					if (size === 0) {
						utf32_array.push(write);
					}
				}
			}
			return utf32_array;
		} else if (/utf-?16/i.test(check_charset)) {
			// UTF-16
			// UTF-16 につめる
			const utf16 = [];
			if (/utf-?16(be)/i.test(check_charset)) {
				// UTF-16BE
				for (let i = offset; i < binary.length; i += 2) {
					utf16.push((binary[i] << 8) | binary[i + 1]);
				}
			} else if (/utf-?16(le)?/i.test(check_charset)) {
				// UTF-16LE
				for (let i = offset; i < binary.length; i += 2) {
					utf16.push(binary[i] | (binary[i + 1] << 8));
				}
			}
			// UTF-32 につめる
			for (let i = 0; i < utf16.length; i++) {
				// prettier-ignore
				if (0xD800 <= utf16[i] && utf16[i] <= 0xDBFF) {
					if (i + 2 <= utf16.length) {
						const high = utf16[i];
						const low = utf16[i + 1];
						// prettier-ignore
						utf32_array.push((((high - 0xD800) << 10) | (low - 0xDC00)) + 0x10000);
					}
					i++;
				} else {
					utf32_array.push(utf16[i]);
				}
			}
			return utf32_array;
		} else {
			// UTF-32
			if (/utf-?32(be)/i.test(check_charset)) {
				// UTF-32BE
				for (let i = offset; i < binary.length; i += 4) {
					utf32_array.push((binary[i] << 24) | (binary[i + 1] << 16) | (binary[i + 2] << 8) | binary[i + 3]);
				}
				return utf32_array;
			} else if (/utf-?32(le)?/i.test(check_charset)) {
				// UTF-32LE
				for (let i = offset; i < binary.length; i += 4) {
					utf32_array.push(binary[i] | (binary[i + 1] << 8) | (binary[i + 2] << 16) | (binary[i + 3] << 24));
				}
				return utf32_array;
			}
		}
		return null;
	}

	/**
	 * UTF32配列からバイナリ配列に変換
	 * @param {number[]} utf32_array - 変換したいUTF-32配列
	 * @param {string} charset - UTFの種類
	 * @param {boolean} [is_with_bom=true] - BOMをつけるかどうか
	 * @returns {number[]} バイナリ配列(失敗時はnull)
	 */
	static toUTFBinaryFromCodePoint(utf32_array, charset, is_with_bom) {
		let is_with_bom_ = is_with_bom !== undefined ? is_with_bom : true;
		// charset に" with BOM" が入っている場合はBOM付きとする
		if (/\s+with\s+bom$/i.test(charset)) {
			is_with_bom_ = true;
		}
		/**
		 * @type {number[]}
		 */
		const binary = [];
		// UTF-8
		if (/utf-?8n?/i.test(charset)) {
			// bom をつける
			if (is_with_bom_) {
				// prettier-ignore
				binary.push(0xEF);
				// prettier-ignore
				binary.push(0xBB);
				// prettier-ignore
				binary.push(0xBF);
			}
			for (let i = 0; i < utf32_array.length; i++) {
				let codepoint = utf32_array[i];
				// 1バイト文字
				if (codepoint <= 0x7F) {
					binary.push(codepoint);
					continue;
				}
				const buffer = [];
				/** @type {number} */
				let size;
				// 2バイト以上
				if (codepoint < 0x800) {
					size = 2;
				} else if (codepoint < 0x10000) {
					size = 3;
				} else {
					size = 4;
				}
				for (let j = 0; j < size; j++) {
					let write = codepoint & ((1 << 6) - 1);
					if (j === size - 1) {
						if (size === 2) {
							// prettier-ignore
							write |= 0xC0; // 1100 0000
						} else if (size === 3) {
							// prettier-ignore
							write |= 0xE0; // 1110 0000
						} else {
							// prettier-ignore
							write |= 0xF0; // 1111 0000
						}
						buffer.push(write);
						break;
					}
					buffer.push(write | 0x80); // 1000 0000
					codepoint = codepoint >> 6;
				}
				// 反転
				for (let j = buffer.length - 1; j >= 0; j--) {
					binary.push(buffer[j]);
				}
			}
			return binary;
		} else if (/utf-?16/i.test(charset)) {
			// UTF-16
			// UTF-16 に詰め替える
			const utf16_array = Unicode.toUTF16ArrayFromCodePoint(utf32_array);
			if (/utf-?16(be)/i.test(charset)) {
				// UTF-16BE
				// bom をつける
				if (is_with_bom_) {
					binary.push(0xFE);
					binary.push(0xFF);
				}
				for (let i = 0; i < utf16_array.length; i++) {
					binary.push(utf16_array[i] >> 8);
					binary.push(utf16_array[i] & 0xFF);
				}
			} else if (/utf-?16(le)?/i.test(charset)) {
				// UTF-16LE
				// bom をつける
				if (is_with_bom_) {
					binary.push(0xFF);
					binary.push(0xFE);
				}
				for (let i = 0; i < utf16_array.length; i++) {
					binary.push(utf16_array[i] & 0xFF);
					binary.push(utf16_array[i] >> 8);
				}
			}
			return binary;
		} else if (/utf-?32/i.test(charset)) {
			// UTF-32
			if (/utf-?32(be)/i.test(charset)) {
				// UTF-32BE
				// bom をつける
				if (is_with_bom_) {
					binary.push(0x00);
					binary.push(0x00);
					binary.push(0xFE);
					binary.push(0xFF);
				}
				for (let i = 0; i < utf32_array.length; i++) {
					binary.push((utf32_array[i] >> 24) & 0xFF);
					binary.push((utf32_array[i] >> 16) & 0xFF);
					binary.push((utf32_array[i] >> 8) & 0xFF);
					binary.push(utf32_array[i] & 0xFF);
				}
			} else if (/utf-?32(le)?/i.test(charset)) {
				// UTF-32LE
				// bom をつける
				if (is_with_bom_) {
					binary.push(0xFF);
					binary.push(0xFE);
					binary.push(0x00);
					binary.push(0x00);
				}
				for (let i = 0; i < utf32_array.length; i++) {
					binary.push(utf32_array[i] & 0xFF);
					binary.push((utf32_array[i] >> 8) & 0xFF);
					binary.push((utf32_array[i] >> 16) & 0xFF);
					binary.push((utf32_array[i] >> 24) & 0xFF);
				}
			}
			return binary;
		}
		return null;
	}

	/**
	 * コードポイントからUnicodeのブロック名に変換する
	 * 変換できない場合は "-" を返す
	 * @param {number} codepoint - コードポイント
	 * @returns {string}
	 */
	static toBlockNameFromUnicode(codepoint) {
		Unicode.init();
		return toBlockNameFromUnicode(codepoint);
	}

	/**
	 * コードポイントから制御文字名に変換する
	 * 変換できない場合は null を返す
	 * @param {number} codepoint - コードポイント
	 * @returns {string|null}
	 */
	static toControlCharcterName(codepoint) {
		Unicode.init();

		// 異体字セレクタの確認を行い、異体字セレクタ用の制御文字(FVS, VSx)を返す
		const info_variation_selectors_number = getVariationSelectorsnumberFromCodePoint(codepoint);
		if (info_variation_selectors_number !== null) {
			return info_variation_selectors_number;
		}
		// タグ文字の確認を行い、タグ文字用の制御文字(TAG_xx)を返す
		const info_tag_character = getTagCharacterFromCodePoint(codepoint);
		if (info_tag_character !== null) {
			return info_tag_character;
		}
		// その他の制御文字の確認を行う
		const name = control_charcter_map[codepoint];
		return name ? name : null;
	}

	/**
	 * コードポイントからグラフェム（見た目の1文字）を構成する文字の判定
	 *
	 * ※単独では新しいグラフェムを開始せず、直前のベース文字に結合・修飾される要素
	 *
	 * 含まれるもの:
	 * - 結合文字 (Mn / Mc / Me ※VS除外)
	 * - 異体字セレクタ (VS / IVS / FVS)
	 * - スキントーン修飾子（EMOJI MODIFIER FITZPATRICK）
	 * - タグ文字（TAG CHARACTER）
	 * - ゼロ幅接合子
	 *
	 * 含まれないもの
	 * - 国旗（Regional Indicator）※ペア規則
	 *
	 * @param {number} codepoint - コードポイント
	 * @returns {boolean} 確認結果
	 */
	static isGraphemeComponentFromCodePoint(codepoint) {
		// prettier-ignore
		return (
			Unicode.isCombiningMarkFromCodePoint(codepoint) // 結合文字
			|| Unicode.isVariationSelectorFromCodePoint(codepoint) // 異体字セレクタ
			|| Unicode.isEmojiModifierFromCodePoint(codepoint) // スキントーン修飾子
			|| Unicode.isTagCharacterFromCodePoint(codepoint) // タグ文字
			|| codepoint === 0x200D // ZWJ (ZERO WIDTH JOINER) ゼロ幅接合子
		);
	}

	/**
	 * コードポイントから国旗（Regional Indicator）を構成する文字の判定
	 *
	 * @param {number} codepoint - コードポイント
	 * @returns {boolean} 確認結果
	 */
	static isRegionalIndicatorFromCodePoint(codepoint) {
		// prettier-ignore
		return (0x1F1E6 <= codepoint && codepoint <= 0x1F1FF);
	}

	/**
	 * 2つのコードポイントが結合する場合の判定処理
	 *
	 * 含まれるもの:
	 * - 国旗（Regional Indicator）
	 *
	 * @param {number|null} codepoint1 - 直前のコードポイント
	 * @param {number|null} codepoint2 - 現在のコードポイント
	 * @returns {boolean} 確認結果
	 */
	static isRegionalIndicatorContinuation(codepoint1, codepoint2) {
		if ((codepoint1 == null || codepoint1 === undefined) || codepoint2 == null || codepoint2 === undefined) {
			return false;
		}
		return Unicode.isRegionalIndicatorFromCodePoint(codepoint1)
			&& Unicode.isRegionalIndicatorFromCodePoint(codepoint2);
	}

	/**
	 * コードポイントから「表示上の横幅が 0 の文字」の文字の判定
	 *
	 * 含まれるもの:
	 * - ゼロ幅スペース, ゼロ幅非接合子, ゼロ幅接合子, 単語結合子
	 * @param {number} codepoint - コードポイント
	 * @returns {boolean} 確認結果
	 */
	static isZeroWidthCharacterFromCodePoint(codepoint) {
		// prettier-ignore
		return (
			codepoint === 0x200B // ZWSP (ZERO WIDTH SPACE) ゼロ幅スペース
			|| codepoint === 0x200C // ZWNJ (ZERO WIDTH NON-JOINER) ゼロ幅非接合子
			|| codepoint === 0x200D // ZWJ (ZERO WIDTH JOINER) ゼロ幅接合子
			|| codepoint === 0x2060 // WJ (WORD JOINER) 単語結合子
		);
	}

	/**
	 * コードポイントから結合文字の判定
	 * @param {number} codepoint - コードポイント
	 * @returns {boolean} 確認結果
	 */
	static isCombiningMarkFromCodePoint(codepoint) {
		// 異体字セレクタは除外
		if (Unicode.isVariationSelectorFromCodePoint(codepoint)) {
			return false;
		}
		try {
			return new RegExp("\\p{Mark}", "u").test(String.fromCodePoint(codepoint));
		// eslint-disable-next-line no-unused-vars
		} catch (e) {
			// フォールバック処理
			return (
				// Combining Diacritical Marks
				// prettier-ignore
				(0x0300 <= codepoint && codepoint <= 0x036F)
				// Combining Diacritical Marks Extended
				// prettier-ignore
				|| (0x1AB0 <= codepoint && codepoint <= 0x1AFF)
				// Combining Diacritical Marks Supplement
				// prettier-ignore
				|| (0x1DC0 <= codepoint && codepoint <= 0x1DFF)
				// Combining Diacritical Marks for Symbols
				// prettier-ignore
				|| (0x20D0 <= codepoint && codepoint <= 0x20FF)
				// 日本語に含まれる2種類の文字
				// COMBINING VOICED SOUND MARK
				// COMBINING SEMI-VOICED SOUND MARK
				// prettier-ignore
				|| (0x3099 <= codepoint && codepoint <= 0x309A)
				// Combining Half Marks
				// prettier-ignore
				|| (0xFE20 <= codepoint && codepoint <= 0xFE2F)
			);
		}
	}

	/**
	 * コードポイントから異体字セレクタの判定
	 * @param {number} codepoint - コードポイント
	 * @returns {boolean} 確認結果
	 */
	static isVariationSelectorFromCodePoint(codepoint) {
		return (
			// モンゴル自由字形選択子 U+180B〜U+180D (3個)
			// prettier-ignore
			(0x180B <= codepoint && codepoint <= 0x180D)
			// SVSで利用される異体字セレクタ U+FE00〜U+FE0F (VS1～VS16) (16個)
			// prettier-ignore
			|| (0xFE00 <= codepoint && codepoint <= 0xFE0F)
			// IVSで利用される異体字セレクタ U+E0100〜U+E01EF (VS17～VS256) (240個)
			// prettier-ignore
			|| (0xE0100 <= codepoint && codepoint <= 0xE01EF)
		);
	}

	/**
	 * コードポイントからスキントーン修飾子の判定
	 * @param {number} codepoint - コードポイント
	 * @returns {boolean} 確認結果
	 */
	static isEmojiModifierFromCodePoint(codepoint) {
		return (
			// EMOJI MODIFIER FITZPATRICK
			// prettier-ignore
			0x1F3FB <= codepoint && codepoint <= 0x1F3FF
		);
	}

	/**
	 * コードポイントからタグ文字の判定
	 * @param {number} codepoint - コードポイント
	 * @returns {boolean} 確認結果
	 */
	static isTagCharacterFromCodePoint(codepoint) {
		return (
			// TAG CHARACTER
			// prettier-ignore
			0xE0000 <= codepoint && codepoint <= 0xE007F
		);
	}
}

/**
 * マップを初期化した否か
 */
Unicode.is_initmap = false;

/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */


/**
 * 面区点情報
 * @typedef {Object} MenKuTen
 * @property {string} [text] 面-区-点
 * @property {number} [men=1] 面
 * @property {number} ku 区
 * @property {number} ten 点
 */

/**
 * Shift_JIS を扱うクラス
 * @ignore
 */
class SJIS {
	/**
	 * 文字列を Shift_JIS の配列に変換。変換できない文字は "?" に変換される。
	 * @param {string} text - 変換したいテキスト
	 * @param {Record<number, number>} unicode_to_sjis - Unicode から Shift_JIS への変換マップ
	 * @returns {number[]} Shift_JIS のデータが入った配列
	 * @ignore
	 */
	static toSJISArray(text, unicode_to_sjis) {
		const map = unicode_to_sjis;
		const utf32 = Unicode.toUTF32Array(text);
		const sjis = [];
		const ng = "?".charCodeAt(0);
		for (let i = 0; i < utf32.length; i++) {
			const map_bin = map[utf32[i]];
			if (map_bin) {
				sjis.push(map_bin);
			} else {
				sjis.push(ng);
			}
		}
		return sjis;
	}

	/**
	 * 文字列を Shift_JIS のバイナリ配列に変換。変換できない文字は "?" に変換される。
	 * - 日本語文字は2バイトとして、配列も2つ分、使用します。
	 * @param {string} text - 変換したいテキスト
	 * @param {Record<number, number>} unicode_to_sjis - Unicode から Shift_JIS への変換マップ
	 * @returns {number[]} Shift_JIS のデータが入ったバイナリ配列
	 * @ignore
	 */
	static toSJISBinary(text, unicode_to_sjis) {
		const sjis = SJIS.toSJISArray(text, unicode_to_sjis);
		const sjisbin = [];
		for (let i = 0; i < sjis.length; i++) {
			if (sjis[i] < 0x100) {
				sjisbin.push(sjis[i]);
			} else {
				sjisbin.push(sjis[i] >> 8);
				sjisbin.push(sjis[i] & 0xFF);
			}
		}
		return sjisbin;
	}

	/**
	 * SJISの配列から文字列に変換
	 * @param {number[]} sjis - 変換したいテキスト
	 * @param {Record<number, number|number[]>} sjis_to_unicode - Shift_JIS から Unicode への変換マップ
	 * @returns {string} 変換後のテキスト
	 * @ignore
	 */
	static fromSJISArray(sjis, sjis_to_unicode) {
		const map = sjis_to_unicode;
		const utf16 = [];
		const ng = "?".charCodeAt(0);
		for (let i = 0; i < sjis.length; i++) {
			let x = sjis[i];
			/**
			 * @type {number|number[]}
			 */
			let y;
			if (x >= 0x100) {
				// すでに1つの変数にまとめられている
				y = map[x];
			} else {
				// 2バイト文字かのチェック
				// prettier-ignore
				if ((0x81 <= x && x <= 0x9F) || (0xE0 <= x && x <= 0xFC)) {
					x <<= 8;
					i++;
					x |= sjis[i];
					y = map[x];
				} else {
					y = map[x];
				}
			}
			if (y) {
				// 配列なら配列を結合
				// ※ Unicodeの結合文字の可能性があるため
				if (Array.isArray(y)) {
					for (let j = 0; j < y.length; j++) {
						utf16.push(y[j]);
					}
				} else {
				// 値しかない場合は値を結合
					utf16.push(y);
				}
			} else {
				utf16.push(ng);
			}
		}
		return Unicode.fromUTF32Array(utf16);
	}

	/**
	 * 指定したコードポイントの文字から Shift_JIS 上の符号化数値に変換
	 * @param {number} unicode_codepoint - Unicodeのコードポイント
	 * @param {Record<number, number>} unicode_to_sjis - Unicode から Shift_JIS への変換マップ
	 * @returns {number} 符号化数値(変換できない場合はnullとなる)
	 * @ignore
	 */
	static toSJISCodeFromUnicode(unicode_codepoint, unicode_to_sjis) {
		if (!unicode_to_sjis[unicode_codepoint]) {
			return null;
		}
		const utf16_text = Unicode.fromUTF32Array([unicode_codepoint]);
		const sjis_array = SJIS.toSJISArray(utf16_text, unicode_to_sjis);
		return sjis_array[0];
	}

	/**
	 * 指定した Shift_JIS のコードから区点番号に変換
	 * @param {number} sjis_code - Shift_JIS のコードポイント
	 * @returns {MenKuTen} 区点番号(存在しない場合（1バイトのJISコードなど）はnullを返す)
	 */
	static toKuTenFromSJISCode(sjis_code) {
		if (!sjis_code) {
			return null;
		}
		const x = sjis_code;
		if (x < 0x100) {
			return null;
		}
		// アルゴリズムは区点番号表からリバースエンジニアリング

		let s1 = x >> 8;
		let s2 = x & 0xFF;

		/** @type {number} */
		let ku;

		// 区の計算方法の切り替え
		// 63区から、0x9F→0xE0に飛ぶ
		// prettier-ignore
		if (s1 < 0xE0) {
			s1 = s1 - 0x81;
		} else {
			s1 = s1 - 0xC1;
		}

		// 区情報の位置判定
		// prettier-ignore
		if (s2 < 0x9F) {
			ku = s1 * 2 + 1;
			// 点情報の計算方法の切り替え
			// 0x7Fが欠番のため「+1」を除去
			// prettier-ignore
			if (s2 < 0x80) {
				// prettier-ignore
				s2 = s2 - 0x40 + 1;
			} else {
				// prettier-ignore
				s2 = s2 - 0x40;
			}
		} else {
			ku = s1 * 2 + 2;
			// prettier-ignore
			s2 = s2 - 0x9F + 1;
		}

		// 点情報の位置判定
		const ten = s2;

		return {
			text: ku + "-" + ten,
			men: 1,
			ku: ku,
			ten: ten
		};
	}

	/**
	 * 指定した面区点番号から Shift_JIS の仕様上、正規な物か判定
	 * @param {MenKuTen|string} menkuten - 面区点番号（面が省略された場合は、1とみなす）
	 * @returns {boolean} 正規なデータは true, 不正なデータは false
	 */
	static isRegularMenKuten(menkuten) {
		let m, k, t;

		// 引数のテスト
		if (menkuten instanceof Object) {
			m = menkuten.men ? menkuten.men : 1;
			k = menkuten.ku;
			t = menkuten.ten;
		} else if (typeof menkuten === "string") {
			const strmkt = menkuten.split("-");
			if (strmkt.length === 3) {
				m = parseInt(strmkt[0], 10);
				k = parseInt(strmkt[1], 10);
				t = parseInt(strmkt[2], 10);
			} else if (strmkt.length === 2) {
				m = 1;
				k = parseInt(strmkt[0], 10);
				t = parseInt(strmkt[1], 10);
			} else {
				return false;
			}
		} else {
			return false;
		}

		/**
		 * @type {Record<number, number>}
		 */
		const kmap = { 1: 1, 3: 1, 4: 1, 5: 1, 8: 1, 12: 1, 13: 1, 14: 1, 15: 1 };
		if (m === 1) {
			// 1面は1-94区まで存在
			if (!(1 <= k && k <= 94)) {
				return false;
			}
		} else if (m === 2) {
			// 2面は、1,3,4,5,8,12,13,14,15,78-94区まで存在
			if (!(kmap[k] || (78 <= k && k <= 94))) {
				return false;
			}
		} else {
			// 面が不正
			return false;
		}
		// 点は1-94点まで存在
		if (!(1 <= t && t <= 94)) {
			return false;
		}
		return true;
	}
}

/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */


/**
 * CP932, Windows-31J の変換マップ作成用クラス
 * @ignore
 */
class CP932MAP {
	/**
	 * 変換マップを初期化
	 */
	static init() {
		if (CP932MAP.is_initmap) {
			return;
		}
		CP932MAP.is_initmap = true;

		/**
		 * @returns {Record<number, number>}
		 */
		const getCp932ToUnicodeMap = function () {
			/* eslint-disable max-len */
			/* eslint-disable object-property-newline */
			/**
			 * 1バイトの変換マップ
			 *
			 *
			 * 参考：WideCharToMultiByte
			 * メモ：今回は使っていないが、以下の文献も参考になるかもしれません。
			 * ftp://www.unicode.org/Public/MAPPINGS/OBSOLETE/EASTASIA/JIS/JIS0208.TXT
			 * @type {Record<number, number>}
			 */
			// prettier-ignore
			const cp932_to_unicode_map = {
				0x01: 0x01, 0x02: 0x02, 0x03: 0x03, 0x04: 0x04, 0x05: 0x05, 0x06: 0x06, 0x07: 0x07, 0x08: 0x08,
				0x09: 0x09, 0x0A: 0x0A, 0x0B: 0x0B, 0x0C: 0x0C, 0x0D: 0x0D, 0x0E: 0x0E, 0x0F: 0x0F, 0x10: 0x10,
				0x11: 0x11, 0x12: 0x12, 0x13: 0x13, 0x14: 0x14, 0x15: 0x15, 0x16: 0x16, 0x17: 0x17, 0x18: 0x18,
				0x19: 0x19, 0x1A: 0x1A, 0x1B: 0x1B, 0x1C: 0x1C, 0x1D: 0x1D, 0x1E: 0x1E, 0x1F: 0x1F, 0x20: 0x20,
				0x21: 0x21, 0x22: 0x22, 0x23: 0x23, 0x24: 0x24, 0x25: 0x25, 0x26: 0x26, 0x27: 0x27, 0x28: 0x28,
				0x29: 0x29, 0x2A: 0x2A, 0x2B: 0x2B, 0x2C: 0x2C, 0x2D: 0x2D, 0x2E: 0x2E, 0x2F: 0x2F, 0x30: 0x30,
				0x31: 0x31, 0x32: 0x32, 0x33: 0x33, 0x34: 0x34, 0x35: 0x35, 0x36: 0x36, 0x37: 0x37, 0x38: 0x38,
				0x39: 0x39, 0x3A: 0x3A, 0x3B: 0x3B, 0x3C: 0x3C, 0x3D: 0x3D, 0x3E: 0x3E, 0x3F: 0x3F, 0x40: 0x40,
				0x41: 0x41, 0x42: 0x42, 0x43: 0x43, 0x44: 0x44, 0x45: 0x45, 0x46: 0x46, 0x47: 0x47, 0x48: 0x48,
				0x49: 0x49, 0x4A: 0x4A, 0x4B: 0x4B, 0x4C: 0x4C, 0x4D: 0x4D, 0x4E: 0x4E, 0x4F: 0x4F, 0x50: 0x50,
				0x51: 0x51, 0x52: 0x52, 0x53: 0x53, 0x54: 0x54, 0x55: 0x55, 0x56: 0x56, 0x57: 0x57, 0x58: 0x58,
				0x59: 0x59, 0x5A: 0x5A, 0x5B: 0x5B, 0x5C: 0x5C, 0x5D: 0x5D, 0x5E: 0x5E, 0x5F: 0x5F, 0x60: 0x60,
				0x61: 0x61, 0x62: 0x62, 0x63: 0x63, 0x64: 0x64, 0x65: 0x65, 0x66: 0x66, 0x67: 0x67, 0x68: 0x68,
				0x69: 0x69, 0x6A: 0x6A, 0x6B: 0x6B, 0x6C: 0x6C, 0x6D: 0x6D, 0x6E: 0x6E, 0x6F: 0x6F, 0x70: 0x70,
				0x71: 0x71, 0x72: 0x72, 0x73: 0x73, 0x74: 0x74, 0x75: 0x75, 0x76: 0x76, 0x77: 0x77, 0x78: 0x78,
				0x79: 0x79, 0x7A: 0x7A, 0x7B: 0x7B, 0x7C: 0x7C, 0x7D: 0x7D, 0x7E: 0x7E, 0x7F: 0x7F, 0x80: 0x80,
				0xA0: 0xF8F0, 0xA1: 0xFF61, 0xA2: 0xFF62, 0xA3: 0xFF63, 0xA4: 0xFF64, 0xA5: 0xFF65, 0xA6: 0xFF66, 0xA7: 0xFF67,
				0xA8: 0xFF68, 0xA9: 0xFF69, 0xAA: 0xFF6A, 0xAB: 0xFF6B, 0xAC: 0xFF6C, 0xAD: 0xFF6D, 0xAE: 0xFF6E, 0xAF: 0xFF6F,
				0xB0: 0xFF70, 0xB1: 0xFF71, 0xB2: 0xFF72, 0xB3: 0xFF73, 0xB4: 0xFF74, 0xB5: 0xFF75, 0xB6: 0xFF76, 0xB7: 0xFF77,
				0xB8: 0xFF78, 0xB9: 0xFF79, 0xBA: 0xFF7A, 0xBB: 0xFF7B, 0xBC: 0xFF7C, 0xBD: 0xFF7D, 0xBE: 0xFF7E, 0xBF: 0xFF7F,
				0xC0: 0xFF80, 0xC1: 0xFF81, 0xC2: 0xFF82, 0xC3: 0xFF83, 0xC4: 0xFF84, 0xC5: 0xFF85, 0xC6: 0xFF86, 0xC7: 0xFF87,
				0xC8: 0xFF88, 0xC9: 0xFF89, 0xCA: 0xFF8A, 0xCB: 0xFF8B, 0xCC: 0xFF8C, 0xCD: 0xFF8D, 0xCE: 0xFF8E, 0xCF: 0xFF8F,
				0xD0: 0xFF90, 0xD1: 0xFF91, 0xD2: 0xFF92, 0xD3: 0xFF93, 0xD4: 0xFF94, 0xD5: 0xFF95, 0xD6: 0xFF96, 0xD7: 0xFF97,
				0xD8: 0xFF98, 0xD9: 0xFF99, 0xDA: 0xFF9A, 0xDB: 0xFF9B, 0xDC: 0xFF9C, 0xDD: 0xFF9D, 0xDE: 0xFF9E, 0xDF: 0xFF9F,
				0xFD: 0xF8F1, 0xFE: 0xF8F2, 0xFF: 0xF8F3
			};
			/* eslint-enable object-property-newline */
			/* eslint-enable max-len */

			/**
			 * 2バイト文字（0x8140-0xffff）の変換マップ作成用の文字列
			 * @type {string}
			 */
			// prettier-ignore
			const map = [
				"　、。，．・：；？！゛゜´｀¨＾￣＿ヽヾゝゞ〃仝々〆〇ー―‐／＼～∥｜…‥‘’“”（）〔〕［］｛｝〈〉《》「」『』【】＋－±×1÷＝≠＜＞≦≧∞∴♂♀°′″℃￥＄￠￡％＃＆＊＠§☆★○●◎◇◆□■△▲▽▼※〒→←↑↓〓11∈∋⊆⊇⊂⊃∪∩8∧∨￢⇒⇔∀∃11∠⊥⌒∂∇≡≒≪≫√∽∝∵∫∬7Å‰♯♭♪†‡¶4◯82",
				"０１２３４５６７８９7ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ7ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ4ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをん78",
				"ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミ1ムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ8ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ8αβγδεζηθικλμνξοπρστυφχψω105АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ15абвгдеёжзийклмн1опрстуфхцчшщъыьэюя13─│┌┐┘└├┬┤┴┼━┃┏┓┛┗┣┳┫┻╋┠┯┨┷┿┝┰┥┸╂641",
				"①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ1㍉㌔㌢㍍㌘㌧㌃㌶㍑㍗㌍㌦㌣㌫㍊㌻㎜㎝㎞㎎㎏㏄㎡8㍻1〝〟№㏍℡㊤㊥㊦㊧㊨㈱㈲㈹㍾㍽㍼≒≡∫∮∑√⊥∠∟⊿∵∩∪258",
				"亜唖娃阿哀愛挨姶逢葵茜穐悪握渥旭葦芦鯵梓圧斡扱宛姐虻飴絢綾鮎或粟袷安庵按暗案闇鞍杏以伊位依偉囲夷委威尉惟意慰易椅為畏異移維緯胃萎衣謂違遺医井亥域育郁磯一壱溢逸稲茨芋鰯允印咽員因姻引飲淫胤蔭67",
				"院陰隠韻吋右宇烏羽迂雨卯鵜窺丑碓臼渦嘘唄欝蔚鰻姥厩浦瓜閏噂云運雲荏餌叡営嬰影映曳栄永泳洩瑛盈穎頴英衛詠鋭液疫益駅悦謁越閲榎厭円1園堰奄宴延怨掩援沿演炎焔煙燕猿縁艶苑薗遠鉛鴛塩於汚甥凹央奥往応押旺横欧殴王翁襖鴬鴎黄岡沖荻億屋憶臆桶牡乙俺卸恩温穏音下化仮何伽価佳加可嘉夏嫁家寡科暇果架歌河火珂禍禾稼箇花苛茄荷華菓蝦課嘩貨迦過霞蚊俄峨我牙画臥芽蛾賀雅餓駕介会解回塊壊廻快怪悔恢懐戒拐改67",
				"魁晦械海灰界皆絵芥蟹開階貝凱劾外咳害崖慨概涯碍蓋街該鎧骸浬馨蛙垣柿蛎鈎劃嚇各廓拡撹格核殻獲確穫覚角赫較郭閣隔革学岳楽額顎掛笠樫1橿梶鰍潟割喝恰括活渇滑葛褐轄且鰹叶椛樺鞄株兜竃蒲釜鎌噛鴨栢茅萱粥刈苅瓦乾侃冠寒刊勘勧巻喚堪姦完官寛干幹患感慣憾換敢柑桓棺款歓汗漢澗潅環甘監看竿管簡緩缶翰肝艦莞観諌貫還鑑間閑関陥韓館舘丸含岸巌玩癌眼岩翫贋雁頑顔願企伎危喜器基奇嬉寄岐希幾忌揮机旗既期棋棄67",
				"機帰毅気汽畿祈季稀紀徽規記貴起軌輝飢騎鬼亀偽儀妓宜戯技擬欺犠疑祇義蟻誼議掬菊鞠吉吃喫桔橘詰砧杵黍却客脚虐逆丘久仇休及吸宮弓急救1朽求汲泣灸球究窮笈級糾給旧牛去居巨拒拠挙渠虚許距鋸漁禦魚亨享京供侠僑兇競共凶協匡卿叫喬境峡強彊怯恐恭挟教橋況狂狭矯胸脅興蕎郷鏡響饗驚仰凝尭暁業局曲極玉桐粁僅勤均巾錦斤欣欽琴禁禽筋緊芹菌衿襟謹近金吟銀九倶句区狗玖矩苦躯駆駈駒具愚虞喰空偶寓遇隅串櫛釧屑屈67",
				"掘窟沓靴轡窪熊隈粂栗繰桑鍬勲君薫訓群軍郡卦袈祁係傾刑兄啓圭珪型契形径恵慶慧憩掲携敬景桂渓畦稽系経継繋罫茎荊蛍計詣警軽頚鶏芸迎鯨1劇戟撃激隙桁傑欠決潔穴結血訣月件倹倦健兼券剣喧圏堅嫌建憲懸拳捲検権牽犬献研硯絹県肩見謙賢軒遣鍵険顕験鹸元原厳幻弦減源玄現絃舷言諺限乎個古呼固姑孤己庫弧戸故枯湖狐糊袴股胡菰虎誇跨鈷雇顧鼓五互伍午呉吾娯後御悟梧檎瑚碁語誤護醐乞鯉交佼侯候倖光公功効勾厚口向67",
				"后喉坑垢好孔孝宏工巧巷幸広庚康弘恒慌抗拘控攻昂晃更杭校梗構江洪浩港溝甲皇硬稿糠紅紘絞綱耕考肯肱腔膏航荒行衡講貢購郊酵鉱砿鋼閤降1項香高鴻剛劫号合壕拷濠豪轟麹克刻告国穀酷鵠黒獄漉腰甑忽惚骨狛込此頃今困坤墾婚恨懇昏昆根梱混痕紺艮魂些佐叉唆嵯左差査沙瑳砂詐鎖裟坐座挫債催再最哉塞妻宰彩才採栽歳済災采犀砕砦祭斎細菜裁載際剤在材罪財冴坂阪堺榊肴咲崎埼碕鷺作削咋搾昨朔柵窄策索錯桜鮭笹匙冊刷67",
				"察拶撮擦札殺薩雑皐鯖捌錆鮫皿晒三傘参山惨撒散桟燦珊産算纂蚕讃賛酸餐斬暫残仕仔伺使刺司史嗣四士始姉姿子屍市師志思指支孜斯施旨枝止1死氏獅祉私糸紙紫肢脂至視詞詩試誌諮資賜雌飼歯事似侍児字寺慈持時次滋治爾璽痔磁示而耳自蒔辞汐鹿式識鴫竺軸宍雫七叱執失嫉室悉湿漆疾質実蔀篠偲柴芝屡蕊縞舎写射捨赦斜煮社紗者謝車遮蛇邪借勺尺杓灼爵酌釈錫若寂弱惹主取守手朱殊狩珠種腫趣酒首儒受呪寿授樹綬需囚収周67",
				"宗就州修愁拾洲秀秋終繍習臭舟蒐衆襲讐蹴輯週酋酬集醜什住充十従戎柔汁渋獣縦重銃叔夙宿淑祝縮粛塾熟出術述俊峻春瞬竣舜駿准循旬楯殉淳1準潤盾純巡遵醇順処初所暑曙渚庶緒署書薯藷諸助叙女序徐恕鋤除傷償勝匠升召哨商唱嘗奨妾娼宵将小少尚庄床廠彰承抄招掌捷昇昌昭晶松梢樟樵沼消渉湘焼焦照症省硝礁祥称章笑粧紹肖菖蒋蕉衝裳訟証詔詳象賞醤鉦鍾鐘障鞘上丈丞乗冗剰城場壌嬢常情擾条杖浄状畳穣蒸譲醸錠嘱埴飾67",
				"拭植殖燭織職色触食蝕辱尻伸信侵唇娠寝審心慎振新晋森榛浸深申疹真神秦紳臣芯薪親診身辛進針震人仁刃塵壬尋甚尽腎訊迅陣靭笥諏須酢図厨1逗吹垂帥推水炊睡粋翠衰遂酔錐錘随瑞髄崇嵩数枢趨雛据杉椙菅頗雀裾澄摺寸世瀬畝是凄制勢姓征性成政整星晴棲栖正清牲生盛精聖声製西誠誓請逝醒青静斉税脆隻席惜戚斥昔析石積籍績脊責赤跡蹟碩切拙接摂折設窃節説雪絶舌蝉仙先千占宣専尖川戦扇撰栓栴泉浅洗染潜煎煽旋穿箭線67",
				"繊羨腺舛船薦詮賎践選遷銭銑閃鮮前善漸然全禅繕膳糎噌塑岨措曾曽楚狙疏疎礎祖租粗素組蘇訴阻遡鼠僧創双叢倉喪壮奏爽宋層匝惣想捜掃挿掻1操早曹巣槍槽漕燥争痩相窓糟総綜聡草荘葬蒼藻装走送遭鎗霜騒像増憎臓蔵贈造促側則即息捉束測足速俗属賊族続卒袖其揃存孫尊損村遜他多太汰詑唾堕妥惰打柁舵楕陀駄騨体堆対耐岱帯待怠態戴替泰滞胎腿苔袋貸退逮隊黛鯛代台大第醍題鷹滝瀧卓啄宅托択拓沢濯琢託鐸濁諾茸凧蛸只67",
				"叩但達辰奪脱巽竪辿棚谷狸鱈樽誰丹単嘆坦担探旦歎淡湛炭短端箪綻耽胆蛋誕鍛団壇弾断暖檀段男談値知地弛恥智池痴稚置致蜘遅馳築畜竹筑蓄1逐秩窒茶嫡着中仲宙忠抽昼柱注虫衷註酎鋳駐樗瀦猪苧著貯丁兆凋喋寵帖帳庁弔張彫徴懲挑暢朝潮牒町眺聴脹腸蝶調諜超跳銚長頂鳥勅捗直朕沈珍賃鎮陳津墜椎槌追鎚痛通塚栂掴槻佃漬柘辻蔦綴鍔椿潰坪壷嬬紬爪吊釣鶴亭低停偵剃貞呈堤定帝底庭廷弟悌抵挺提梯汀碇禎程締艇訂諦蹄逓67",
				"邸鄭釘鼎泥摘擢敵滴的笛適鏑溺哲徹撤轍迭鉄典填天展店添纏甜貼転顛点伝殿澱田電兎吐堵塗妬屠徒斗杜渡登菟賭途都鍍砥砺努度土奴怒倒党冬1凍刀唐塔塘套宕島嶋悼投搭東桃梼棟盗淘湯涛灯燈当痘祷等答筒糖統到董蕩藤討謄豆踏逃透鐙陶頭騰闘働動同堂導憧撞洞瞳童胴萄道銅峠鴇匿得徳涜特督禿篤毒独読栃橡凸突椴届鳶苫寅酉瀞噸屯惇敦沌豚遁頓呑曇鈍奈那内乍凪薙謎灘捺鍋楢馴縄畷南楠軟難汝二尼弐迩匂賑肉虹廿日乳入67",
				"如尿韮任妊忍認濡禰祢寧葱猫熱年念捻撚燃粘乃廼之埜嚢悩濃納能脳膿農覗蚤巴把播覇杷波派琶破婆罵芭馬俳廃拝排敗杯盃牌背肺輩配倍培媒梅1楳煤狽買売賠陪這蝿秤矧萩伯剥博拍柏泊白箔粕舶薄迫曝漠爆縛莫駁麦函箱硲箸肇筈櫨幡肌畑畠八鉢溌発醗髪伐罰抜筏閥鳩噺塙蛤隼伴判半反叛帆搬斑板氾汎版犯班畔繁般藩販範釆煩頒飯挽晩番盤磐蕃蛮匪卑否妃庇彼悲扉批披斐比泌疲皮碑秘緋罷肥被誹費避非飛樋簸備尾微枇毘琵眉美67",
				"鼻柊稗匹疋髭彦膝菱肘弼必畢筆逼桧姫媛紐百謬俵彪標氷漂瓢票表評豹廟描病秒苗錨鋲蒜蛭鰭品彬斌浜瀕貧賓頻敏瓶不付埠夫婦富冨布府怖扶敷1斧普浮父符腐膚芙譜負賦赴阜附侮撫武舞葡蕪部封楓風葺蕗伏副復幅服福腹複覆淵弗払沸仏物鮒分吻噴墳憤扮焚奮粉糞紛雰文聞丙併兵塀幣平弊柄並蔽閉陛米頁僻壁癖碧別瞥蔑箆偏変片篇編辺返遍便勉娩弁鞭保舗鋪圃捕歩甫補輔穂募墓慕戊暮母簿菩倣俸包呆報奉宝峰峯崩庖抱捧放方朋67",
				"法泡烹砲縫胞芳萌蓬蜂褒訪豊邦鋒飽鳳鵬乏亡傍剖坊妨帽忘忙房暴望某棒冒紡肪膨謀貌貿鉾防吠頬北僕卜墨撲朴牧睦穆釦勃没殆堀幌奔本翻凡盆1摩磨魔麻埋妹昧枚毎哩槙幕膜枕鮪柾鱒桝亦俣又抹末沫迄侭繭麿万慢満漫蔓味未魅巳箕岬密蜜湊蓑稔脈妙粍民眠務夢無牟矛霧鵡椋婿娘冥名命明盟迷銘鳴姪牝滅免棉綿緬面麺摸模茂妄孟毛猛盲網耗蒙儲木黙目杢勿餅尤戻籾貰問悶紋門匁也冶夜爺耶野弥矢厄役約薬訳躍靖柳薮鑓愉愈油癒67",
				"諭輸唯佑優勇友宥幽悠憂揖有柚湧涌猶猷由祐裕誘遊邑郵雄融夕予余与誉輿預傭幼妖容庸揚揺擁曜楊様洋溶熔用窯羊耀葉蓉要謡踊遥陽養慾抑欲1沃浴翌翼淀羅螺裸来莱頼雷洛絡落酪乱卵嵐欄濫藍蘭覧利吏履李梨理璃痢裏裡里離陸律率立葎掠略劉流溜琉留硫粒隆竜龍侶慮旅虜了亮僚両凌寮料梁涼猟療瞭稜糧良諒遼量陵領力緑倫厘林淋燐琳臨輪隣鱗麟瑠塁涙累類令伶例冷励嶺怜玲礼苓鈴隷零霊麗齢暦歴列劣烈裂廉恋憐漣煉簾練聯67",
				"蓮連錬呂魯櫓炉賂路露労婁廊弄朗楼榔浪漏牢狼篭老聾蝋郎六麓禄肋録論倭和話歪賄脇惑枠鷲亙亘鰐詫藁蕨椀湾碗腕44弌丐丕个丱丶丼丿乂乖乘亂亅豫亊舒弍于亞亟亠亢亰亳亶从仍仄仆仂仗仞仭仟价伉佚估佛佝佗佇佶侈侏侘佻佩佰侑佯來侖儘俔俟俎俘俛俑俚俐俤俥倚倨倔倪倥倅伜俶倡倩倬俾俯們倆偃假會偕偐偈做偖偬偸傀傚傅傴傲67",
				"僉僊傳僂僖僞僥僭僣僮價僵儉儁儂儖儕儔儚儡儺儷儼儻儿兀兒兌兔兢竸兩兪兮冀冂囘册冉冏冑冓冕冖冤冦冢冩冪冫决冱冲冰况冽凅凉凛几處凩凭1凰凵凾刄刋刔刎刧刪刮刳刹剏剄剋剌剞剔剪剴剩剳剿剽劍劔劒剱劈劑辨辧劬劭劼劵勁勍勗勞勣勦飭勠勳勵勸勹匆匈甸匍匐匏匕匚匣匯匱匳匸區卆卅丗卉卍凖卞卩卮夘卻卷厂厖厠厦厥厮厰厶參簒雙叟曼燮叮叨叭叺吁吽呀听吭吼吮吶吩吝呎咏呵咎呟呱呷呰咒呻咀呶咄咐咆哇咢咸咥咬哄哈咨67",
				"咫哂咤咾咼哘哥哦唏唔哽哮哭哺哢唹啀啣啌售啜啅啖啗唸唳啝喙喀咯喊喟啻啾喘喞單啼喃喩喇喨嗚嗅嗟嗄嗜嗤嗔嘔嗷嘖嗾嗽嘛嗹噎噐營嘴嘶嘲嘸1噫噤嘯噬噪嚆嚀嚊嚠嚔嚏嚥嚮嚶嚴囂嚼囁囃囀囈囎囑囓囗囮囹圀囿圄圉圈國圍圓團圖嗇圜圦圷圸坎圻址坏坩埀垈坡坿垉垓垠垳垤垪垰埃埆埔埒埓堊埖埣堋堙堝塲堡塢塋塰毀塒堽塹墅墹墟墫墺壞墻墸墮壅壓壑壗壙壘壥壜壤壟壯壺壹壻壼壽夂夊夐夛梦夥夬夭夲夸夾竒奕奐奎奚奘奢奠奧奬奩67",
				"奸妁妝佞侫妣妲姆姨姜妍姙姚娥娟娑娜娉娚婀婬婉娵娶婢婪媚媼媾嫋嫂媽嫣嫗嫦嫩嫖嫺嫻嬌嬋嬖嬲嫐嬪嬶嬾孃孅孀孑孕孚孛孥孩孰孳孵學斈孺宀1它宦宸寃寇寉寔寐寤實寢寞寥寫寰寶寳尅將專對尓尠尢尨尸尹屁屆屎屓屐屏孱屬屮乢屶屹岌岑岔妛岫岻岶岼岷峅岾峇峙峩峽峺峭嶌峪崋崕崗嵜崟崛崑崔崢崚崙崘嵌嵒嵎嵋嵬嵳嵶嶇嶄嶂嶢嶝嶬嶮嶽嶐嶷嶼巉巍巓巒巖巛巫已巵帋帚帙帑帛帶帷幄幃幀幎幗幔幟幢幤幇幵并幺麼广庠廁廂廈廐廏67",
				"廖廣廝廚廛廢廡廨廩廬廱廳廰廴廸廾弃弉彝彜弋弑弖弩弭弸彁彈彌彎弯彑彖彗彙彡彭彳彷徃徂彿徊很徑徇從徙徘徠徨徭徼忖忻忤忸忱忝悳忿怡恠1怙怐怩怎怱怛怕怫怦怏怺恚恁恪恷恟恊恆恍恣恃恤恂恬恫恙悁悍惧悃悚悄悛悖悗悒悧悋惡悸惠惓悴忰悽惆悵惘慍愕愆惶惷愀惴惺愃愡惻惱愍愎慇愾愨愧慊愿愼愬愴愽慂慄慳慷慘慙慚慫慴慯慥慱慟慝慓慵憙憖憇憬憔憚憊憑憫憮懌懊應懷懈懃懆憺懋罹懍懦懣懶懺懴懿懽懼懾戀戈戉戍戌戔戛67",
				"戞戡截戮戰戲戳扁扎扞扣扛扠扨扼抂抉找抒抓抖拔抃抔拗拑抻拏拿拆擔拈拜拌拊拂拇抛拉挌拮拱挧挂挈拯拵捐挾捍搜捏掖掎掀掫捶掣掏掉掟掵捫1捩掾揩揀揆揣揉插揶揄搖搴搆搓搦搶攝搗搨搏摧摯摶摎攪撕撓撥撩撈撼據擒擅擇撻擘擂擱擧舉擠擡抬擣擯攬擶擴擲擺攀擽攘攜攅攤攣攫攴攵攷收攸畋效敖敕敍敘敞敝敲數斂斃變斛斟斫斷旃旆旁旄旌旒旛旙无旡旱杲昊昃旻杳昵昶昴昜晏晄晉晁晞晝晤晧晨晟晢晰暃暈暎暉暄暘暝曁暹曉暾暼67",
				"曄暸曖曚曠昿曦曩曰曵曷朏朖朞朦朧霸朮朿朶杁朸朷杆杞杠杙杣杤枉杰枩杼杪枌枋枦枡枅枷柯枴柬枳柩枸柤柞柝柢柮枹柎柆柧檜栞框栩桀桍栲桎1梳栫桙档桷桿梟梏梭梔條梛梃檮梹桴梵梠梺椏梍桾椁棊椈棘椢椦棡椌棍棔棧棕椶椒椄棗棣椥棹棠棯椨椪椚椣椡棆楹楷楜楸楫楔楾楮椹楴椽楙椰楡楞楝榁楪榲榮槐榿槁槓榾槎寨槊槝榻槃榧樮榑榠榜榕榴槞槨樂樛槿權槹槲槧樅榱樞槭樔槫樊樒櫁樣樓橄樌橲樶橸橇橢橙橦橈樸樢檐檍檠檄檢檣67",
				"檗蘗檻櫃櫂檸檳檬櫞櫑櫟檪櫚櫪櫻欅蘖櫺欒欖鬱欟欸欷盜欹飮歇歃歉歐歙歔歛歟歡歸歹歿殀殄殃殍殘殕殞殤殪殫殯殲殱殳殷殼毆毋毓毟毬毫毳毯1麾氈氓气氛氤氣汞汕汢汪沂沍沚沁沛汾汨汳沒沐泄泱泓沽泗泅泝沮沱沾沺泛泯泙泪洟衍洶洫洽洸洙洵洳洒洌浣涓浤浚浹浙涎涕濤涅淹渕渊涵淇淦涸淆淬淞淌淨淒淅淺淙淤淕淪淮渭湮渮渙湲湟渾渣湫渫湶湍渟湃渺湎渤滿渝游溂溪溘滉溷滓溽溯滄溲滔滕溏溥滂溟潁漑灌滬滸滾漿滲漱滯漲滌16451",
				"漾漓滷澆潺潸澁澀潯潛濳潭澂潼潘澎澑濂潦澳澣澡澤澹濆澪濟濕濬濔濘濱濮濛瀉瀋濺瀑瀁瀏濾瀛瀚潴瀝瀘瀟瀰瀾瀲灑灣炙炒炯烱炬炸炳炮烟烋烝1烙焉烽焜焙煥煕熈煦煢煌煖煬熏燻熄熕熨熬燗熹熾燒燉燔燎燠燬燧燵燼燹燿爍爐爛爨爭爬爰爲爻爼爿牀牆牋牘牴牾犂犁犇犒犖犢犧犹犲狃狆狄狎狒狢狠狡狹狷倏猗猊猜猖猝猴猯猩猥猾獎獏默獗獪獨獰獸獵獻獺珈玳珎玻珀珥珮珞璢琅瑯琥珸琲琺瑕琿瑟瑙瑁瑜瑩瑰瑣瑪瑶瑾璋璞璧瓊瓏瓔珱67",
				"瓠瓣瓧瓩瓮瓲瓰瓱瓸瓷甄甃甅甌甎甍甕甓甞甦甬甼畄畍畊畉畛畆畚畩畤畧畫畭畸當疆疇畴疊疉疂疔疚疝疥疣痂疳痃疵疽疸疼疱痍痊痒痙痣痞痾痿1痼瘁痰痺痲痳瘋瘍瘉瘟瘧瘠瘡瘢瘤瘴瘰瘻癇癈癆癜癘癡癢癨癩癪癧癬癰癲癶癸發皀皃皈皋皎皖皓皙皚皰皴皸皹皺盂盍盖盒盞盡盥盧盪蘯盻眈眇眄眩眤眞眥眦眛眷眸睇睚睨睫睛睥睿睾睹瞎瞋瞑瞠瞞瞰瞶瞹瞿瞼瞽瞻矇矍矗矚矜矣矮矼砌砒礦砠礪硅碎硴碆硼碚碌碣碵碪碯磑磆磋磔碾碼磅磊磬67",
				"磧磚磽磴礇礒礑礙礬礫祀祠祗祟祚祕祓祺祿禊禝禧齋禪禮禳禹禺秉秕秧秬秡秣稈稍稘稙稠稟禀稱稻稾稷穃穗穉穡穢穩龝穰穹穽窈窗窕窘窖窩竈窰1窶竅竄窿邃竇竊竍竏竕竓站竚竝竡竢竦竭竰笂笏笊笆笳笘笙笞笵笨笶筐筺笄筍笋筌筅筵筥筴筧筰筱筬筮箝箘箟箍箜箚箋箒箏筝箙篋篁篌篏箴篆篝篩簑簔篦篥籠簀簇簓篳篷簗簍篶簣簧簪簟簷簫簽籌籃籔籏籀籐籘籟籤籖籥籬籵粃粐粤粭粢粫粡粨粳粲粱粮粹粽糀糅糂糘糒糜糢鬻糯糲糴糶糺紆67",
				"紂紜紕紊絅絋紮紲紿紵絆絳絖絎絲絨絮絏絣經綉絛綏絽綛綺綮綣綵緇綽綫總綢綯緜綸綟綰緘緝緤緞緻緲緡縅縊縣縡縒縱縟縉縋縢繆繦縻縵縹繃縷1縲縺繧繝繖繞繙繚繹繪繩繼繻纃緕繽辮繿纈纉續纒纐纓纔纖纎纛纜缸缺罅罌罍罎罐网罕罔罘罟罠罨罩罧罸羂羆羃羈羇羌羔羞羝羚羣羯羲羹羮羶羸譱翅翆翊翕翔翡翦翩翳翹飜耆耄耋耒耘耙耜耡耨耿耻聊聆聒聘聚聟聢聨聳聲聰聶聹聽聿肄肆肅肛肓肚肭冐肬胛胥胙胝胄胚胖脉胯胱脛脩脣脯腋67",
				"隋腆脾腓腑胼腱腮腥腦腴膃膈膊膀膂膠膕膤膣腟膓膩膰膵膾膸膽臀臂膺臉臍臑臙臘臈臚臟臠臧臺臻臾舁舂舅與舊舍舐舖舩舫舸舳艀艙艘艝艚艟艤1艢艨艪艫舮艱艷艸艾芍芒芫芟芻芬苡苣苟苒苴苳苺莓范苻苹苞茆苜茉苙茵茴茖茲茱荀茹荐荅茯茫茗茘莅莚莪莟莢莖茣莎莇莊荼莵荳荵莠莉莨菴萓菫菎菽萃菘萋菁菷萇菠菲萍萢萠莽萸蔆菻葭萪萼蕚蒄葷葫蒭葮蒂葩葆萬葯葹萵蓊葢蒹蒿蒟蓙蓍蒻蓚蓐蓁蓆蓖蒡蔡蓿蓴蔗蔘蔬蔟蔕蔔蓼蕀蕣蕘蕈67",
				"蕁蘂蕋蕕薀薤薈薑薊薨蕭薔薛藪薇薜蕷蕾薐藉薺藏薹藐藕藝藥藜藹蘊蘓蘋藾藺蘆蘢蘚蘰蘿虍乕虔號虧虱蚓蚣蚩蚪蚋蚌蚶蚯蛄蛆蚰蛉蠣蚫蛔蛞蛩蛬1蛟蛛蛯蜒蜆蜈蜀蜃蛻蜑蜉蜍蛹蜊蜴蜿蜷蜻蜥蜩蜚蝠蝟蝸蝌蝎蝴蝗蝨蝮蝙蝓蝣蝪蠅螢螟螂螯蟋螽蟀蟐雖螫蟄螳蟇蟆螻蟯蟲蟠蠏蠍蟾蟶蟷蠎蟒蠑蠖蠕蠢蠡蠱蠶蠹蠧蠻衄衂衒衙衞衢衫袁衾袞衵衽袵衲袂袗袒袮袙袢袍袤袰袿袱裃裄裔裘裙裝裹褂裼裴裨裲褄褌褊褓襃褞褥褪褫襁襄褻褶褸襌褝襠襞67",
				"襦襤襭襪襯襴襷襾覃覈覊覓覘覡覩覦覬覯覲覺覽覿觀觚觜觝觧觴觸訃訖訐訌訛訝訥訶詁詛詒詆詈詼詭詬詢誅誂誄誨誡誑誥誦誚誣諄諍諂諚諫諳諧1諤諱謔諠諢諷諞諛謌謇謚諡謖謐謗謠謳鞫謦謫謾謨譁譌譏譎證譖譛譚譫譟譬譯譴譽讀讌讎讒讓讖讙讚谺豁谿豈豌豎豐豕豢豬豸豺貂貉貅貊貍貎貔豼貘戝貭貪貽貲貳貮貶賈賁賤賣賚賽賺賻贄贅贊贇贏贍贐齎贓賍贔贖赧赭赱赳趁趙跂趾趺跏跚跖跌跛跋跪跫跟跣跼踈踉跿踝踞踐踟蹂踵踰踴蹊67",
				"蹇蹉蹌蹐蹈蹙蹤蹠踪蹣蹕蹶蹲蹼躁躇躅躄躋躊躓躑躔躙躪躡躬躰軆躱躾軅軈軋軛軣軼軻軫軾輊輅輕輒輙輓輜輟輛輌輦輳輻輹轅轂輾轌轉轆轎轗轜1轢轣轤辜辟辣辭辯辷迚迥迢迪迯邇迴逅迹迺逑逕逡逍逞逖逋逧逶逵逹迸遏遐遑遒逎遉逾遖遘遞遨遯遶隨遲邂遽邁邀邊邉邏邨邯邱邵郢郤扈郛鄂鄒鄙鄲鄰酊酖酘酣酥酩酳酲醋醉醂醢醫醯醪醵醴醺釀釁釉釋釐釖釟釡釛釼釵釶鈞釿鈔鈬鈕鈑鉞鉗鉅鉉鉤鉈銕鈿鉋鉐銜銖銓銛鉚鋏銹銷鋩錏鋺鍄錮67",
				"錙錢錚錣錺錵錻鍜鍠鍼鍮鍖鎰鎬鎭鎔鎹鏖鏗鏨鏥鏘鏃鏝鏐鏈鏤鐚鐔鐓鐃鐇鐐鐶鐫鐵鐡鐺鑁鑒鑄鑛鑠鑢鑞鑪鈩鑰鑵鑷鑽鑚鑼鑾钁鑿閂閇閊閔閖閘閙1閠閨閧閭閼閻閹閾闊濶闃闍闌闕闔闖關闡闥闢阡阨阮阯陂陌陏陋陷陜陞陝陟陦陲陬隍隘隕隗險隧隱隲隰隴隶隸隹雎雋雉雍襍雜霍雕雹霄霆霈霓霎霑霏霖霙霤霪霰霹霽霾靄靆靈靂靉靜靠靤靦靨勒靫靱靹鞅靼鞁靺鞆鞋鞏鞐鞜鞨鞦鞣鞳鞴韃韆韈韋韜韭齏韲竟韶韵頏頌頸頤頡頷頽顆顏顋顫顯顰67",
				"顱顴顳颪颯颱颶飄飃飆飩飫餃餉餒餔餘餡餝餞餤餠餬餮餽餾饂饉饅饐饋饑饒饌饕馗馘馥馭馮馼駟駛駝駘駑駭駮駱駲駻駸騁騏騅駢騙騫騷驅驂驀驃1騾驕驍驛驗驟驢驥驤驩驫驪骭骰骼髀髏髑髓體髞髟髢髣髦髯髫髮髴髱髷髻鬆鬘鬚鬟鬢鬣鬥鬧鬨鬩鬪鬮鬯鬲魄魃魏魍魎魑魘魴鮓鮃鮑鮖鮗鮟鮠鮨鮴鯀鯊鮹鯆鯏鯑鯒鯣鯢鯤鯔鯡鰺鯲鯱鯰鰕鰔鰉鰓鰌鰆鰈鰒鰊鰄鰮鰛鰥鰤鰡鰰鱇鰲鱆鰾鱚鱠鱧鱶鱸鳧鳬鳰鴉鴈鳫鴃鴆鴪鴦鶯鴣鴟鵄鴕鴒鵁鴿鴾鵆鵈67",
				"鵝鵞鵤鵑鵐鵙鵲鶉鶇鶫鵯鵺鶚鶤鶩鶲鷄鷁鶻鶸鶺鷆鷏鷂鷙鷓鷸鷦鷭鷯鷽鸚鸛鸞鹵鹹鹽麁麈麋麌麒麕麑麝麥麩麸麪麭靡黌黎黏黐黔黜點黝黠黥黨黯1黴黶黷黹黻黼黽鼇鼈皷鼕鼡鼬鼾齊齒齔齣齟齠齡齦齧齬齪齷齲齶龕龜龠堯槇遙瑤凜熙667",
				"纊褜鍈銈蓜俉炻昱棈鋹曻彅丨仡仼伀伃伹佖侒侊侚侔俍偀倢俿倞偆偰偂傔僴僘兊兤冝冾凬刕劜劦勀勛匀匇匤卲厓厲叝﨎咜咊咩哿喆坙坥垬埈埇﨏1塚增墲夋奓奛奝奣妤妺孖寀甯寘寬尞岦岺峵崧嵓﨑嵂嵭嶸嶹巐弡弴彧德忞恝悅悊惞惕愠惲愑愷愰憘戓抦揵摠撝擎敎昀昕昻昉昮昞昤晥晗晙晴晳暙暠暲暿曺朎朗杦枻桒柀栁桄棏﨓楨﨔榘槢樰橫橆橳橾櫢櫤毖氿汜沆汯泚洄涇浯涖涬淏淸淲淼渹湜渧渼溿澈澵濵瀅瀇瀨炅炫焏焄煜煆煇凞燁燾犱67",
				"犾猤猪獷玽珉珖珣珒琇珵琦琪琩琮瑢璉璟甁畯皂皜皞皛皦益睆劯砡硎硤硺礰礼神祥禔福禛竑竧靖竫箞精絈絜綷綠緖繒罇羡羽茁荢荿菇菶葈蒴蕓蕙1蕫﨟薰蘒﨡蠇裵訒訷詹誧誾諟諸諶譓譿賰賴贒赶﨣軏﨤逸遧郞都鄕鄧釚釗釞釭釮釤釥鈆鈐鈊鈺鉀鈼鉎鉙鉑鈹鉧銧鉷鉸鋧鋗鋙鋐﨧鋕鋠鋓錥錡鋻﨨錞鋿錝錂鍰鍗鎤鏆鏞鏸鐱鑅鑈閒隆﨩隝隯霳霻靃靍靏靑靕顗顥飯飼餧館馞驎髙髜魵魲鮏鮱鮻鰀鵰鵫鶴鸙黑2ⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹ￢￤＇＂323",
				"167",
				"167",
				"167",
				"167",
				"167",
				"167",
				"167",
				"167",
				"167",
				"167",
				"ⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ￢￤＇＂㈱№℡∵纊褜鍈銈蓜俉炻昱棈鋹曻彅丨仡仼伀伃伹佖侒侊侚侔俍偀倢俿倞偆偰偂傔僴僘兊1兤冝冾凬刕劜劦勀勛匀匇匤卲厓厲叝﨎咜咊咩哿喆坙坥垬埈埇﨏塚增墲夋奓奛奝奣妤妺孖寀甯寘寬尞岦岺峵崧嵓﨑嵂嵭嶸嶹巐弡弴彧德忞恝悅悊惞惕愠惲愑愷愰憘戓抦揵摠撝擎敎昀昕昻昉昮昞昤晥晗晙晴晳暙暠暲暿曺朎朗杦枻桒柀栁桄棏﨓楨﨔榘槢樰橫橆橳橾櫢櫤毖氿汜沆汯泚洄涇浯67",
				"涖涬淏淸淲淼渹湜渧渼溿澈澵濵瀅瀇瀨炅炫焏焄煜煆煇凞燁燾犱犾猤猪獷玽珉珖珣珒琇珵琦琪琩琮瑢璉璟甁畯皂皜皞皛皦益睆劯砡硎硤硺礰礼神1祥禔福禛竑竧靖竫箞精絈絜綷綠緖繒罇羡羽茁荢荿菇菶葈蒴蕓蕙蕫﨟薰蘒﨡蠇裵訒訷詹誧誾諟諸諶譓譿賰賴贒赶﨣軏﨤逸遧郞都鄕鄧釚釗釞釭釮釤釥鈆鈐鈊鈺鉀鈼鉎鉙鉑鈹鉧銧鉷鉸鋧鋗鋙鋐﨧鋕鋠鋓錥錡鋻﨨錞鋿錝錂鍰鍗鎤鏆鏞鏸鐱鑅鑈閒隆﨩隝隯霳霻靃靍靏靑靕顗顥飯飼餧館馞驎髙67",
				"髜魵魲鮏鮱鮻鰀鵰鵫鶴鸙黑"
			].join("");

			/*
			上の変換マップ作成用の文字列は数値が入った変換マップのコードから作成している
			let output = "";
			let nul_count = 0;
			for(i = 0x8140; i <= 0xffff; i++) {
				if(map[i]) {
					if(nul_count !== 0){
						output += nul_count;
						nul_count = 0;
					}
					output += MojiJS.fromCodePoint(map[i]);
				}
				else {
					nul_count++;
				}
			}
			*/

			/**
			 * UTF16へ変換
			 */
			const utf16_array = Unicode.toUTF16Array(map);

			// マップ展開
			let is_num = false;
			let num_array = [];
			let key = 0x8140;
			for (let i = 0; i < utf16_array.length; i++) {
				const x = utf16_array[i];
				if (0x30 <= x && x <= 0x39) {
					if (!is_num) {
						is_num = true;
						num_array = [];
					}
					num_array.push(x);
				} else {
					if (is_num) {
						key += parseFloat(Unicode.fromUTF16Array(num_array));
						is_num = false;
					}
					cp932_to_unicode_map[key] = x;
					key++;
				}
			}

			return cp932_to_unicode_map;
		};

		/**
		 * CP932 変換マップ
		 * @type {Record<number, number>}
		 */
		const cp932_to_unicode_map = getCp932ToUnicodeMap();

		/* eslint-disable max-len */
		/**
		 * 重複された CP932 のコード
		 * @type {number[]}
		 */
		// prettier-ignore
		const duplicate_map_array = [
			0x8790, 0x8791, 0x8792, 0x8795, 0x8796, 0x8797, 0x879A, 0x879B, 0x879C, 0xED40, 0xED41, 0xED42, 0xED43, 0xED44, 0xED45, 0xED46,
			0xED47, 0xED48, 0xED49, 0xED4A, 0xED4B, 0xED4C, 0xED4D, 0xED4E, 0xED4F, 0xED50, 0xED51, 0xED52, 0xED53, 0xED54, 0xED55, 0xED56,
			0xED57, 0xED58, 0xED59, 0xED5A, 0xED5B, 0xED5C, 0xED5D, 0xED5E, 0xED5F, 0xED60, 0xED61, 0xED62, 0xED63, 0xED64, 0xED65, 0xED66,
			0xED67, 0xED68, 0xED69, 0xED6A, 0xED6B, 0xED6C, 0xED6D, 0xED6E, 0xED6F, 0xED70, 0xED71, 0xED72, 0xED73, 0xED74, 0xED75, 0xED76,
			0xED77, 0xED78, 0xED79, 0xED7A, 0xED7B, 0xED7C, 0xED7D, 0xED7E, 0xED80, 0xED81, 0xED82, 0xED83, 0xED84, 0xED85, 0xED86, 0xED87,
			0xED88, 0xED89, 0xED8A, 0xED8B, 0xED8C, 0xED8D, 0xED8E, 0xED8F, 0xED90, 0xED91, 0xED92, 0xED93, 0xED94, 0xED95, 0xED96, 0xED97,
			0xED98, 0xED99, 0xED9A, 0xED9B, 0xED9C, 0xED9D, 0xED9E, 0xED9F, 0xEDA0, 0xEDA1, 0xEDA2, 0xEDA3, 0xEDA4, 0xEDA5, 0xEDA6, 0xEDA7,
			0xEDA8, 0xEDA9, 0xEDAA, 0xEDAB, 0xEDAC, 0xEDAD, 0xEDAE, 0xEDAF, 0xEDB0, 0xEDB1, 0xEDB2, 0xEDB3, 0xEDB4, 0xEDB5, 0xEDB6, 0xEDB7,
			0xEDB8, 0xEDB9, 0xEDBA, 0xEDBB, 0xEDBC, 0xEDBD, 0xEDBE, 0xEDBF, 0xEDC0, 0xEDC1, 0xEDC2, 0xEDC3, 0xEDC4, 0xEDC5, 0xEDC6, 0xEDC7,
			0xEDC8, 0xEDC9, 0xEDCA, 0xEDCB, 0xEDCC, 0xEDCD, 0xEDCE, 0xEDCF, 0xEDD0, 0xEDD1, 0xEDD2, 0xEDD3, 0xEDD4, 0xEDD5, 0xEDD6, 0xEDD7,
			0xEDD8, 0xEDD9, 0xEDDA, 0xEDDB, 0xEDDC, 0xEDDD, 0xEDDE, 0xEDDF, 0xEDE0, 0xEDE1, 0xEDE2, 0xEDE3, 0xEDE4, 0xEDE5, 0xEDE6, 0xEDE7,
			0xEDE8, 0xEDE9, 0xEDEA, 0xEDEB, 0xEDEC, 0xEDED, 0xEDEE, 0xEDEF, 0xEDF0, 0xEDF1, 0xEDF2, 0xEDF3, 0xEDF4, 0xEDF5, 0xEDF6, 0xEDF7,
			0xEDF8, 0xEDF9, 0xEDFA, 0xEDFB, 0xEDFC, 0xEE40, 0xEE41, 0xEE42, 0xEE43, 0xEE44, 0xEE45, 0xEE46, 0xEE47, 0xEE48, 0xEE49, 0xEE4A,
			0xEE4B, 0xEE4C, 0xEE4D, 0xEE4E, 0xEE4F, 0xEE50, 0xEE51, 0xEE52, 0xEE53, 0xEE54, 0xEE55, 0xEE56, 0xEE57, 0xEE58, 0xEE59, 0xEE5A,
			0xEE5B, 0xEE5C, 0xEE5D, 0xEE5E, 0xEE5F, 0xEE60, 0xEE61, 0xEE62, 0xEE63, 0xEE64, 0xEE65, 0xEE66, 0xEE67, 0xEE68, 0xEE69, 0xEE6A,
			0xEE6B, 0xEE6C, 0xEE6D, 0xEE6E, 0xEE6F, 0xEE70, 0xEE71, 0xEE72, 0xEE73, 0xEE74, 0xEE75, 0xEE76, 0xEE77, 0xEE78, 0xEE79, 0xEE7A,
			0xEE7B, 0xEE7C, 0xEE7D, 0xEE7E, 0xEE80, 0xEE81, 0xEE82, 0xEE83, 0xEE84, 0xEE85, 0xEE86, 0xEE87, 0xEE88, 0xEE89, 0xEE8A, 0xEE8B,
			0xEE8C, 0xEE8D, 0xEE8E, 0xEE8F, 0xEE90, 0xEE91, 0xEE92, 0xEE93, 0xEE94, 0xEE95, 0xEE96, 0xEE97, 0xEE98, 0xEE99, 0xEE9A, 0xEE9B,
			0xEE9C, 0xEE9D, 0xEE9E, 0xEE9F, 0xEEA0, 0xEEA1, 0xEEA2, 0xEEA3, 0xEEA4, 0xEEA5, 0xEEA6, 0xEEA7, 0xEEA8, 0xEEA9, 0xEEAA, 0xEEAB,
			0xEEAC, 0xEEAD, 0xEEAE, 0xEEAF, 0xEEB0, 0xEEB1, 0xEEB2, 0xEEB3, 0xEEB4, 0xEEB5, 0xEEB6, 0xEEB7, 0xEEB8, 0xEEB9, 0xEEBA, 0xEEBB,
			0xEEBC, 0xEEBD, 0xEEBE, 0xEEBF, 0xEEC0, 0xEEC1, 0xEEC2, 0xEEC3, 0xEEC4, 0xEEC5, 0xEEC6, 0xEEC7, 0xEEC8, 0xEEC9, 0xEECA, 0xEECB,
			0xEECC, 0xEECD, 0xEECE, 0xEECF, 0xEED0, 0xEED1, 0xEED2, 0xEED3, 0xEED4, 0xEED5, 0xEED6, 0xEED7, 0xEED8, 0xEED9, 0xEEDA, 0xEEDB,
			0xEEDC, 0xEEDD, 0xEEDE, 0xEEDF, 0xEEE0, 0xEEE1, 0xEEE2, 0xEEE3, 0xEEE4, 0xEEE5, 0xEEE6, 0xEEE7, 0xEEE8, 0xEEE9, 0xEEEA, 0xEEEB,
			0xEEEC, 0xEEEF, 0xEEF0, 0xEEF1, 0xEEF2, 0xEEF3, 0xEEF4, 0xEEF5, 0xEEF6, 0xEEF7, 0xEEF8, 0xEEF9, 0xEEFA, 0xEEFB, 0xEEFC, 0xFA4A,
			0xFA4B, 0xFA4C, 0xFA4D, 0xFA4E, 0xFA4F, 0xFA50, 0xFA51, 0xFA52, 0xFA53, 0xFA54, 0xFA58, 0xFA59, 0xFA5A, 0xFA5B
		];
		/* eslint-enable max-len */

		/**
		 * @type {Record<number, number>}
		 */
		const duplicate_map = {};

		/**
		 * @type {Record<number, number>}
		 */
		const unicode_to_cp932_map = {};

		for (const key in duplicate_map_array) {
			duplicate_map[duplicate_map_array[key]] = 1;
		}
		for (const key in cp932_to_unicode_map) {
			// 重複登録された文字
			// IBM拡張文字 と NEC特殊文字 と NEC選定IBM拡張文字 で
			// マッピング先が一部重複している。
			// WideCharToMultiByte の仕様に基づき、登録しない。
			if (duplicate_map[key]) {
				continue;
			}
			const x = cp932_to_unicode_map[key];
			unicode_to_cp932_map[x] = parseInt(key, 10);
		}

		// 逆引きの注意点

		// 半角￥マーク問題
		// 半角￥マークは、Shift_JISの「5c 0xReverse Solidus 逆斜線」にする
		// Unicode '¥' 0x00a5 Yen Sign 半角円マーク
		unicode_to_cp932_map[0xA5] = 0x5C;

		// 波線問題
		// SJIS2004上は 0x8160 と 0x81B0 とで区別されている。
		// Shift_JISは 0x301c を 0x8160 に統一
		// Unicode '〜' 0x301c Shift_JIS-2004 0x8160 Wave Dash 波ダッシュ
		// Unicode '～' 0xff5e Shift_JIS-2004 0x81B0 Fullwidth Tilde 全角チルダ
		unicode_to_cp932_map[0x301C] = 0x8160;

		// マイナス問題
		// SJIS2004上は 0x817c と 0x81af とで区別されている。
		// Shift_JISは、0x2212 を全角負記号 0x817c へ変更
		// Unicode `−` 0x2212 Shift_JIS-2004 0x817c 負符号/減算記号
		// Unicode `－` 0xff0d Shift_JIS-2004 0x81af ハイフンマイナス
		unicode_to_cp932_map[0x2212] = 0x817C;

		CP932MAP.cp932_to_unicode_map = cp932_to_unicode_map;
		CP932MAP.unicode_to_cp932_map = unicode_to_cp932_map;
	}

	/**
	 * @returns {Record<number, number>}
	 */
	static CP932_TO_UNICODE() {
		CP932MAP.init();
		return CP932MAP.cp932_to_unicode_map;
	}

	/**
	 * @returns {Record<number, number>}
	 */
	static UNICODE_TO_CP932() {
		CP932MAP.init();
		return CP932MAP.unicode_to_cp932_map;
	}
}

/**
 * 変換マップを初期化したかどうか
 * @type {boolean}
 */
CP932MAP.is_initmap = false;

/**
 * 変換用マップ
 * @type {Record<number, number>}
 */
CP932MAP.cp932_to_unicode_map = null;

/**
 * 変換用マップ
 * @type {Record<number, number>}
 */
CP932MAP.unicode_to_cp932_map = null;

/**
 * CP932, Windows-31J を扱うクラス
 * @ignore
 */
class CP932 {
	/**
	 * Unicode のコードから CP932 のコードに変換
	 * @param {number} unicode_codepoint - Unicode のコードポイント
	 * @returns {number} CP932 のコードポイント (存在しない場合は undefined)
	 */
	static toCP932FromUnicode(unicode_codepoint) {
		return CP932MAP.UNICODE_TO_CP932()[unicode_codepoint];
	}

	/**
	 * CP932 のコードから Unicode のコードに変換
	 * @param {number} cp932_codepoint - CP932 のコードポイント
	 * @returns {number} Unicode のコードポイント (存在しない場合は undefined)
	 */
	static toUnicodeFromCP932(cp932_codepoint) {
		return CP932MAP.CP932_TO_UNICODE()[cp932_codepoint];
	}

	/**
	 * 文字列を CP932 の配列に変換。変換できない文字は "?" に変換される。
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} CP932 のデータが入った配列
	 */
	static toCP932Array(text) {
		return SJIS.toSJISArray(text, CP932MAP.UNICODE_TO_CP932());
	}

	/**
	 * 文字列を CP932 のバイナリ配列に変換。変換できない文字は "?" に変換される。
	 * - 日本語文字は2バイトとして、配列も2つ分、使用します。
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} CP932 のデータが入ったバイナリ配列
	 */
	static toCP932Binary(text) {
		return SJIS.toSJISBinary(text, CP932MAP.UNICODE_TO_CP932());
	}

	/**
	 * CP932 の配列から文字列に変換
	 * @param {number[]} cp932 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromCP932Array(cp932) {
		return SJIS.fromSJISArray(cp932, CP932MAP.CP932_TO_UNICODE());
	}

	/**
	 * 指定した文字から Windows-31J 上の区点番号に変換
	 * - 2文字以上を指定した場合は、1文字目のみを変換する
	 * @param {string} text - 変換したいテキスト
	 * @returns {MenKuTen} 区点番号(存在しない場合（1バイトのJISコードなど）はnullを返す)
	 */
	static toKuTen(text) {
		if (text.length === 0) {
			return null;
		}
		const cp932_code = CP932.toCP932FromUnicode(Unicode.toUTF32Array(text)[0]);
		return cp932_code ? SJIS.toKuTenFromSJISCode(cp932_code) : null;
	}
}

/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */


/**
 * Encode用のツールクラス
 * @ignore
 */
class EncodeTools {
	/**
	 * キャラセット名の正規化
	 * @param {string} charset
	 * @returns {string}
	 */
	static normalizeCharSetName(charset) {
		let x1, x2;
		let is_with_bom = false;
		// BOM の文字がある場合は BOM 付きとする
		if (/^bom\s+|\s+bom\s+|\s+bom$/i.test(x1)) {
			is_with_bom = true;
			x1 = charset.replace(/^bom\s+|(\s+with)?\s+bom\s+|(\s+with\s*)?\s+bom$/, "");
		} else {
			x1 = charset;
		}
		if (/^(unicode-1-1-utf-8|UTF[-_]?8)$/i.test(x1)) {
			x2 = "UTF-8";
		} else if (/^(csunicode|iso-10646-ucs-2|ucs-2|Unicode|UnicodeFEFF|UTF[-_]?16([-_]?LE)?)$/i.test(x1)) {
			x2 = "UTF-16LE";
		} else if (/^(UnicodeFFFE|UTF[-_]?16[-_]?BE)$/i.test(x1)) {
			x2 = "UTF-16BE";
		} else if (/^(utf32_littleendian|UTF[-_]?32([-_]?LE)?)$/i.test(x1)) {
			x2 = "UTF-32LE";
		} else if (/^(utf32_bigendian|UTF[-_]?32[-_]?BE)$/i.test(x1)) {
			x2 = "UTF-32BE";
		} else if (/^(csshiftjis|ms_kanji|(cp|ms)932|shift[-_]?jis|sjis|Windows[-_]?31J|x-sjis)$/i.test(x1)) {
			x2 = "Shift_JIS";
		} else {
			x2 = x1;
		}
		if (is_with_bom) {
			x2 += " with BOM";
		}
		return x2;
	}

	/**
	 * 同一の種別の文字列の重なりをカウントする
	 * @param {number[]} utf32_array
	 * @returns {number}
	 */
	static countWord(utf32_array) {
		let count = 0;
		let type;
		let old_type = -1;
		for (let i = 0; i < utf32_array.length; i++) {
			const ch = utf32_array[i];
			// a-zA-Z
			// prettier-ignore
			if ((0x41 <= ch && ch <= 0x5A) || (0x61 <= ch && ch <= 0x6A)) {
				type = 1;
			// prettier-ignore
			} else if (0x30 <= ch && ch <= 0x39) {
				// 0-9
				type = 2;
			// prettier-ignore
			} else if (0x3041 <= ch && ch <= 0x3093) {
				// ぁ-ん
				type = 3;
			// prettier-ignore
			} else if (0x30A1 <= ch && ch <= 0x30F3) {
				// ァ-ン
				type = 4;
			// prettier-ignore
			} else if ((0xFF21 <= ch && ch <= 0xFF3A) || (0xFF41 <= ch && ch <= 0xFF5A)) {
				// 全角英字
				type = 5;
			} else if (0xFF10 <= ch && ch <= 0xFF19) {
				// 全角数値
				type = 6;
			// prettier-ignore
			} else if (0xFF61 <= ch && ch < 0xFFA0) {
			// 半角カタカナ
				type = 7;
			// prettier-ignore
			} else if ((0x3400 <= ch && ch < 0xA000) || (0x20000 <= ch && ch < 0x2FA20)) {
				// CJK統合漢字拡張A - CJK統合漢字, 追加漢字面
				type = 8;
			} else {
				old_type = -1;
				continue;
			}
			if (type === old_type) {
				count++;
			}
			old_type = type;
		}
		return count;
	}
}

/**
 * 文字データのバイナリへのエンコード、文字列へのデコードを扱うクラス
 * @ignore
 */
class Encode {
	/**
	 * 文字列からバイナリ配列にエンコードする
	 * @param {string} text - 変換したいテキスト
	 * @param {string} charset - キャラセット(UTF-8/16/32,Shift_JIS,Windows-31J,Shift_JIS-2004,EUC-JP,EUC-JP-2004)
	 * @param {boolean} [is_with_bom=true] - BOMをつけるかどうか
	 * @returns {number[]} バイナリ配列(失敗時はnull)
	 */
	static encode(text, charset, is_with_bom) {
		const ncharset = charset ? EncodeTools.normalizeCharSetName(charset) : "autodetect";
		if (/^UTF-(8|16|32)/i.test(ncharset)) {
			const utf32_array = Unicode.toUTF32Array(text);
			return Unicode.toUTFBinaryFromCodePoint(utf32_array, ncharset, is_with_bom);
		} else if (/^Shift_JIS$/i.test(ncharset)) {
			return CP932.toCP932Binary(text);
		}
		return null;
	}

	/**
	 * バイナリ配列から文字列にデコードする
	 * @param {number[]} binary - 変換したいバイナリ配列
	 * @param {string} [charset="autodetect"] - キャラセット(UTF-8/16/32,Shift_JIS)
	 * @returns {string} 変換した文字列（失敗したらnull）
	 */
	static decode(binary, charset) {
		const ncharset = charset ? EncodeTools.normalizeCharSetName(charset) : "autodetect";
		if (/^UTF-(8|16|32)/i.test(ncharset)) {
			const ret = Unicode.toCodePointFromUTFBinary(binary, charset);
			if (ret) {
				return Unicode.fromUTF32Array(ret);
			}
		} else if (/^Shift_JIS$/i.test(ncharset)) {
			return CP932.fromCP932Array(binary);
		}
		return null;
	}
}

/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */


/**
 * 日本語を扱うクラス
 * @ignore
 */
class Japanese {
	/**
	 * カタカナをひらがなに変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHiragana(text) {
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			// prettier-ignore
			return String.fromCharCode(ch.charCodeAt(0) - 0x0060);
		};
		return text.replace(/[\u30A1-\u30F6]/g, func);
	}

	/**
	 * ひらがなをカタカナに変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toKatakana(text) {
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			// prettier-ignore
			return String.fromCharCode(ch.charCodeAt(0) + 0x0060);
		};
		return text.replace(/[\u3041-\u3096]/g, func);
	}

	/**
	 * スペースを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthSpace(text) {
		// prettier-ignore
		return text.replace(/\u3000/g, String.fromCharCode(0x0020));
	}

	/**
	 * スペースを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthSpace(text) {
		// prettier-ignore
		return text.replace(/\u0020/g, String.fromCharCode(0x3000));
	}

	/**
	 * 英数記号を半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthAsciiCode(text) {
		let out = text;
		out = out.replace(/\u3000/g, "\u0020"); //全角スペース
		out = out.replace(/[\u2018-\u201B]/g, "\u0027"); //シングルクォーテーション
		out = out.replace(/[\u201C-\u201F]/g, "\u0022"); //ダブルクォーテーション
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			const code = ch.charCodeAt(0);
			// prettier-ignore
			return String.fromCharCode(code - 0xFEE0);
		};
		return out.replace(/[\uFF01-\uFF5E]/g, func);
	}

	/**
	 * 英数記号を全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthAsciiCode(text) {
		let out = text;
		out = out.replace(/\u0020/g, "\u3000"); //全角スペース
		out = out.replace(/\u0022/g, "\u201D"); //ダブルクォーテーション
		out = out.replace(/\u0027/g, "\u2019"); //アポストロフィー
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			const code = ch.charCodeAt(0);
			// prettier-ignore
			return String.fromCharCode(code + 0xFEE0);
		};
		return out.replace(/[\u0020-\u007E]/g, func);
	}

	/**
	 * アルファベットを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthAlphabet(text) {
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			// prettier-ignore
			return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
		};
		return text.replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, func);
	}

	/**
	 * アルファベットを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthAlphabet(text) {
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			// prettier-ignore
			return String.fromCharCode(ch.charCodeAt(0) + 0xFEE0);
		};
		return text.replace(/[A-Za-z]/g, func);
	}

	/**
	 * 数値を半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthNumber(text) {
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			// prettier-ignore
			return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
		};
		return text.replace(/[\uFF10-\uFF19]/g, func);
	}

	/**
	 * 数値を全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthNumber(text) {
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			// prettier-ignore
			return String.fromCharCode(ch.charCodeAt(0) + 0xFEE0);
		};
		return text.replace(/[0-9]/g, func);
	}

	/**
	 * カタカナを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthKana(text) {
		/**
		 * @type {Object<number, string>}
		 */
		// prettier-ignore
		const map = {
			0x3001:	"\uFF64",	//	､
			0x3002:	"\uFF61",	//	。	｡
			0x300C:	"\uFF62",	//	「	｢
			0x300D:	"\uFF63",	//	」	｣
			0x309B:	"\uFF9E",	//	゛	ﾞ
			0x309C:	"\uFF9F",	//	゜	ﾟ
			0x30A1:	"\uFF67",	//	ァ	ｧ
			0x30A2:	"\uFF71",	//	ア	ｱ
			0x30A3:	"\uFF68",	//	ィ	ｨ
			0x30A4:	"\uFF72",	//	イ	ｲ
			0x30A5:	"\uFF69",	//	ゥ	ｩ
			0x30A6:	"\uFF73",	//	ウ	ｳ
			0x30A7:	"\uFF6A",	//	ェ	ｪ
			0x30A8:	"\uFF74",	//	エ	ｴ
			0x30A9:	"\uFF6B",	//	ォ	ｫ
			0x30AA:	"\uFF75",	//	オ	ｵ
			0x30AB:	"\uFF76",	//	カ	ｶ
			0x30AC:	"\uFF76\uFF9E",	//	ガ	ｶﾞ
			0x30AD:	"\uFF77",	//	キ	ｷ
			0x30AE:	"\uFF77\uFF9E",	//	ギ	ｷﾞ
			0x30AF:	"\uFF78",	//	ク	ｸ
			0x30B0:	"\uFF78\uFF9E",	//	グ	ｸﾞ
			0x30B1:	"\uFF79",	//	ケ	ｹ
			0x30B2:	"\uFF79\uFF9E",	//	ゲ	ｹﾞ
			0x30B3:	"\uFF7A",	//	コ	ｺ
			0x30B4:	"\uFF7A\uFF9E",	//	ゴ	ｺﾞ
			0x30B5:	"\uFF7B",	//	サ	ｻ
			0x30B6:	"\uFF7B\uFF9E",	//	ザ	ｻﾞ
			0x30B7:	"\uFF7C",	//	シ	ｼ
			0x30B8:	"\uFF7C\uFF9E",	//	ジ	ｼﾞ
			0x30B9:	"\uFF7D",	//	ス	ｽ
			0x30BA:	"\uFF7D\uFF9E",	//	ズ	ｽﾞ
			0x30BB:	"\uFF7E",	//	セ	ｾ
			0x30BC:	"\uFF7E\uFF9E",	//	ゼ	ｾﾞ
			0x30BD:	"\uFF7F",	//	ソ	ｿ
			0x30BE:	"\uFF7F\uFF9E",	//	ゾ	ｿﾞ
			0x30BF:	"\uFF80",	//	タ	ﾀ
			0x30C0:	"\uFF80\uFF9E",	//	ダ	ﾀﾞ
			0x30C1:	"\uFF81",	//	チ	ﾁ
			0x30C2:	"\uFF81\uFF9E",	//	ヂ	ﾁﾞ
			0x30C3:	"\uFF6F",	//	ッ	ｯ
			0x30C4:	"\uFF82",	//	ツ	ﾂ
			0x30C5:	"\uFF82\uFF9E",	//	ヅ	ﾂﾞ
			0x30C6:	"\uFF83",	//	テ	ﾃ
			0x30C7:	"\uFF83\uFF9E",	//	デ	ﾃﾞ
			0x30C8:	"\uFF84",	//	ト	ﾄ
			0x30C9:	"\uFF84\uFF9E",	//	ド	ﾄﾞ
			0x30CA:	"\uFF85",	//	ナ	ﾅ
			0x30CB:	"\uFF86",	//	ニ	ﾆ
			0x30CC:	"\uFF87",	//	ヌ	ﾇ
			0x30CD:	"\uFF88",	//	ネ	ﾈ
			0x30CE:	"\uFF89",	//	ノ	ﾉ
			0x30CF:	"\uFF8A",	//	ハ	ﾊ
			0x30D0:	"\uFF8A\uFF9E",	//	バ	ﾊﾞ
			0x30D1:	"\uFF8A\uFF9F",	//	パ	ﾊﾟ
			0x30D2:	"\uFF8B",	//	ヒ	ﾋ
			0x30D3:	"\uFF8B\uFF9E",	//	ビ	ﾋﾞ
			0x30D4:	"\uFF8B\uFF9F",	//	ピ	ﾋﾟ
			0x30D5:	"\uFF8C",	//	フ	ﾌ
			0x30D6:	"\uFF8C\uFF9E",	//	ブ	ﾌﾞ
			0x30D7:	"\uFF8C\uFF9F",	//	プ	ﾌﾟ
			0x30D8:	"\uFF8D",	//	ヘ	ﾍ
			0x30D9:	"\uFF8D\uFF9E",	//	ベ	ﾍﾞ
			0x30DA:	"\uFF8D\uFF9F",	//	ペ	ﾍﾟ
			0x30DB:	"\uFF8E",	//	ホ	ﾎ
			0x30DC:	"\uFF8E\uFF9E",	//	ボ	ﾎﾞ
			0x30DD:	"\uFF8E\uFF9F",	//	ポ	ﾎﾟ
			0x30DE:	"\uFF8F",	//	マ	ﾏ
			0x30DF:	"\uFF90",	//	ミ	ﾐ
			0x30E0:	"\uFF91",	//	ム	ﾑ
			0x30E1:	"\uFF92",	//	メ	ﾒ
			0x30E2:	"\uFF93",	//	モ	ﾓ
			0x30E3:	"\uFF6C",	//	ャ	ｬ
			0x30E4:	"\uFF94",	//	ヤ	ﾔ
			0x30E5:	"\uFF6D",	//	ュ	ｭ
			0x30E6:	"\uFF95",	//	ユ	ﾕ
			0x30E7:	"\uFF6E",	//	ョ	ｮ
			0x30E8:	"\uFF96",	//	ヨ	ﾖ
			0x30E9:	"\uFF97",	//	ラ	ﾗ
			0x30EA:	"\uFF98",	//	リ	ﾘ
			0x30EB:	"\uFF99",	//	ル	ﾙ
			0x30EC:	"\uFF9A",	//	レ	ﾚ
			0x30ED:	"\uFF9B",	//	ロ	ﾛ
			0x30EE:	"\uFF9C",	//	ヮ	ﾜ
			0x30EF:	"\uFF9C",	//	ワ	ﾜ
			0x30F0:	"\uFF72",	//	ヰ	ｲ
			0x30F1:	"\uFF74",	//	ヱ	ｴ
			0x30F2:	"\uFF66",	//	ヲ	ｦ
			0x30F3:	"\uFF9D",	//	ン	ﾝ
			0x30F4:	"\uFF73\uFF9E",	//	ヴ	ｳﾞ
			0x30F5:	"\uFF76",	//	ヵ	ｶ
			0x30F6:	"\uFF79",	//	ヶ	ｹ
			0x30F7:	"\uFF9C\uFF9E",	//	ヷ	ﾜﾞ
			0x30F8:	"\uFF72\uFF9E",	//	ヸ	ｲﾞ
			0x30F9:	"\uFF74\uFF9E",	//	ヹ	ｴﾞ
			0x30FA:	"\uFF66\uFF9E",	//	ヺ	ｦﾞ
			0x30FB:	"\uFF65",	//	・	･
			0x30FC:	"\uFF70"		//	ー	ｰ
		};
		/**
		 * @param {string} ch
		 */
		const func = function (ch) {
			if (ch.length === 1) {
				return map[ch.charCodeAt(0)];
			} else {
				return map[ch.charCodeAt(0)] + map[ch.charCodeAt(1)];
			}
		};
		return text.replace(/[\u3001\u3002\u300C\u300D\u309B\u309C\u30A1-\u30FC][\u309B\u309C]?/g, func);
	}

	/**
	 * カタカナを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthKana(text) {
		/**
		 * @type {Record<number, number>}
		 */
		// prettier-ignore
		const map = {
			0xFF61:	0x3002,	//	。	｡
			0xFF62:	0x300C,	//	「	｢
			0xFF63:	0x300D,	//	」	｣
			0xFF64:	0x3001,	//	､
			0xFF65:	0x30FB,	//	・	･
			0xFF66:	0x30F2,	//	ヲ	ｦ
			0xFF67:	0x30A1,	//	ァ	ｧ
			0xFF68:	0x30A3,	//	ィ	ｨ
			0xFF69:	0x30A5,	//	ゥ	ｩ
			0xFF6A:	0x30A7,	//	ェ	ｪ
			0xFF6B:	0x30A9,	//	ォ	ｫ
			0xFF6C:	0x30E3,	//	ャ	ｬ
			0xFF6D:	0x30E5,	//	ュ	ｭ
			0xFF6E:	0x30E7,	//	ョ	ｮ
			0xFF6F:	0x30C3,	//	ッ	ｯ
			0xFF70:	0x30FC,	//	ー	ｰ
			0xFF71:	0x30A2,	//	ア	ｱ
			0xFF72:	0x30A4,	//	イ	ｲ
			0xFF73:	0x30A6,	//	ウ	ｳ
			0xFF74:	0x30A8,	//	エ	ｴ
			0xFF75:	0x30AA,	//	オ	ｵ
			0xFF76:	0x30AB,	//	カ	ｶ
			0xFF77:	0x30AD,	//	キ	ｷ
			0xFF78:	0x30AF,	//	ク	ｸ
			0xFF79:	0x30B1,	//	ケ	ｹ
			0xFF7A:	0x30B3,	//	コ	ｺ
			0xFF7B:	0x30B5,	//	サ	ｻ
			0xFF7C:	0x30B7,	//	シ	ｼ
			0xFF7D:	0x30B9,	//	ス	ｽ
			0xFF7E:	0x30BB,	//	セ	ｾ
			0xFF7F:	0x30BD,	//	ソ	ｿ
			0xFF80:	0x30BF,	//	タ	ﾀ
			0xFF81:	0x30C1,	//	チ	ﾁ
			0xFF82:	0x30C4,	//	ツ	ﾂ
			0xFF83:	0x30C6,	//	テ	ﾃ
			0xFF84:	0x30C8,	//	ト	ﾄ
			0xFF85:	0x30CA,	//	ナ	ﾅ
			0xFF86:	0x30CB,	//	ニ	ﾆ
			0xFF87:	0x30CC,	//	ヌ	ﾇ
			0xFF88:	0x30CD,	//	ネ	ﾈ
			0xFF89:	0x30CE,	//	ノ	ﾉ
			0xFF8A:	0x30CF,	//	ハ	ﾊ
			0xFF8B:	0x30D2,	//	ヒ	ﾋ
			0xFF8C:	0x30D5,	//	フ	ﾌ
			0xFF8D:	0x30D8,	//	ヘ	ﾍ
			0xFF8E:	0x30DB,	//	ホ	ﾎ
			0xFF8F:	0x30DE,	//	マ	ﾏ
			0xFF90:	0x30DF,	//	ミ	ﾐ
			0xFF91:	0x30E0,	//	ム	ﾑ
			0xFF92:	0x30E1,	//	メ	ﾒ
			0xFF93:	0x30E2,	//	モ	ﾓ
			0xFF94:	0x30E4,	//	ヤ	ﾔ
			0xFF95:	0x30E6,	//	ユ	ﾕ
			0xFF96:	0x30E8,	//	ヨ	ﾖ
			0xFF97:	0x30E9,	//	ラ	ﾗ
			0xFF98:	0x30EA,	//	リ	ﾘ
			0xFF99:	0x30EB,	//	ル	ﾙ
			0xFF9A:	0x30EC,	//	レ	ﾚ
			0xFF9B:	0x30ED,	//	ロ	ﾛ
			0xFF9C:	0x30EF,	//	ワ	ﾜ
			0xFF9D:	0x30F3,	//	ン	ﾝ
			0xFF9E:	0x309B,	//	゛	ﾞ
			0xFF9F:	0x309C		//	゜	ﾟ
		};
		/**
		 * @param {string} str
		 */
		const func = function (str) {
			if (str.length === 1) {
				return String.fromCharCode(map[str.charCodeAt(0)]);
			} else {
				const next = str.charCodeAt(1);
				const ch = str.charCodeAt(0);
				if (next === 0xFF9E) {
					// Shift-JISにない濁点（ヷ、ヸ、ヹ、ヺ）は意図的に無視
					if (ch === 0xFF73) {
						// ヴ
						return String.fromCharCode(0x3094);
					} else if ((0xFF76 <= ch && ch <= 0xFF84) || (0xFF8A <= ch && ch <= 0xFF8E)) {
						// ガ-ド、バ-ボ
						return String.fromCharCode(map[ch] + 1);
					}
				} else if (next === 0xFF9F) {
					// 半濁点
					if (0xFF8A <= ch && ch <= 0xFF8E) {
					// パ-ポ
						return String.fromCharCode(map[ch] + 2);
					}
				}
				return String.fromCharCode(map[ch]) + String.fromCharCode(map[next]);
			}
		};
		return text.replace(/[\uFF61-\uFF9F][\uFF9E\uFF9F]?/g, func);
	}

	/**
	 * 半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidth(text) {
		return Japanese.toHalfWidthKana(Japanese.toHalfWidthAsciiCode(text));
	}

	/**
	 * 全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidth(text) {
		return Japanese.toFullWidthKana(Japanese.toFullWidthAsciiCode(text));
	}

	/**
	 * 指定したコードポイントの横幅を推定して取得します
	 * - 0幅 ... グラフェムを構成する要素
	 *           （結合文字, 異体字セレクタ, スキントーン修飾子,
	 *            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
	 * - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
	 * - 2幅 ... 上記以外
	 * @param {number} cp1 調査するコードポイント
	 * @param {number} [cp2] 調査するコードポイント
	 * @returns {number} 文字の横幅
	 */
	static getWidthFromCodePoint(cp1, cp2) {
		if (cp2 !== undefined) {
			if (Unicode.isRegionalIndicatorContinuation(cp1, cp2)) {
				return 2;
			}
		}
		if (Unicode.isGraphemeComponentFromCodePoint(cp1) || Unicode.isZeroWidthCharacterFromCodePoint(cp1)) {
			return 0;
			// prettier-ignore
		} else if (cp1 < 0x80 || (0xFF61 <= cp1 && cp1 < 0xFFA0) || Unicode.isRegionalIndicatorFromCodePoint(cp1)) {
			return 1;
		} else {
			return 2;
		}
	}

	/**
	 * 指定したテキストの横幅を半角／全角でカウント
	 * - 0幅 ... グラフェムを構成する要素
	 *           （結合文字, 異体字セレクタ, スキントーン修飾子,
	 *            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
	 * - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
	 * - 2幅 ... 上記以外
	 * @param {string} text - カウントしたいテキスト
	 * @returns {number} 文字の横幅
	 */
	static getWidth(text) {
		const utf32_array = Unicode.toUTF32Array(text);
		let count = 0;
		let isZWJ = false;
		for (let i = 0; i < utf32_array.length; i++) {
			const cp = utf32_array[i];
			// 国旗 (Regional Indicator)
			if (i < utf32_array.length - 1) {
				const next = utf32_array[i + 1];
				if (Unicode.isRegionalIndicatorContinuation(cp, next)) {
					if (!isZWJ) {
						count += Japanese.getWidthFromCodePoint(cp, next);
					}
					i++;
					isZWJ = false;
					continue;
				}
			}
			if (!isZWJ) {
				count += Japanese.getWidthFromCodePoint(cp);
			}
			// prettier-ignore
			isZWJ = cp === 0x200D;
		}
		return count;
	}

	/**
	 * 文字幅を考慮して文字列を文字の配列に変換する
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[][]} UTF32(コードポイント)の配列が入った配列
	 */
	static toMojiArrayFromString(text) {
		const utf32_array = Unicode.toUTF32Array(text);

		/** @type {number[][]} */
		const moji_array = [];

		/** @type {number[]} */
		let moji = [];

		let isZWJ = false;

		for (let i = 0; i < utf32_array.length; i++) {
			const cp = utf32_array[i];

			// --- 国旗 (Regional Indicator) は2つで1グラフェム ---
			if (i < utf32_array.length - 1) {
				const next = utf32_array[i + 1];
				if (Unicode.isRegionalIndicatorContinuation(cp, next)) {
				// 前のグラフェムを確定
					if (moji.length > 0) {
						moji_array.push(moji);
					}
					// RIペアで新しいグラフェムを作る
					moji = [cp, next];

					moji_array.push(moji);
					moji = []; // 次のグラフェムに備える

					i++;       // 2つ目のRIを消費
					isZWJ = false;
					continue;
				}
			}

			// --- 新しいグラフェム開始判定 ---
			// 「ZWJ直後」または「グラフェム構成要素」は前に結合させる
			const isComponent = Unicode.isGraphemeComponentFromCodePoint(cp);

			if (!isZWJ && !isComponent) {
			// ベース文字が来たので、前のグラフェムを確定して新しく開始
				if (moji.length > 0) {
					moji_array.push(moji);
				}
				moji = [];
			}

			moji.push(cp);

			// 次ループ用：ZWJ は次の文字とグラフェムを結合するため、新しい境界を作らないフラグを立てる
			isZWJ = (cp === 0x200D);
		}

		// 末尾が残っていれば追加
		if (moji.length > 0) {
			moji_array.push(moji);
		}

		return moji_array;
	}

	/**
	 * 結合した文字を考慮して文字の配列を文字列に変換する
	 * @param {number[][]} mojiarray - UTF32(コードポイント)の配列が入った配列
	 * @returns {string} UTF32(コードポイント)の配列が入った配列
	 */
	static toStringFromMojiArray(mojiarray) {
		/**
		 * @type {number[]}
		 */
		const utf32 = [];
		for (let i = 0; i < mojiarray.length; i++) {
			for (let j = 0; j < mojiarray[i].length; j++) {
				utf32.push(mojiarray[i][j]);
			}
		}
		return Unicode.fromUTF32Array(utf32);
	}

	/**
	 * 指定したテキストの横幅を半角／全角で換算した場合の切り出し
	 * - 0幅 ... グラフェムを構成する要素
	 *           （結合文字, 異体字セレクタ, スキントーン修飾子,
	 *            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
	 * - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
	 * - 2幅 ... 上記以外
	 * @param {string} text - 切り出したいテキスト
	 * @param {number} offset - 切り出し位置
	 * @param {number} size - 切り出す長さ
	 * @returns {string} 切り出したテキスト
	 * @ignore
	 */
	static cutTextForWidth(text, offset, size) {
		const moji_array = Japanese.toMojiArrayFromString(text);
		const SPACE = [0x20]; // ' '
		/**
		 * @type {number[][]}
		 */
		const output = [];
		let is_target = false;
		let position = 0;
		let cut_size = size;
		if (offset < 0) {
			cut_size += offset;
			offset = 0;
		}
		if (cut_size <= 0) {
			return "";
		}
		for (let i = 0; i < moji_array.length; i++) {
			// 文字データ
			const moji = moji_array[i];
			// 1文字目の横幅を取得
			const cp = moji[0];
			// ASCII文字, 半角カタカナ, Regional Indicator（単体）
			// prettier-ignore
			const cp_size = cp < 0x80
				|| (0xFF61 <= cp && cp < 0xFFA0)
				|| (moji.length === 1 && Unicode.isRegionalIndicatorFromCodePoint(cp)) ? 1 : 2;
			if (position >= offset) {
				is_target = true;
				if (cut_size >= cp_size) {
					output.push(moji);
				} else {
					output.push(SPACE);
				}
				cut_size -= cp_size;
				if (cut_size <= 0) {
					break;
				}
			}
			position += cp_size;
			// 2バイト文字の途中をoffset指定していた場合になる。
			if (position - 1 >= offset && !is_target) {
				cut_size--;
				output.push(SPACE);
			}
		}
		return Japanese.toStringFromMojiArray(output);
	}
}

/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */


/**
 * 文字のエンコード情報
 * @typedef {Object} MojiEncodeData
 * @property {MenKuTen} kuten 区点 コード
 * @property {number} cp932_code CP932(Windows-31J) コード
 * @property {number[]} utf8_array UTF-8 配列
 * @property {number[]} utf16_array UTF-16 配列
 * @property {number[]} utf32_array UTF-32 配列
 * @property {number[]} cp932_array CP932(Windows-31J) バイト配列
 * @property {number[]} shift_jis_array Shift_JIS バイト配列
 * @property {number[]} iso2022jp_array ISO-2022-JP バイト配列
 */

/**
 * 文字の種別情報
 * @typedef {Object} MojiTypeData
 * @property {boolean} is_regular_sjis Shift_JIS に登録された文字
 * @property {boolean} is_gaiji_cp932 Windows-31J(CP932) 外字
 * @property {boolean} is_IBM_extended_character Windows-31J(CP932) IBM拡張文字
 * @property {boolean} is_NEC_selection_IBM_extended_character Windows-31J(CP932) NEC選定IBM拡張文字
 * @property {boolean} is_NEC_special_character Windows-31J(CP932) NEC特殊文字
 * @property {number} kanji_suijun Shift_JIS-2004 を使用して漢字の水準調査(計算不可の場合 0)
 * @property {boolean} is_surrogate_pair 要 Unicode サロゲートペア
 * @property {string|null} control_name 制御文字名（制御文字ではない場合は null）
 * @property {boolean} is_control_character 制御文字
 * @property {string} blockname Unicodeブロック名
 * @property {boolean} is_kanji 漢字
 * @property {boolean} is_hiragana ひらがな
 * @property {boolean} is_katakana カタカナ
 * @property {boolean} is_fullwidth_ascii 全角ASCII
 * @property {boolean} is_halfwidth_katakana 半角カタカナ
 * @property {boolean} is_emoji 絵文字(絵文字表示されることが多い Unicode ブロックに属する文字)
 * @property {boolean} is_emoticons 顔文字(Emoticons ブロックに属する文字)
 * @property {boolean} is_symbol_base 記号(テキスト記号の定義だがVS16が続くと絵文字に切り替えが発生)
 * @property {boolean} is_gaiji 外字
 * @property {boolean} is_grapheme_component グラフェムを構成するための文字
 * @property {boolean} is_zero_width_character ゼロ幅文字
 * @property {boolean} is_combining_mark 結合文字
 * @property {boolean} is_variation_selector 異体字セレクタ
 * @property {boolean} is_skin_tone_modifier スキントーン修飾子
 * @property {boolean} is_tag_character タグ文字
 * @property {boolean} is_regional_indicator 国旗絵文字を構成するための Regional Indicator 文字（2文字で1つの国旗になる）
 */

/**
 * 文字の種別情報
 * @typedef {Object} MojiData
 * @property {MojiEncodeData} encode 文字のエンコード情報
 * @property {MojiTypeData} type 文字の種別情報
 * @property {string} character 解析した文字
 * @property {number} codepoint 解析した文字のコードポイント
 */

/**
 * 文字の解析用クラス
 * @ignore
 */
class MojiAnalyzer {
	/**
	 * 初期化
	 * @returns {MojiData}
	 * @ignore
	 */
	static _createMojiData() {
		/**
		 * @type {MojiEncodeData}
		 */
		const encode = {
			kuten: null,
			cp932_code: 0,
			utf8_array: [],
			utf16_array: [],
			utf32_array: [],
			cp932_array: [],
			shift_jis_array: [],
			iso2022jp_array: []
		};

		/**
		 * @type {MojiTypeData}
		 */
		const type = {
			is_regular_sjis: false,
			is_gaiji_cp932: false,
			is_IBM_extended_character: false,
			is_NEC_selection_IBM_extended_character: false,
			is_NEC_special_character: false,
			kanji_suijun: 0,
			is_surrogate_pair: false,
			control_name: null,
			is_control_character: false,
			blockname: "",
			is_kanji: false,
			is_hiragana: false,
			is_katakana: false,
			is_fullwidth_ascii: false,
			is_halfwidth_katakana: false,
			is_emoji: false,
			is_emoticons: false,
			is_symbol_base: false,
			is_gaiji: false,
			is_grapheme_component: false,
			is_zero_width_character: false,
			is_combining_mark: false,
			is_variation_selector: false,
			is_skin_tone_modifier: false,
			is_tag_character: false,
			is_regional_indicator: false
		};

		/**
		 * @type {MojiData}
		 */
		const data = {
			encode: encode,
			type: type,
			character: null,
			codepoint: 0
		};

		return data;
	}

	/**
	 * 指定した1つのUTF-32 コードポイントに関して、解析を行い情報を返します
	 * @param {number} unicode_codepoint - UTF-32 のコードポイント
	 * @returns {MojiData} 文字の情報がつまったオブジェクト
	 */
	static getMojiData(unicode_codepoint) {
		// 基本情報取得
		const cp932code = CP932.toCP932FromUnicode(unicode_codepoint);
		const kuten = SJIS.toKuTenFromSJISCode(cp932code);
		const is_regular_sjis = cp932code < 0x100 || SJIS.isRegularMenKuten(kuten);

		/**
		 * 出力データの箱を用意
		 * @type {MojiData}
		 */
		const data = MojiAnalyzer._createMojiData();
		const encode = data.encode;
		const type = data.type;
		const character = Unicode.fromCodePoint(unicode_codepoint);
		data.character = character;
		data.codepoint = unicode_codepoint;

		// 句点と面区点情報(ない場合はnullになる)
		encode.kuten = kuten;
		// コードの代入
		encode.cp932_code = cp932code ? cp932code : -1;

		// Shift_JIS として許容されるか
		type.is_regular_sjis = is_regular_sjis;

		// Windows-31J(CP932) に関しての調査
		// 外字, IBM拡張文字, NEC選定IBM拡張文字, NEC特殊文字
		// prettier-ignore
		type.is_gaiji_cp932 = cp932code ? 0xF040 <= cp932code && cp932code <= 0xF9FC : false;
		// prettier-ignore
		type.is_IBM_extended_character = cp932code ? 0xFA40 <= cp932code && cp932code <= 0xFC4B : false;
		// prettier-ignore
		type.is_NEC_selection_IBM_extended_character = cp932code ? 0xED40 <= cp932code && cp932code <= 0xEEFC : false;
		// prettier-ignore
		type.is_NEC_special_character = cp932code ? 0x8740 <= cp932code && cp932code <= 0x879C : false;

		// Unicodeの配列
		encode.utf8_array = Unicode.toUTF8Array(data.character);
		encode.utf16_array = Unicode.toUTF16Array(data.character);
		encode.utf32_array = [unicode_codepoint];
		type.is_surrogate_pair = encode.utf16_array.length > 1;

		// SJIS系の配列
		// prettier-ignore
		encode.cp932_array = cp932code ? (cp932code >= 0x100 ? [cp932code >> 8, cp932code & 0xFF] : [cp932code]) : [];

		// ISO-2022-JP , EUC-JP
		// prettier-ignore
		if (cp932code < 0xE0 || is_regular_sjis) {
			// prettier-ignore
			if (cp932code < 0x80) {
				encode.shift_jis_array = [cp932code];
				encode.iso2022jp_array = [];
				// prettier-ignore
			} else if (cp932code < 0xE0) {
				// 半角カタカナの扱い
				encode.shift_jis_array = [cp932code];
				encode.iso2022jp_array = [];
			} else if (kuten.ku <= 94) {
				// 区点は94まで利用できる。
				// つまり、最大でも 94 + 0xA0 = 0xFE となり 0xFF 以上にならない
				encode.shift_jis_array = [encode.cp932_array[0], encode.cp932_array[1]];
				encode.iso2022jp_array = [kuten.ku + 0x20, kuten.ten + 0x20];
			}
		} else {
			encode.shift_jis_array = [];
			encode.iso2022jp_array = [];
		}
		// SJISとして正規でなければ強制エンコード失敗
		if (!is_regular_sjis) {
			encode.shift_jis_array = [];
			encode.iso2022jp_array = [];
		}

		// 制御文字かどうか
		type.control_name = Unicode.toControlCharcterName(unicode_codepoint);
		type.is_control_character = type.control_name ? true : false;

		// Unicodeのブロック名
		type.blockname = Unicode.toBlockNameFromUnicode(unicode_codepoint);
		// ブロック名から判断
		type.is_kanji = /Ideographs/.test(type.blockname);
		type.is_hiragana = /Hiragana/.test(type.blockname);
		type.is_katakana = /Katakana/.test(type.blockname);
		type.is_fullwidth_ascii = /[\u3000\uFF01-\uFF5E]/.test(data.character);
		type.is_halfwidth_katakana = /[\uFF61-\uFF9F]/.test(data.character);
		// 絵文字
		type.is_emoji = /Pictographs|Transport and Map Symbols/.test(type.blockname);
		// 顔文字
		type.is_emoticons = /Emoticons/.test(type.blockname);
		// 記号(VS16 が付くと絵文字化)
		type.is_symbol_base = /Dingbats|Miscellaneous Symbols/.test(type.blockname);
		// 外字
		type.is_gaiji = /Private Use Area/.test(type.blockname);
		// グラフェムを構成するための文字
		type.is_grapheme_component = Unicode.isGraphemeComponentFromCodePoint(unicode_codepoint);
		// 横幅が 0 の文字
		type.is_zero_width_character = Unicode.isZeroWidthCharacterFromCodePoint(unicode_codepoint);
		// 結合文字
		type.is_combining_mark = Unicode.isCombiningMarkFromCodePoint(unicode_codepoint);
		// 異体字セレクタ
		type.is_variation_selector = Unicode.isVariationSelectorFromCodePoint(unicode_codepoint);
		// スキントーン修飾子
		type.is_skin_tone_modifier = Unicode.isEmojiModifierFromCodePoint(unicode_codepoint);
		// タグ文字
		type.is_tag_character = Unicode.isTagCharacterFromCodePoint(unicode_codepoint);
		// 国旗絵文字を構成するためのRI文字
		type.is_regional_indicator = Unicode.isRegionalIndicatorFromCodePoint(unicode_codepoint);

		return data;
	}
}

/**
 * The script is part of Mojix for TextInputGuard.
 *
 * AUTHOR:
 *  natade-jp (https://github.com/natade-jp)
 *
 * LICENSE:
 *  The MIT license https://opensource.org/licenses/MIT
 */


/**
 * 日本語を扱うための様々な機能を提供します
 */
class Mojix {
	// ---------------------------------
	// 文字列のエンコードとデコードを扱う関数
	// ---------------------------------

	/**
	 * 文字列からバイナリ配列にエンコードする
	 * @param {string} text - 変換したいテキスト
	 * @param {string} charset - キャラセット(UTF-8/16/32,Shift_JIS,Windows-31J)
	 * @param {boolean} [is_with_bom=false] - BOMをつけるかどうか
	 * @returns {number[]} バイナリ配列(失敗時はnull)
	 */
	static encode(text, charset, is_with_bom) {
		return Encode.encode(text, charset, is_with_bom);
	}

	/**
	 * バイナリ配列から文字列にデコードする
	 * @param {number[]} binary - 変換したいバイナリ配列
	 * @param {string} [charset="autodetect"] - キャラセット(UTF-8/16/32,Shift_JIS,Windows-31J)
	 * @returns {string} 変換した文字列（失敗したらnull）
	 */
	static decode(binary, charset) {
		return Encode.decode(binary, charset);
	}

	// ---------------------------------
	// Unicode を扱う関数群
	// ---------------------------------

	/**
	 * サロゲートペア対応のコードポイント取得
	 * @param {string} text - 対象テキスト
	 * @param {number} [index = 0] - インデックス
	 * @returns {number} コードポイント
	 */
	static codePointAt(text, index) {
		return Unicode.codePointAt(text, index);
	}

	/**
	 * コードポイントの数値データを文字列に変換
	 * @param {...(number|number[])} codepoint - 変換したいコードポイントの数値配列、又は数値を並べた可変引数
	 * @returns {string} 変換後のテキスト
	 */
	static fromCodePoint(codepoint) {
		if (Array.isArray(codepoint)) {
			return Unicode.fromCodePoint(codepoint);
		} else {
			const codepoint_array = [];
			for (let i = 0; i < arguments.length; i++) {
				codepoint_array[i] = arguments[i];
			}
			return Unicode.fromCodePoint(codepoint_array);
		}
	}

	/**
	 * コードポイント換算で文字列数をカウント
	 * @param {string} text - 対象テキスト
	 * @param {number} [beginIndex=0] - 最初のインデックス（省略可）
	 * @param {number} [endIndex] - 最後のインデックス（ここは含めない）（省略可）
	 * @returns {number} 文字数
	 */
	static codePointCount(text, beginIndex, endIndex) {
		return Unicode.codePointCount(text, beginIndex, endIndex);
	}

	/**
	 * 文字列をUTF32(コードポイント)の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF32(コードポイント)のデータが入った配列
	 */
	static toUTF32Array(text) {
		return Unicode.toUTF32Array(text);
	}

	/**
	 * UTF32の配列から文字列に変換
	 * @param {number[]} utf32 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF32Array(utf32) {
		return Unicode.fromUTF32Array(utf32);
	}

	/**
	 * 文字列をUTF16の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF16のデータが入った配列
	 */
	static toUTF16Array(text) {
		return Unicode.toUTF16Array(text);
	}

	/**
	 * UTF16の配列から文字列に変換
	 * @param {number[]} utf16 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF16Array(utf16) {
		return Unicode.fromUTF16Array(utf16);
	}

	/**
	 * 文字列をUTF8の配列に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[]} UTF8のデータが入った配列
	 */
	static toUTF8Array(text) {
		return Unicode.toUTF8Array(text);
	}

	/**
	 * UTF8の配列から文字列に変換
	 * @param {number[]} utf8 - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static fromUTF8Array(utf8) {
		return Unicode.fromUTF8Array(utf8);
	}

	// ---------------------------------
	// 文字を扱う関数群
	// ---------------------------------

	/**
	 * 結合した文字を考慮して文字列を文字の配列に変換する
	 * @param {string} text - 変換したいテキスト
	 * @returns {number[][]} UTF32(コードポイント)の配列が入った配列
	 */
	static toMojiArrayFromString(text) {
		return Japanese.toMojiArrayFromString(text);
	}

	/**
	 * 結合した文字を考慮して文字の配列を文字列に変換する
	 * @param {number[][]} mojiarray - UTF32(コードポイント)の配列が入った配列
	 * @returns {string} UTF32(コードポイント)の配列が入った配列
	 */
	static toStringFromMojiArray(mojiarray) {
		return Japanese.toStringFromMojiArray(mojiarray);
	}

	// ---------------------------------
	// 切り出しを扱う関数群
	// ---------------------------------

	/**
	 * 指定したテキストを切り出す
	 * - 単位はコードポイントの文字数
	 * - 結合文字, 異体字セレクタ, スキントーン修飾子, タグ文字を考慮しません
	 * @param {string} text - 切り出したいテキスト
	 * @param {number} offset - 切り出し位置
	 * @param {number} size - 切り出す長さ
	 * @returns {string} 切り出したテキスト
	 */
	static cutTextForCodePoint(text, offset, size) {
		return Unicode.cutTextForCodePoint(text, offset, size);
	}

	/**
	 * 指定したテキストの横幅を半角／全角でカウント
	 * - 0幅 ... グラフェムを構成する要素
	 *           （結合文字, 異体字セレクタ, スキントーン修飾子,
	 *            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
	 * - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
	 * - 2幅 ... 上記以外
	 * @param {string} text - カウントしたいテキスト
	 * @returns {number} 文字の横幅
	 */
	static getWidth(text) {
		return Japanese.getWidth(text);
	}

	/**
	 * 指定したテキストを切り出す
	 * - 0幅 ... グラフェムを構成する要素
	 *           （結合文字, 異体字セレクタ, スキントーン修飾子,
	 *            Tag Sequence 構成文字, ZWSP, ZWNJ, ZWJ, WJ）
	 * - 1幅 ... ASCII文字, 半角カタカナ, Regional Indicator（単体）
	 * - 2幅 ... 上記以外
	 * @param {string} text - 切り出したいテキスト
	 * @param {number} offset - 切り出し位置
	 * @param {number} size - 切り出す長さ
	 * @returns {string} 切り出したテキスト
	 */
	static cutTextForWidth(text, offset, size) {
		return Japanese.cutTextForWidth(text, offset, size);
	}

	// ---------------------------------
	// 面区点コードの変換用
	// ---------------------------------

	/**
	 * 指定した文字から Windows-31J 上の区点番号に変換
	 * - 2文字以上を指定した場合は、1文字目のみを変換する
	 * @param {string} text - 変換したいテキスト
	 * @returns {MenKuTen} 区点番号(存在しない場合（1バイトのJISコードなど）はnullを返す)
	 */
	static toKuTen(text) {
		return CP932.toKuTen(text);
	}

	// ---------------------------------
	// 日本語の変換用の関数群
	// ---------------------------------

	/**
	 * カタカナをひらがなに変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHiragana(text) {
		return Japanese.toHiragana(text);
	}

	/**
	 * ひらがなをカタカナに変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toKatakana(text) {
		return Japanese.toKatakana(text);
	}

	/**
	 * スペースを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthSpace(text) {
		return Japanese.toHalfWidthSpace(text);
	}

	/**
	 * スペースを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthSpace(text) {
		return Japanese.toFullWidthSpace(text);
	}

	/**
	 * 英数記号を半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthAsciiCode(text) {
		return Japanese.toHalfWidthAsciiCode(text);
	}

	/**
	 * 英数記号を全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthAsciiCode(text) {
		return Japanese.toFullWidthAsciiCode(text);
	}

	/**
	 * アルファベットを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthAlphabet(text) {
		return Japanese.toHalfWidthAlphabet(text);
	}

	/**
	 * アルファベットを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthAlphabet(text) {
		return Japanese.toFullWidthAlphabet(text);
	}

	/**
	 * 数値を半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthNumber(text) {
		return Japanese.toHalfWidthNumber(text);
	}

	/**
	 * 数値を全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthNumber(text) {
		return Japanese.toFullWidthNumber(text);
	}

	/**
	 * カタカナを半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidthKana(text) {
		return Japanese.toHalfWidthKana(text);
	}

	/**
	 * カタカナを全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidthKana(text) {
		return Japanese.toFullWidthKana(text);
	}

	/**
	 * 半角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toHalfWidth(text) {
		return Japanese.toHalfWidth(text);
	}

	/**
	 * 全角に変換
	 * @param {string} text - 変換したいテキスト
	 * @returns {string} 変換後のテキスト
	 */
	static toFullWidth(text) {
		return Japanese.toFullWidth(text);
	}

	// ---------------------------------
	// 1つの文字データに対して調査を行う
	// ---------------------------------

	/**
	 * 指定した1つのUTF-32 コードポイントに関して、解析を行い情報を返します
	 * @param {number} unicode_codepoint - UTF-32 のコードポイント
	 * @returns {MojiData} 文字の情報がつまったオブジェクト
	 */
	static getMojiData(unicode_codepoint) {
		return MojiAnalyzer.getMojiData(unicode_codepoint);
	}
}

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
 * kana ルールのオプション
 * @typedef {Object} KanaRuleOptions
 * @property {"katakana-full"|"katakana-half"|"hiragana"} [target="katakana-full"] - 統一先
 * @property {boolean} [nfkc=true] - 事前に Unicode NFKC 正規化を行う（合体文字などを正規化）
 */

/**
 * kana ルールを生成する
 * @param {KanaRuleOptions} [options]
 * @returns {Rule}
 */
function kana(options = {}) {
	/** @type {KanaRuleOptions} */
	const opt = {
		target: options.target ?? "katakana-full",
		nfkc: options.nfkc ?? true
	};

	return {
		name: "kana",
		targets: ["input", "textarea"],

		/**
		 * かな種別の正規化（入力中に都度かける）
		 * - (任意) NFKC 正規化
		 * - Mojix で target へ統一（ここは差し替え）
		 * @param {string} value
		 * @param {GuardContext} ctx
		 * @returns {string}
		 */
		normalizeChar(value, ctx) {
			let s = String(value);
			if (opt.nfkc) {
				// 古い環境で normalize が無い可能性もあるので安全に
				try {
					s = s.normalize("NFKC");
				} catch {
					// noop
				}
			}
			s = Mojix.toKatakana(s);
			if (opt.target === "katakana-full") {
				s = Mojix.toFullWidthKana(s);
			} else if (opt.target === "katakana-half") {
				s = Mojix.toHalfWidthKana(s);
			} else {
				s = Mojix.toFullWidthKana(s);
				s = Mojix.toHiragana(s);
			}
			return s;
		}
	};
}

/**
 * datasetから kana ルールを生成する
 * - data-tig-rules-kana が無ければ null
 * - オプションは data-tig-rules-kana-xxx から読む
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-kana               -> dataset.tigRulesKana
 * - data-tig-rules-kana-target        -> dataset.tigRulesKanaTarget
 * - data-tig-rules-kana-nfkc          -> dataset.tigRulesKanaNfkc
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
kana.fromDataset = function fromDataset(dataset, _el) {
	// ON判定
	if (dataset.tigRulesKana == null) {
		return null;
	}

	/** @type {KanaRuleOptions} */
	const options = {};

	const target = parseDatasetEnum(dataset.tigRulesKanaTarget, [
		"katakana-full",
		"katakana-half",
		"hiragana"
	]);
	if (target != null) {
		options.target = target;
	}

	const nfkc = parseDatasetBool(dataset.tigRulesKanaNfkc);
	if (nfkc != null) {
		options.nfkc = nfkc;
	}

	return kana(options);
};

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
 * ascii ルールを生成する
 * - 全角英数字・記号・全角スペースを半角へ正規化する
 * - カナは変換しない
 *
 * @returns {Rule}
 */
function ascii() {
	return {
		name: "ascii",
		targets: ["input", "textarea"],

		/**
		 * 英数字・記号の半角正規化
		 * @param {string} value
		 * @param {GuardContext} ctx
		 * @returns {string}
		 */
		normalizeChar(value, ctx) {
			const s = String(value);
			return Mojix.toHalfWidthAsciiCode(s);
		}
	};
}

/**
 * datasetから ascii ルールを生成する
 *
 * 対応する data 属性
 * - data-tig-rules-ascii
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
ascii.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesAscii == null) {
		return null;
	}
	return ascii();
};

/* eslint-disable max-len */
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
 * filter ルールのカテゴリ名
 *
 * - "digits"         : ASCII 数字 (0-9)
 * - "alpha"          : ASCII 英字 (A-Z, a-z)
 * - "ascii"          : ASCII 可視文字 (U+0020–U+007E)
 * - "hiragana"       : ひらがな (U+3040–U+309F)
 * - "katakana-full"  : 全角カタカナ (U+30A0–U+30FF)
 * - "katakana-half"  : 半角カタカナ (U+FF65–U+FF9F)
 * - "bmp-only"       : BMP のみ許可（U+0000–U+FFFF、補助平面禁止）
 * - "sjis-only"      : 正規 Shift_JIS（JIS X 0208 + 1バイト領域）のみ許可
 * - "cp932-only"     : Windows-31J (CP932) でエンコード可能な文字のみ許可
 * - "single-codepoint-only" : 単一コードポイントのみ許可（結合文字や異体字セレクタを含まない）
 *
 * @typedef {"digits"|"alpha"|"ascii"|"hiragana"|"katakana-full"|"katakana-half"|"bmp-only"|"sjis-only"|"cp932-only"|"single-codepoint-only"} FilterCategory
 */

/**
 * グラフェム（1グラフェムは、UTF-32の配列）
 * @typedef {number[]} Grapheme
 */

/** @type {readonly FilterCategory[]} */
const FILTER_CATEGORIES = [
	"digits",
	"alpha",
	"ascii",
	"hiragana",
	"katakana-full",
	"katakana-half",
	"bmp-only",
	"sjis-only",
	"cp932-only",
	"single-codepoint-only"
];

/**
 * filter ルールの動作モード
 * @typedef {"drop"|"error"} FilterMode
 */

/**
 * filter ルールのオプション
 * - category は和集合で扱う（複数指定OK）
 * - allow は追加許可（和集合）
 * - deny は除外（差集合）
 *
 * allowed = (category の和集合 ∪ allow) − deny
 *
 * @typedef {Object} FilterRuleOptions
 * @property {FilterMode} [mode="drop"] - drop: 不要文字を削除 / error: 削除せずエラーを積む
 * @property {FilterCategory[]} [category] - カテゴリ（配列）
 * @property {RegExp|string} [allow] - 追加で許可する正規表現（1文字にマッチさせる想定）
 * @property {string} [allowFlags] - allow が文字列のときの flags（"iu" など。g/y は無視）
 * @property {RegExp|string} [deny] - 除外する正規表現（1文字にマッチさせる想定）
 * @property {string} [denyFlags] - deny が文字列のときの flags（"iu" など。g/y は無視）
 */

/**
 * /g や /y は lastIndex の罠があるので除去して使う
 * @param {string} flags
 * @returns {string}
 */
const stripStatefulFlags = function (flags) {
	return String(flags || "").replace(/[gy]/g, "");
};

/**
 * 正規表現（RegExp または pattern 文字列）を安全に RegExp 化する
 * - g/y を外す
 * - string の場合、flags 未指定なら "u" を付ける
 *
 * @param {RegExp|string|undefined} reOrPattern
 * @param {string|undefined} flags
 * @returns {RegExp|undefined}
 */
const toSafeRegExp = function (reOrPattern, flags) {
	if (reOrPattern == null) {
		return;
	}

	if (reOrPattern instanceof RegExp) {
		const safeFlags = stripStatefulFlags(reOrPattern.flags);
		return new RegExp(reOrPattern.source, safeFlags);
	}

	const f = stripStatefulFlags(flags ?? "u");
	return new RegExp(String(reOrPattern), f);
};

/**
 * カテゴリ判定関数を作る
 * @param {FilterCategory[]} categories
 * @returns {(g: Grapheme, s: string) => boolean}
 */
const createCategoryTester = function (categories) {
	/** @type {Record<FilterCategory, (g: Grapheme, s: string) => boolean>} */
	const table = {
		digits: (g, s) => {
			return g.length === 1 && g[0] >= 0x30 && g[0] <= 0x39; // '0'..'9'
		},
		alpha: (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			// 'A'..'Z' or 'a'..'z'
			return (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A);
		},
		ascii: (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			return c >= 0x20 && c <= 0x7E;
		},
		hiragana: (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			return c >= 0x3040 && c <= 0x309F;
		},
		"katakana-full": (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			return c >= 0x30A0 && c <= 0x30FF;
		},
		"katakana-half": (g, s) => {
			if (g.length !== 1) { return false; }
			const c = g[0];
			return c >= 0xFF65 && c <= 0xFF9F;
		},
		"bmp-only": (g, s) => {
			// BMPのみ（サロゲートペア禁止）
			return g.every((cp) => cp <= 0xFFFF);
		},
		"sjis-only": (g, s) => {
			// Shift_JIS でエンコードできる文字かどうか
			if (g.length !== 1) { return false; }
			const cp932code = CP932.toCP932FromUnicode(g[0]);
			if (cp932code === undefined) { return false; }
			const kuten = SJIS.toKuTenFromSJISCode(cp932code);
			if (cp932code < 0x100) {
				return true;
			}
			if (!SJIS.isRegularMenKuten(kuten)) { return false; }
			return kuten.ku <= 94;
		},
		"cp932-only": (g, s) => {
			// Windows-31J (cp932) でエンコードできる文字かどうか
			if (g.length !== 1) { return false; }
			return CP932.toCP932FromUnicode(g[0]) !== undefined;
		},
		"single-codepoint-only": (g, s) => {
			// 1グラフェムが単一コードポイントのみで構成されていること
			return g.length === 1;
		}
	};

	// categories は「和集合」なので、該当する tester だけ抜いて使う
	const list = categories.map((c) => table[c]).filter(Boolean);

	if (list.length === 0) {
		return function () {
			return false;
		};
	}

	return function (g, s) {
		for (const test of list) {
			if (test(g, s)) {
				return true;
			}
		}
		return false;
	};
};

/**
 * 1文字が許可されるか判定する関数を作る
 * @param {FilterCategory[]} categoryList
 * @param {(graphem: Grapheme, s: string) => boolean} categoryTest
 * @param {RegExp|undefined} allowRe
 * @param {RegExp|undefined} denyRe
 * @returns {(g: Grapheme, s: string) => boolean}
 */
const createAllowedTester = function (categoryList, categoryTest, allowRe, denyRe) {
	const hasCategory = categoryList.length > 0;
	const hasAllow = allowRe != null;
	const hasDeny = denyRe != null;

	// deny だけの指定は「deny に当たる文字だけ落とす」ルールとして扱う
	const denyOnly = !hasCategory && !hasAllow && hasDeny;

	return function (g, s) {
		if (denyRe && denyRe.test(s)) {
			return false;
		}

		if (denyOnly) {
			return true;
		}

		if (hasCategory && categoryTest(g, s)) {
			return true;
		}
		if (allowRe && allowRe.test(s)) {
			return true;
		}

		return false;
	};
};

/**
 * 文字列を走査して、許可文字のみの文字列と、不正文字の集計を返す
 * @param {string} value
 * @param {(g: Grapheme, s: string) => boolean} isAllowed
 * @param {number} [maxInvalidChars=20]
 * @returns {{ filtered: string, invalidCount: number, invalidChars: string[] }}
 */
const scanByAllowed = function (value, isAllowed, maxInvalidChars = 20) {
	const v = String(value);

	let filtered = "";
	let invalidCount = 0;

	/** @type {Set<string>} */
	const invalidSet = new Set();

	/**
	 * グラフェムの配列
	 * @type {Grapheme[]}
	 */
	const graphemArray = Mojix.toMojiArrayFromString(v);

	// JS の文字列イテレータはコードポイント単位で回るので Array.from は不要
	for (const g of graphemArray) {
		const s = Mojix.toStringFromMojiArray([g]);
		if (isAllowed(g, s)) {
			filtered += s;
		} else {
			invalidCount++;
			if (invalidSet.size < maxInvalidChars) {
				invalidSet.add(s);
			}
		}
	}

	return {
		filtered,
		invalidCount,
		invalidChars: Array.from(invalidSet)
	};
};

/**
 * filter ルールを生成する
 * - mode="drop": 不要文字を落とすだけ
 * - mode="error": 文字は落とさず validate でエラーを積む
 *
 * @param {FilterRuleOptions} [options]
 * @returns {Rule}
 */
function filter(options = {}) {
	/** @type {FilterRuleOptions} */
	const opt = {
		mode: options.mode ?? "drop",
		category: options.category ?? [],
		allow: options.allow,
		allowFlags: options.allowFlags,
		deny: options.deny,
		denyFlags: options.denyFlags
	};

	const categoryList = opt.category;
	const categoryTest = createCategoryTester(categoryList);

	const allowRe = toSafeRegExp(opt.allow, opt.allowFlags);
	const denyRe = toSafeRegExp(opt.deny, opt.denyFlags);

	const isAllowed = createAllowedTester(categoryList, categoryTest, allowRe, denyRe);

	const hasAny = categoryList.length > 0 || allowRe != null || denyRe != null;

	return {
		name: "filter",
		targets: ["input", "textarea"],

		/**
		 * 許可集合で落とす（drop モードのみ）
		 * @param {string} value
		 * @param {GuardContext} ctx
		 * @returns {string}
		 */
		normalizeChar(value, ctx) {
			if (!hasAny) {
				return value;
			}

			// error モードは何も落とさない（全て通す）
			if (opt.mode === "error") {
				return value;
			}

			return scanByAllowed(value, isAllowed).filtered;
		},

		/**
		 * 不正文字が含まれていたらエラーを積む（error モードのみ）
		 * @param {string} value
		 * @param {GuardContext} ctx
		 * @returns {void}
		 */
		validate(value, ctx) {
			if (!hasAny) {
				return;
			}
			if (opt.mode !== "error") {
				return;
			}

			const v = String(value);
			if (v === "") {
				return;
			}

			const r = scanByAllowed(v, isAllowed);
			if (r.invalidCount > 0) {
				ctx.pushError({
					code: "filter.invalid_char",
					rule: "filter",
					phase: "validate",
					detail: {
						count: r.invalidCount,
						chars: r.invalidChars,
						category: categoryList,
						hasAllow: allowRe != null,
						hasDeny: denyRe != null
					}
				});
			}
		}
	};
}

/**
 * datasetから filter ルールを生成する
 * - data-tig-rules-filter が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-filter               -> dataset.tigRulesFilter
 * - data-tig-rules-filter-mode          -> dataset.tigRulesFilterMode ("drop"|"error")
 * - data-tig-rules-filter-category      -> dataset.tigRulesFilterCategory ("a,b,c")
 * - data-tig-rules-filter-allow         -> dataset.tigRulesFilterAllow
 * - data-tig-rules-filter-allow-flags   -> dataset.tigRulesFilterAllowFlags
 * - data-tig-rules-filter-deny          -> dataset.tigRulesFilterDeny
 * - data-tig-rules-filter-deny-flags    -> dataset.tigRulesFilterDenyFlags
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
filter.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesFilter == null) {
		return null;
	}

	/** @type {FilterRuleOptions} */
	const options = {};

	const mode = parseDatasetEnum(dataset.tigRulesFilterMode, ["drop", "error"]);
	if (mode != null) {
		options.mode = mode;
	}

	const category = parseDatasetEnumList(dataset.tigRulesFilterCategory, FILTER_CATEGORIES);
	if (category != null) {
		options.category = category;
	}

	if (dataset.tigRulesFilterAllow != null) {
		const s = String(dataset.tigRulesFilterAllow).trim();
		if (s !== "") {
			options.allow = s;
		}
	}

	if (dataset.tigRulesFilterAllowFlags != null) {
		const s = String(dataset.tigRulesFilterAllowFlags).trim();
		if (s !== "") {
			options.allowFlags = s;
		}
	}

	if (dataset.tigRulesFilterDeny != null) {
		const s = String(dataset.tigRulesFilterDeny).trim();
		if (s !== "") {
			options.deny = s;
		}
	}

	if (dataset.tigRulesFilterDenyFlags != null) {
		const s = String(dataset.tigRulesFilterDenyFlags).trim();
		if (s !== "") {
			options.denyFlags = s;
		}
	}

	return filter(options);
};

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
 * prefix ルールのオプション
 * @typedef {Object} PrefixRuleOptions
 * @property {string} text - 先頭に付ける文字列
 * @property {boolean} [showWhenEmpty=false] - 値が空でも表示するか
 */

/**
 * 先頭装飾（prefix）ルール
 * - 表示用として先頭に文字列を付与する
 * - 手動入力された同文字列は normalizeStructure で除去する
 *
 * @param {PrefixRuleOptions} options
 * @returns {Rule}
 */
function prefix(options) {
	/** @type {PrefixRuleOptions} */
	const opt = {
		text: options?.text ?? "",
		showWhenEmpty: options?.showWhenEmpty ?? false
	};

	return {
		name: "prefix",
		targets: ["input"],

		/**
		 * 手動入力された prefix を除去
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeStructure(value) {
			if (!opt.text) { return value; }

			let s = String(value);

			while (s.startsWith(opt.text)) {
				s = s.slice(opt.text.length);
			}

			return s;
		},

		/**
		 * 表示用整形
		 * @param {string} value
		 * @returns {string}
		 */
		format(value) {
			if (!opt.text) { return value; }

			if (!value) {
				return opt.showWhenEmpty ? opt.text : value;
			}

			return opt.text + value;
		}
	};
}

/**
 * datasetから prefix ルールを生成する
 * - data-tig-rules-prefix が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-prefix                  -> dataset.tigRulesPrefix
 * - data-tig-rules-prefix-text             -> dataset.tigRulesPrefixText
 * - data-tig-rules-prefix-show-when-empty  -> dataset.tigRulesPrefixShowWhenEmpty
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
prefix.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesPrefix == null) {
		return null;
	}

	return prefix({
		text: dataset.tigRulesPrefixText ?? "",
		showWhenEmpty: dataset.tigRulesPrefixShowWhenEmpty === "true"
	});
};

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
 * suffix ルールのオプション
 * @typedef {Object} SuffixRuleOptions
 * @property {string} text - 末尾に付ける文字列
 * @property {boolean} [showWhenEmpty=false] - 値が空でも表示するか
 */

/**
 * 末尾装飾（suffix）ルール
 * - 表示用として末尾に文字列を付与する
 * - 手動入力された同文字列は normalizeStructure で除去する
 *
 * @param {SuffixRuleOptions} options
 * @returns {Rule}
 */
function suffix(options) {
	/** @type {SuffixRuleOptions} */
	const opt = {
		text: options?.text ?? "",
		showWhenEmpty: options?.showWhenEmpty ?? false
	};

	return {
		name: "suffix",
		targets: ["input"],

		/**
		 * 手動入力された suffix を除去
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeStructure(value) {
			if (!opt.text) { return value; }

			let s = String(value);

			while (s.endsWith(opt.text)) {
				s = s.slice(0, -opt.text.length);
			}

			return s;
		},

		/**
		 * 表示用整形
		 * @param {string} value
		 * @returns {string}
		 */
		format(value) {
			if (!opt.text) { return value; }

			if (!value) {
				return opt.showWhenEmpty ? opt.text : value;
			}

			return value + opt.text;
		}
	};
}

/**
 * datasetから suffix ルールを生成する
 * - data-tig-rules-suffix が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-suffix                  -> dataset.tigRulesSuffix
 * - data-tig-rules-suffix-text             -> dataset.tigRulesSuffixText
 * - data-tig-rules-suffix-show-when-empty  -> dataset.tigRulesSuffixShowWhenEmpty
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
suffix.fromDataset = function fromDataset(dataset, _el) {
	if (dataset.tigRulesSuffix == null) {
		return null;
	}

	return suffix({
		text: dataset.tigRulesSuffixText ?? "",
		showWhenEmpty: dataset.tigRulesSuffixShowWhenEmpty === "true"
	});
};

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
 * トリムするルール
 * @returns {Rule}
 */
function trim() {
	return {
		name: "trim",
		targets: ["input", "textarea"],

		/**
		 * 構造正規化
		 *
		 * @param {string} value
		 * @returns {string}
		 */
		normalizeStructure(value) {
			return value.trim();
		}
	};
}

/**
 * datasetから trim ルールを生成する
 * - data-tig-rules-trim が無ければ null
 *
 * 対応する data 属性（dataset 名）
 * - data-tig-rules-trim -> dataset.tigRulesTrim
 *
 * @param {DOMStringMap} dataset
 * @param {HTMLInputElement|HTMLTextAreaElement} _el
 * @returns {Rule|null}
 */
trim.fromDataset = function fromDataset(dataset, _el) {
	// ON判定：data-tig-rules-trim が無ければ対象外
	if (dataset.tigRulesTrim == null) {
		return null;
	}
	return trim();
};

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


// ---- autoAttach ----
const auto = new InputGuardAutoAttach(attach, [
	{ name: "numeric", fromDataset: numeric.fromDataset },
	{ name: "digits", fromDataset: digits.fromDataset },
	{ name: "comma", fromDataset: comma.fromDataset },
	{ name: "kana", fromDataset: kana.fromDataset },
	{ name: "ascii", fromDataset: ascii.fromDataset },
	{ name: "filter", fromDataset: filter.fromDataset },
	{ name: "prefix", fromDataset: prefix.fromDataset },
	{ name: "suffix", fromDataset: suffix.fromDataset },
	{ name: "trim", fromDataset: trim.fromDataset }
]);

/**
 * data属性から自動で attach する
 * @param {Document|DocumentFragment|ShadowRoot|Element} [root=document]
 */
const autoAttach = (root) => auto.autoAttach(root);

/**
 * ルール生成関数の名前空間（rules.xxx(...) で使う）
 */
const rules = {
	numeric,
	digits,
	comma,
	kana,
	ascii,
	filter,
	prefix,
	suffix,
	trim
};

/**
 * バージョン（ビルド時に置換したいならここを差し替える）
 * 例: rollup replace で ""0.1.3"" を package.json の version に置換
 */
// @ts-ignore
// eslint-disable-next-line no-undef
const version = "0.1.3" ;

exports.ascii = ascii;
exports.attach = attach;
exports.attachAll = attachAll;
exports.autoAttach = autoAttach;
exports.comma = comma;
exports.digits = digits;
exports.filter = filter;
exports.kana = kana;
exports.numeric = numeric;
exports.prefix = prefix;
exports.rules = rules;
exports.suffix = suffix;
exports.trim = trim;
exports.version = version;
