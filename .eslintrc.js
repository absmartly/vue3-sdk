module.exports = {
	root: true,
	env: {
		node: true,
	},
	extends: ["plugin:vue/vue3-recommended", "eslint:recommended", "prettier"],
	rules: {
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
		"no-mixed-spaces-and-tabs": "off",
		"vue/multi-word-component-names": "off",
	},
	overrides: [
		{
			files: ["**/__tests__/*.{j,t}s?(x)", "**/tests/unit/**/*.spec.{j,t}s?(x)"],
			env: {
				jest: true,
			},
			rules: {
				"vue/one-component-per-file": "off",
			},
		},
	],
};
