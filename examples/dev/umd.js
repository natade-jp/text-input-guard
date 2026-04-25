// @ts-check

// UMDビルド版を利用する場合に、型情報を取得するためのコード例です。

// ESモジュールを使用して型情報を取得するためのコード例

/**
 * TextInputGuard 型
 * @type {typeof import("../../dist/esm/text-input-guard.js").TextInputGuard}
 */
const tigESM = /** @type {any} */ (window).TextInputGuard;

console.log("TextInputGuard:", tigESM);

tigESM.attach();

// d.ts モジュールを使用して型情報を取得するためのコード例

/**
 * TextInputGuard 型
 * @type {typeof import("../../dist/types/text-input-guard.d.ts").TextInputGuard}
 */
const tigTypes = /** @type {any} */ (window).TextInputGuard;

console.log("TextInputGuard:", tigTypes);

tigTypes.attach();
