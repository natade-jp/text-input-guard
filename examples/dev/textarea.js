import { attach, rules } from "../../src/main.js";

const input = document.getElementById("input");
const output = document.getElementById("output");

input.value = "あいうえお";

const guard = attach(input, {
	rules: [
		rules.kana({
			target: "katakana-full"
		}),
		rules.filter({
			category: ["katakana-full", "ascii"],
			allow: /[ \r\n]/
		}),
		rules.length({
			max: 10,
			mode: "block",
			unit: "grapheme"
		})
	],
	onChange: (guard) => {
		console.log("value changed", guard.getRawValue());
	}
});

const el = guard.getDisplayElement();

function renderState() {
	output.textContent = `display value : ${el.value}
raw value     : ${guard.getRawValue()}
isValid       : ${guard.isValid()}
errors        : ${JSON.stringify(guard.getErrors(), null, 2)}`;
}

el.addEventListener("compositionend", renderState);
el.addEventListener("input", renderState);
el.addEventListener("blur", renderState);

document.getElementById("check").addEventListener("click", renderState);

renderState();
