/**
 * 指定した1要素に対してガードを適用し、Guard API を返す
 * @param {HTMLInputElement|HTMLTextAreaElement} element
 * @param {AttachOptions} [options]
 * @returns {Guard}
 */
declare function attach(element: HTMLInputElement | HTMLTextAreaElement, options?: AttachOptions): Guard;
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
declare function attachAll(elements: Iterable<HTMLInputElement | HTMLTextAreaElement>, options?: AttachOptions): GuardGroup;
type GuardGroup = {
    /**
     * - 全部 detach
     */
    detach: () => void;
    /**
     * - 全部 valid なら true
     */
    isValid: () => boolean;
    /**
     * - 全部のエラーを集約
     */
    getErrors: () => TigError[];
    /**
     * - 個別Guard配列
     */
    getGuards: () => Guard[];
};
/**
 * 対象要素の種別（現在は input と textarea のみ対応）
 */
type ElementKind = "input" | "textarea";
/**
 * ルール実行フェーズ名（パイプラインの固定順）
 * normalize.char → normalize.structure → validate → fix → format
 */
type PhaseName = "normalize.char" | "normalize.structure" | "validate" | "fix" | "format";
/**
 * バリデーションエラー情報を表すオブジェクト
 */
type TigError = {
    /**
     * - エラー識別子（例: "digits.int_overflow"）
     */
    code: string;
    /**
     * - エラーを発生させたルール名
     */
    rule: string;
    /**
     * - 発生したフェーズ
     */
    phase: PhaseName;
    /**
     * - 追加情報（制限値など）
     */
    detail?: any;
};
/**
 * setValue で設定できる値型
 * - number は String に変換して設定する
 * - null/undefined は空文字として扱う
 */
type SetValueInput = string | number | null | undefined;
/**
 * setValue 実行モード
 * - "commit"  確定評価まで実行 normalize→validate→fix→format
 * - "input"   入力中評価のみ実行 normalize→validate
 * - "none"    評価は実行しない 値だけを反映
 *
 * 既定値は "commit"
 */
type SetValueMode = "none" | "input" | "commit";
/**
 * attach() が返す公開API（利用者が触れる最小インターフェース）
 */
type Guard = {
    /**
     * - ガード解除（イベント削除・swap復元）
     */
    detach: () => void;
    /**
     * - 現在エラーが無いかどうか
     */
    isValid: () => boolean;
    /**
     * - エラー一覧を取得
     */
    getErrors: () => TigError[];
    /**
     * - 送信用の正規化済み値を取得
     */
    getRawValue: () => string;
    /**
     * - ユーザーが実際に操作している要素の値を取得
     */
    getDisplayValue: () => string;
    /**
     * - 送信用の正規化済み値の要素
     */
    getRawElement: () => HTMLInputElement | HTMLTextAreaElement;
    /**
     * - ユーザーが実際に操作している要素（swap時はdisplay専用）
     */
    getDisplayElement: () => HTMLInputElement | HTMLTextAreaElement;
    /**
     * 入力中評価を手動実行 normalize→validate
     */
    evaluate: () => void;
    /**
     * 確定評価を手動実行 normalize→validate→fix→format
     */
    commit: () => void;
    setValue: (value: SetValueInput, mode?: SetValueMode) => void;
};
/**
 * 各ルールに渡される実行コンテキスト
 * - DOM参照や状態、エラー登録用関数などをまとめたもの
 */
type GuardContext = {
    /**
     * - 元の要素（swap時はraw側）
     */
    hostElement: HTMLElement;
    /**
     * - ユーザーが操作する表示要素
     */
    displayElement: HTMLElement;
    /**
     * - 送信用hidden要素（swap時のみ）
     */
    rawElement: HTMLInputElement | null;
    /**
     * - 要素種別（input / textarea）
     */
    kind: ElementKind;
    /**
     * - warnログを出すかどうか
     */
    warn: boolean;
    /**
     * - エラー時に付与するclass名
     */
    invalidClass: string;
    /**
     * - IME変換中かどうか
     */
    composing: boolean;
    /**
     * - エラーを登録する関数
     */
    pushError: (e: TigError) => void;
    /**
     * - 入力を直前の受理値へ巻き戻す要求
     */
    requestRevert: (req: RevertRequest) => void;
};
/**
 * 1つの入力制御ルール定義
 * - 各フェーズの処理を必要に応じて実装する
 */
type Rule = {
    /**
     * - ルール名（識別用）
     */
    name: string;
    /**
     * - 適用可能な要素種別
     */
    targets: ("input" | "textarea")[];
    /**
     * - 文字単位の正規化（全角→半角など）
     */
    normalizeChar?: (value: string, ctx: GuardContext) => string;
    /**
     * - 構造の正規化（-位置修正など）
     */
    normalizeStructure?: (value: string, ctx: GuardContext) => string;
    /**
     * - エラー判定（値は変更しない）
     */
    validate?: (value: string, ctx: GuardContext) => void;
    /**
     * - 確定時の穏やか補正（切り捨て等）
     */
    fix?: (value: string, ctx: GuardContext) => string;
    /**
     * - 表示整形（カンマ付与など）
     */
    format?: (value: string, ctx: GuardContext) => string;
};
/**
 * 表示値(display)と内部値(raw)の分離設定
 */
type SeparateValueOptions = {
    /**
     * - "auto": format系ルールがある場合のみ自動でswapする（既定）
     * - "swap": 常にswapする（inputのみ対応）
     * - "off": 分離しない（displayとrawを同一に扱う）
     */
    mode?: "auto" | "swap" | "off";
};
/**
 * attach() に渡す設定オプション
 */
type AttachOptions = {
    /**
     * - 適用するルール配列（順番がフェーズ内実行順になる）
     */
    rules?: Rule[];
    /**
     * - 非対応ルールなどを console.warn するか
     */
    warn?: boolean;
    /**
     * - エラー時に付けるclass名
     */
    invalidClass?: string;
    /**
     * - 表示値と内部値の分離設定
     */
    separateValue?: SeparateValueOptions;
};
/**
 * revert要求（入力を巻き戻す指示）
 */
type RevertRequest = {
    /**
     * - ルール名や理由（例: "digits.int_overflow"）
     */
    reason: string;
    /**
     * - デバッグ用の詳細
     */
    detail?: any;
};

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
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function numeric(options?: NumericRuleOptions): Rule;
declare namespace numeric {
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
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}
/**
 * numeric ルールのオプション
 */
type NumericRuleOptions = {
    /**
     * - 全角数字/記号を許可して半角へ正規化する
     */
    allowFullWidth?: boolean;
    /**
     * - マイナス記号を許可する（先頭のみ）
     */
    allowMinus?: boolean;
    /**
     * - 小数点を許可する（1つだけ）
     */
    allowDecimal?: boolean;
    /**
     * - 空文字を許可するか
     */
    allowEmpty?: boolean;
};

/**
 * digits ルールを生成する
 * @param {DigitsRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function digits(options?: DigitsRuleOptions): Rule;
declare namespace digits {
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
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}
/**
 * digits ルールのオプション
 */
type DigitsRuleOptions = {
    /**
     * - 整数部の最大桁数（省略可）
     */
    int?: number;
    /**
     * - 小数部の最大桁数（省略可）
     */
    frac?: number;
    /**
     * - 整数部の先頭ゼロを桁数に含める
     */
    countLeadingZeros?: boolean;
    /**
     * - blur時の整数部補正
     */
    fixIntOnBlur?: "none" | "truncateLeft" | "truncateRight" | "clamp";
    /**
     * - blur時の小数部補正
     */
    fixFracOnBlur?: "none" | "truncate" | "round";
    /**
     * - 入力中：整数部が最大桁を超える入力をブロックする
     */
    overflowInputInt?: "none" | "block";
    /**
     * - 入力中：小数部が最大桁を超える入力をブロックする
     */
    overflowInputFrac?: "none" | "block";
    /**
     * - blur時に小数部を必ず表示（frac桁まで0埋め）
     */
    forceFracOnBlur?: boolean;
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
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function comma(): Rule;
declare namespace comma {
    /**
     * datasetから comma ルールを生成する
     * - data-tig-rules-comma が無ければ null
     *
     * 対応する data 属性（dataset 名）
     * - data-tig-rules-comma -> dataset.tigRulesComma
     *
     * @param {DOMStringMap} dataset
     * @param {HTMLInputElement|HTMLTextAreaElement} _el
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}

/**
 * kana ルールのオプション
 * @typedef {Object} KanaRuleOptions
 * @property {"katakana-full"|"katakana-half"|"hiragana"} [target="katakana-full"] - 統一先
 * @property {boolean} [nfkc=true] - 事前に Unicode NFKC 正規化を行う（合体文字などを正規化）
 */
/**
 * kana ルールを生成する
 * @param {KanaRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function kana(options?: KanaRuleOptions): Rule;
declare namespace kana {
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
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}
/**
 * kana ルールのオプション
 */
type KanaRuleOptions = {
    /**
     * - 統一先
     */
    target?: "katakana-full" | "katakana-half" | "hiragana";
    /**
     * - 事前に Unicode NFKC 正規化を行う（合体文字などを正規化）
     */
    nfkc?: boolean;
};

/**
 * ascii ルールを生成する
 * - 全角英数字・記号・全角スペースを半角へ正規化する
 * - カナは変換しない
 *
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function ascii(): Rule;
declare namespace ascii {
    /**
     * datasetから ascii ルールを生成する
     *
     * 対応する data 属性
     * - data-tig-rules-ascii
     *
     * @param {DOMStringMap} dataset
     * @param {HTMLInputElement|HTMLTextAreaElement} _el
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}

/**
 * filter ルールを生成する
 * - mode="drop": 不要文字を落とすだけ
 * - mode="error": 文字は落とさず validate でエラーを積む
 *
 * @param {FilterRuleOptions} [options]
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function filter(options?: FilterRuleOptions): Rule;
declare namespace filter {
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
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}
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
 */
type FilterCategory = "digits" | "alpha" | "ascii" | "hiragana" | "katakana-full" | "katakana-half" | "bmp-only" | "sjis-only" | "cp932-only" | "single-codepoint-only";
/**
 * filter ルールの動作モード
 */
type FilterMode = "drop" | "error";
/**
 * filter ルールのオプション
 * - category は和集合で扱う（複数指定OK）
 * - allow は追加許可（和集合）
 * - deny は除外（差集合）
 *
 * allowed = (category の和集合 ∪ allow) − deny
 */
type FilterRuleOptions = {
    /**
     * - drop: 不要文字を削除 / error: 削除せずエラーを積む
     */
    mode?: FilterMode;
    /**
     * - カテゴリ（配列）
     */
    category?: FilterCategory[];
    /**
     * - 追加で許可する正規表現（1文字にマッチさせる想定）
     */
    allow?: RegExp | string;
    /**
     * - allow が文字列のときの flags（"iu" など。g/y は無視）
     */
    allowFlags?: string;
    /**
     * - 除外する正規表現（1文字にマッチさせる想定）
     */
    deny?: RegExp | string;
    /**
     * - deny が文字列のときの flags（"iu" など。g/y は無視）
     */
    denyFlags?: string;
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
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function prefix(options: PrefixRuleOptions): Rule;
declare namespace prefix {
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
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}
/**
 * prefix ルールのオプション
 */
type PrefixRuleOptions = {
    /**
     * - 先頭に付ける文字列
     */
    text: string;
    /**
     * - 値が空でも表示するか
     */
    showWhenEmpty?: boolean;
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
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function suffix(options: SuffixRuleOptions): Rule;
declare namespace suffix {
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
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}
/**
 * suffix ルールのオプション
 */
type SuffixRuleOptions = {
    /**
     * - 末尾に付ける文字列
     */
    text: string;
    /**
     * - 値が空でも表示するか
     */
    showWhenEmpty?: boolean;
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
 * @returns {import("../text-input-guard.js").Rule}
 */
declare function trim(): Rule;
declare namespace trim {
    /**
     * datasetから trim ルールを生成する
     * - data-tig-rules-trim が無ければ null
     *
     * 対応する data 属性（dataset 名）
     * - data-tig-rules-trim -> dataset.tigRulesTrim
     *
     * @param {DOMStringMap} dataset
     * @param {HTMLInputElement|HTMLTextAreaElement} _el
     * @returns {import("../text-input-guard.js").Rule|null}
     */
    function fromDataset(dataset: DOMStringMap, _el: HTMLInputElement | HTMLTextAreaElement): Rule | null;
}

declare function autoAttach(root?: Document | DocumentFragment | ShadowRoot | Element): GuardGroup;
declare namespace rules {
    export { numeric };
    export { digits };
    export { comma };
    export { kana };
    export { ascii };
    export { filter };
    export { prefix };
    export { suffix };
    export { trim };
}
/**
 * バージョン（ビルド時に置換したいならここを差し替える）
 * 例: rollup replace で "__VERSION__" を package.json の version に置換
 */
declare const version: any;

export { ascii, attach, attachAll, autoAttach, comma, digits, filter, kana, numeric, prefix, rules, suffix, trim, version };
