export default {
	base: "/text-input-guard/",
	title: "TextInputGuard",
	description: "Input guard for text inputs",
	themeConfig: {
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Getting Started", link: "/getting-started" },
			{ text: "Demo", link: "/demo" },
			{ text: "API", link: "/api" },
			{ text: "Advanced", link: "/advanced" },
			{ text: "npm", link: "https://www.npmjs.com/package/text-input-guard" }
		],
		socialLinks: [
			{ icon: "github", link: "https://github.com/natade-jp/text-input-guard" }
		],
		outline: {
			level: [2, 4] // h2...h4 を表示
		},
		search: {
			provider: "local"
		}
	}
};
