module.exports = {
	clearMocks: true,
	coverageDirectory: "coverage",
	preset: "@vue/cli-plugin-unit-jest",
	transform: {
		"^.+\\.vue$": "@vue/vue3-jest"
	}
};
