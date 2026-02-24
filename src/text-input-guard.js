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
 * attach() が返す公開API（利用者が触れる最小インターフェース）
 * @typedef {Object} Guard
 * @property {() => void} detach - ガード解除（イベント削除・swap復元）
 * @property {() => boolean} isValid - 現在エラーが無いかどうか
 * @property {() => TigError[]} getErrors - エラー一覧を取得
 * @property {() => string} getRawValue - 送信用の正規化済み値を取得
 * @property {() => HTMLInputElement|HTMLTextAreaElement} getDisplayElement - ユーザーが実際に操作している要素（swap時はdisplay側）
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
 * swap時に退避する元inputの情報
 * detach時に元の状態へ復元するために使用する
 * @typedef {Object} SwapState
 * @property {string} originalType - 元のinput.type
 * @property {string|null} originalId - 元のid属性
 * @property {string|null} originalName - 元のname属性
 * @property {string} originalClass - 元のclass文字列
 * @property {HTMLInputElement} createdDisplay - 生成した表示用input
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
export function attach(element, options = {}) {
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
export function attachAll(elements, options = {}) {
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

		// 退避（detachで戻すため）
		/** @type {SwapState} */
		this.swapState = {
			originalType: input.type,
			originalId: input.getAttribute("id"),
			originalName: input.getAttribute("name"),
			originalClass: input.className,
			// 必要になったらここに placeholder/aria/data を追加していく
			createdDisplay: null
		};

		// raw化（送信担当）
		input.type = "hidden";
		input.removeAttribute("id"); // displayに引き継ぐため
		input.dataset.tigRole = "raw";

		// 元idのメタを残す（デバッグ/参照用）
		if (this.swapState.originalId) {
			input.dataset.tigOriginalId = this.swapState.originalId;
		}

		if (this.swapState.originalName) {
			input.dataset.tigOriginalName = this.swapState.originalName;
		}

		// display生成（ユーザー入力担当）
		const display = document.createElement("input");
		display.type = "text";
		display.dataset.tigRole = "display";

		// id は display に移す
		if (this.swapState.originalId) {
			display.id = this.swapState.originalId;
		}

		// name は付けない（送信しない）
		display.removeAttribute("name");

		// class は display に
		display.className = this.swapState.originalClass;
		input.className = "";

		// value 初期同期
		display.value = input.value;

		// DOMに挿入（rawの直後）
		input.after(display);

		// elements更新
		this.hostElement = input;
		this.displayElement = display;
		this.rawElement = input;

		this.swapState.createdDisplay = display;

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
		const display = state.createdDisplay;

		// displayが存在するなら、最新表示値をrawに同期してから消す（安全策）
		// ※ rawは常に正規化済みを持つ設計だけど、念のため
		if (display) {
			try {
				raw.value = raw.value || display.value;
			} catch (_e) {
				// ここは落とさない（復元を優先）
			}
		}

		// display削除
		if (display && display.parentNode) {
			display.parentNode.removeChild(display);
		}

		// rawを元に戻す（type）
		raw.type = state.originalType;

		// id を戻す
		if (state.originalId) {
			raw.setAttribute("id", state.originalId);
		} else {
			raw.removeAttribute("id");
		}

		// name を戻す（swap中は残している想定だが、念のため）
		if (state.originalName) {
			raw.setAttribute("name", state.originalName);
		} else {
			raw.removeAttribute("name");
		}

		// class を戻す
		raw.className = state.originalClass ?? "";

		// data属性（tig用）は消しておく
		delete raw.dataset.tigRole;
		delete raw.dataset.tigOriginalId;
		delete raw.dataset.tigOriginalName;

		// elements参照を original に戻す
		this.hostElement = this.originalElement;
		this.displayElement = this.originalElement;
		this.rawElement = null;
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
		// swapState破棄
		this.swapState = null;
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

		if (this.warn) {
			// console.log(`[text-input-guard] reverted: ${req.reason}`, req.detail);
		}
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
		if (this.rawElement) {
			return this.rawElement.value;
		}
		return /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement).value;
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
			getDisplayElement: () => /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement)
		};
	}
}
