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

		// autoの場合：format系ルールがあるときだけswap
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
	{ name: "comma", fromDataset: comma.fromDataset }
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
	comma
};

/**
 * バージョン（ビルド時に置換したいならここを差し替える）
 * 例: rollup replace で ""0.1.3"" を package.json の version に置換
 */
// @ts-ignore
// eslint-disable-next-line no-undef
const version = "0.1.3" ;

export { attach, attachAll, autoAttach, comma, digits, numeric, rules, version };
