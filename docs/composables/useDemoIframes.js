import { onMounted, onBeforeUnmount } from "vue";

/**
 * Demo ページ内の iframe を制御する composable。
 *
 * - iframe の高さを内容に合わせて自動調整
 * - VitePress のダークテーマ状態を iframe 内へ同期
 * - ページ破棄時にイベント／タイマーを解放
 *
 * @returns {void}
 */
export function useDemoIframes() {
	/** @type {number} */
	let timerId = 0;

	/** @type {MutationObserver|null} */
	let observer = null;

	/** @type {HTMLIFrameElement[]} */
	let iframeList = [];

	/** @type {((e: Event) => void)|null} */
	let onIframeLoad = null;

	/**
   * 指定した iframe の高さを内容に合わせて再計算する。
   * 一度 height を 0px に戻してから再測定することで、
   * 「伸びた後に縮まない」問題を回避する。
   *
   * @param {HTMLIFrameElement} iframe
   * @returns {void}
   */
	const resizeOne = function (iframe) {
		const doc = iframe.contentDocument;
		if (!doc) { return; }

		iframe.style.height = "0px";

		requestAnimationFrame(() => {
			const de = doc.documentElement;
			const body = doc.body;

			const h = Math.max(
				body?.scrollHeight ?? 0,
				body?.offsetHeight ?? 0,
				de?.scrollHeight ?? 0,
				de?.offsetHeight ?? 0
			);

			iframe.style.height = Math.max(100, h) + "px";
		});
	};

	/**
   * 登録済みの全 iframe の高さを再計算する。
   *
   * @returns {void}
   */
	const resizeAll = function () {
		for (const iframe of iframeList) {
			resizeOne(iframe);
		}
	};

	/**
   * VitePress 側のダークテーマ状態を全 iframe に反映する。
   *
   * @returns {void}
   */
	const applyThemeAll = function () {
		const isDark = document.documentElement.classList.contains("dark");

		for (const iframe of iframeList) {
			const doc = iframe.contentDocument;
			if (!doc?.body) { continue; }

			doc.body.classList.toggle("dark", isDark);
		}
	};

	onMounted(() => {
		iframeList = Array.from(document.querySelectorAll("iframe"));

		if (iframeList.length === 0) { return; }

		/**
     * iframe load イベントハンドラ。
     *
     * @param {Event} e
     * @returns {void}
     */
		onIframeLoad = function (e) {
			const iframe = /** @type {HTMLIFrameElement} */ (e.currentTarget);
			applyThemeAll();
			resizeOne(iframe);
		};

		for (const iframe of iframeList) {
			iframe.addEventListener("load", onIframeLoad);
		}

		applyThemeAll();
		resizeAll();

		observer = new MutationObserver(() => {
			applyThemeAll();
			resizeAll();
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"]
		});

		timerId = window.setInterval(resizeAll, 500);
	});

	onBeforeUnmount(() => {
		observer?.disconnect();

		if (timerId) {
			clearInterval(timerId);
			timerId = 0;
		}

		if (onIframeLoad) {
			for (const iframe of iframeList) {
				iframe.removeEventListener("load", onIframeLoad);
			}
		}

		iframeList = [];
	});
}
