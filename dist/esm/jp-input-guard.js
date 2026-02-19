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
 * @typedef {Object} JpigError
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
 * @property {() => JpigError[]} getErrors - エラー一覧を取得
 * @property {() => string} getRawValue - 送信用の正規化済み値を取得
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
 * @property {(e: JpigError) => void} pushError - エラーを登録する関数
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
 * attach() に渡す設定オプション
 * @typedef {Object} AttachOptions
 * @property {Rule[]} [rules] - 適用するルール配列（順番がフェーズ内実行順になる）
 * @property {boolean} [warn] - 非対応ルールなどを console.warn するか
 * @property {string} [invalidClass] - エラー時に付けるclass名
 * @property {{ mode?: "swap"|"off" }} [separateValue] - 表示/内部値分離設定（v0.1はinputのswapのみ対応）
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
			throw new TypeError("[jp-input-guard] attach() expects an <input> or <textarea> element.");
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
		 * @type {JpigError[]}
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
		 * swap時に退避しておく元要素情報
		 * detach時に復元するために使用
		 * @type {SwapState|null}
		 */
		this.swapState = null;
	}

	/**
	 * 初期化処理（swap適用 → パイプライン構築 → イベント登録 → 初回評価）
	 * @returns {void}
	 */
	init() {
		this.applySeparateValue();
		this.buildPipeline();
		this.bindEvents();
		// 初期値を評価
		this.evaluateInput();
	}

	/**
	 * separateValue.mode="swap" のとき、input を hidden(raw) にして display(input[type=text]) を生成する
	 * - textarea は非対応（warnして無視）
	 * @returns {void}
	 */
	applySeparateValue() {
		const mode = this.options.separateValue?.mode ?? "off";
		if (mode !== "swap") {
			return;
		}

		if (this.kind !== "input") {
			warnLog('[jp-input-guard] separateValue.mode="swap" is not supported for <textarea>. ignored.', this.warn);
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
		input.dataset.jpigRole = "raw";

		// display生成（ユーザー入力担当）
		const display = document.createElement("input");
		display.type = "text";
		display.dataset.jpigRole = "display";

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
	}

	/**
	 * ガード解除（イベント解除＋swap復元）
	 * @returns {void}
	 */
	detach() {
		// まずイベント解除（displayElementがswap後の可能性があるので先に外す）
		this.unbindEvents();

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

		// data属性（jpig用）は消しておく
		delete raw.dataset.jpigRole;

		// elements参照を original に戻す
		this.hostElement = this.originalElement;
		this.displayElement = this.originalElement;
		this.rawElement = null;

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
					`[jp-input-guard] Rule "${rule.name}" is not supported for <${this.kind}>. skipped.`,
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
			pushError: (e) => this.errors.push(e)
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
	 * @returns {string}
	 */
	/** @param {string} value */
	runNormalizeChar(value) {
		const ctx = this.createCtx();
		let v = value;
		for (const rule of this.normalizeCharRules) {
			v = rule.normalizeChar ? rule.normalizeChar(v, ctx) : v;
		}
		return v;
	}

	/**
	 * normalize.structure フェーズを実行する（構造の正規化）
	 * @param {string} value
	 * @returns {string}
	 */
	runNormalizeStructure(value) {
		const ctx = this.createCtx();
		let v = value;
		for (const rule of this.normalizeStructureRules) {
			v = rule.normalizeStructure ? rule.normalizeStructure(v, ctx) : v;
		}
		return v;
	}

	/**
	 * validate フェーズを実行する（エラーを積むだけで、値は変えない想定）
	 * @param {string} value
	 * @returns {void}
	 */
	runValidate(value) {
		const ctx = this.createCtx();
		for (const rule of this.validateRules) {
			if (rule.validate) {
				rule.validate(value, ctx);
			}
		}
	}

	/**
	 * fix フェーズを実行する（commit時のみ：切り捨て/四捨五入などの穏やか補正）
	 * @param {string} value
	 * @returns {string}
	 */
	runFix(value) {
		const ctx = this.createCtx();
		let v = value;
		for (const rule of this.fixRules) {
			v = rule.fix ? rule.fix(v, ctx) : v;
		}
		return v;
	}

	/**
	 * format フェーズを実行する（commit時のみ：カンマ付与など表示整形）
	 * @param {string} value
	 * @returns {string}
	 */
	runFormat(value) {
		const ctx = this.createCtx();
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
		this.composing = true;
	}

	/**
	 * IME変換終了：composition中フラグを下ろす
	 * - 直後に input イベントが飛ぶので、ここでは評価しない
	 * @returns {void}
	 */
	onCompositionEnd() {
		this.composing = false;
		// compositionend後にinputイベントが飛ぶので、ここでは触らない
	}

	/**
	 * inputイベント：入力中評価（normalize → validate、表示/raw同期、class更新）
	 * @returns {void}
	 */
	onInput() {
		this.evaluateInput();
	}

	/**
	 * blurイベント：確定時評価（normalize → validate → fix → format、同期、class更新）
	 * @returns {void}
	 */
	onBlur() {
		this.evaluateCommit();
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

		const display = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement);
		const current = display.value;

		let v = current;
		// 固定順
		v = this.runNormalizeChar(v);
		v = this.runNormalizeStructure(v);

		// normalizeで変わったら反映（selection補正は後で）
		if (v !== current) {
			this.syncDisplay(v);
		}

		// validate（入力中：エラー出すだけ）
		this.runValidate(v);

		// rawは常に最新に
		this.syncRaw(v);

		this.applyInvalidClass();
	}

	/**
	 * 確定時（blur）の評価（IME中は何もしない）
	 * - 固定順：normalize.char → normalize.structure → validate → fix → format
	 * @returns {void}
	 */
	evaluateCommit() {
		if (this.composing) {
			return;
		}

		this.clearErrors();

		let v = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (this.displayElement).value;

		v = this.runNormalizeChar(v);
		v = this.runNormalizeStructure(v);

		this.runValidate(v);

		// commitのみ
		v = this.runFix(v);
		v = this.runFormat(v);

		this.syncDisplay(v);
		this.syncRaw(v);

		this.applyInvalidClass();
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
	 * @returns {JpigError[]}
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
			getRawValue: () => this.getRawValue()
		};
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
 * numeric ルールのオプション
 * @typedef {Object} NumericRuleOptions
 * @property {boolean} [allowFullWidth=true] - 全角数字/記号を許可して半角へ正規化する
 * @property {boolean} [allowMinus=false] - マイナス記号を許可する（先頭のみ）
 * @property {boolean} [allowDecimal=false] - 小数点を許可する（1つだけ）
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
		allowDecimal: options.allowDecimal ?? false
	};

	/** @type {Set<string>} */
	const minusLike = new Set([
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
			let out = "";
			for (const ch of String(value)) {
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
		 * @param {string} value
		 * @returns {string}
		 */
		fix(value) {
			const v = String(value);

			if (v === "-" || v === "." || v === "-.") {
				return "";
			}

			if (v.endsWith(".")) {
				return v.slice(0, -1);
			}

			return v;
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


/**
 * ルール生成関数の名前空間（rules.xxx(...) で使う）
 */
const rules = {
	numeric
};

/**
 * バージョン（ビルド時に置換したいならここを差し替える）
 * 例: rollup replace で "__VERSION__" を package.json の version に置換
 */
const version = "0.0.1";

export { attach, numeric, rules, version };
