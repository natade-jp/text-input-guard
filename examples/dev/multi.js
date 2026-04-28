import { attach, attachAll, rules } from "../../src/main.js";

const input = document.querySelectorAll("input");

const guard = attachAll(input, {
	rules: [
		rules.length({
			max: 4,
			mode: "block",
			unit: "grapheme"
		})
	],
	onChange: (guard) => {
		console.log("value changed", guard.getRawValue());
	}
});
