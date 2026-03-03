import { attach, rules } from "../../src/main.js";

const input = document.getElementById("input");
const output = document.getElementById("output");

const guard = attach(input, {
	rules: [
		rules.length({
			max: 5, overflowInput: "block", unit: "utf-16"
		})
	]
});
guard.setValue("123");
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
