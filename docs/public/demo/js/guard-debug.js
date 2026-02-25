// demo/js/guard-debug.js
export function bindGuardDebug(guard, outputEl, opts = {}) {
	const el = guard.getDisplayElement();
	const events = opts.events ?? ["compositionend", "input", "blur"];

	function render() {
		const rows = [
			["guard.getDisplayValue()", String(guard.getDisplayValue())],
			["guard.getRawValue()", String(guard.getRawValue())],
			["guard.isValid()", String(guard.isValid())],
			["guard.getErrors()", JSON.stringify(guard.getErrors(), null, 2)]
		];

		outputEl.innerHTML = rows
			.map(([k, v]) => `
        <div class="row">
          <div class="key" title="${escapeHtml(k)}">${escapeHtml(k)}</div>
          <div class="sep">:</div>
          <div class="val">${escapeHtml(v)}</div>
        </div>
      `)
			.join("");
	}

	for (const ev of events) { el.addEventListener(ev, render); }
	render();

	return { el, render, destroy() { for (const ev of events) { el.removeEventListener(ev, render); } } };
}

function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, c => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
	})[c]);
}
