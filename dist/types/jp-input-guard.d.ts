/**
 * 指定した1要素に対してガードを適用し、Guard API を返す
 * @param {HTMLInputElement|HTMLTextAreaElement} element
 * @param {AttachOptions} [options]
 * @returns {Guard}
 */
declare function attach(element: HTMLInputElement | HTMLTextAreaElement, options?: AttachOptions): Guard;
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
type JpigError = {
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
    getErrors: () => JpigError[];
    /**
     * - 送信用の正規化済み値を取得
     */
    getRawValue: () => string;
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
    pushError: (e: JpigError) => void;
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
     * - 表示/内部値分離設定（v0.1はinputのswapのみ対応）
     */
    separateValue?: {
        mode?: "swap" | "off";
    };
};
/**
 * swap時に退避する元inputの情報
 * detach時に元の状態へ復元するために使用する
 */
type SwapState = {
    /**
     * - 元のinput.type
     */
    originalType: string;
    /**
     * - 元のid属性
     */
    originalId: string | null;
    /**
     * - 元のname属性
     */
    originalName: string | null;
    /**
     * - 元のclass文字列
     */
    originalClass: string;
    /**
     * - 生成した表示用input
     */
    createdDisplay: HTMLInputElement;
};

export { attach };
export type { AttachOptions, ElementKind, Guard, GuardContext, JpigError, PhaseName, Rule, SwapState };
