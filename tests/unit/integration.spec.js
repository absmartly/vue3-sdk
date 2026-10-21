import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { Context, SDK } from "@absmartly/javascript-sdk";
import ABSmartly from "@/plugin";
import Treatment from "@/components/Treatment.vue";

jest.mock("@absmartly/javascript-sdk");

describe("Integration Tests", () => {
	let mockContext;
	let mockTreatment;
	let mockAttributes;
	let mockReady;
	let mockIsReady;
	let mockIsFailed;
	let readyResolve;

	beforeEach(() => {
		mockTreatment = jest.fn().mockReturnValue(1);
		mockAttributes = jest.fn();
		mockIsReady = jest.fn().mockReturnValue(true);
		mockIsFailed = jest.fn().mockReturnValue(false);
		mockReady = jest.fn().mockReturnValue(
			new Promise((resolve) => {
				readyResolve = resolve;
			})
		);

		mockContext = {
			treatment: mockTreatment,
			attributes: mockAttributes,
			ready: mockReady,
			isReady: mockIsReady,
			isFailed: mockIsFailed,
			overrides: jest.fn(),
		};

		Context.mockImplementation(() => mockContext);

		SDK.mockImplementation(() => ({
			createContext: jest.fn().mockReturnValue(mockContext),
			createContextWith: jest.fn().mockReturnValue(mockContext),
		}));
	});

	describe("Treatment Component with Plugin", () => {
		it("should render treatment from plugin context", () => {
			const App = defineComponent({
				template: `
					<Treatment name="test_exp">
						<template #default="{ treatment }">
							<span class="treatment">{{ treatment }}</span>
						</template>
					</Treatment>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(wrapper.find(".treatment").text()).toBe("1");
			expect(mockTreatment).toHaveBeenCalledWith("test_exp");
		});

		it("should pass attributes from Treatment to context", () => {
			const App = defineComponent({
				template: `
					<Treatment name="test_exp" :attributes="{ user: 'test' }">
						<template #default>content</template>
					</Treatment>
				`,
			});

			mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(mockAttributes).toHaveBeenCalledWith({ user: "test" });
		});

		it("should render multiple Treatment components independently", () => {
			mockTreatment
				.mockReturnValueOnce(0)
				.mockReturnValueOnce(1)
				.mockReturnValueOnce(2);

			const App = defineComponent({
				template: `
					<div>
						<Treatment name="exp1">
							<template #default="{ treatment }">
								<span class="exp1">{{ treatment }}</span>
							</template>
						</Treatment>
						<Treatment name="exp2">
							<template #default="{ treatment }">
								<span class="exp2">{{ treatment }}</span>
							</template>
						</Treatment>
						<Treatment name="exp3">
							<template #default="{ treatment }">
								<span class="exp3">{{ treatment }}</span>
							</template>
						</Treatment>
					</div>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(wrapper.find(".exp1").text()).toBe("0");
			expect(wrapper.find(".exp2").text()).toBe("1");
			expect(wrapper.find(".exp3").text()).toBe("2");
		});

		it("should work with globally registered Treatment component", () => {
			const App = defineComponent({
				template: `
					<Treatment name="global_exp">
						<template #default="{ treatment }">
							<span class="result">{{ treatment }}</span>
						</template>
					</Treatment>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: true }]],
				},
			});

			expect(wrapper.find(".result").text()).toBe("1");
		});
	});

	describe("Loading State Integration", () => {
		beforeEach(() => {
			mockIsReady.mockReturnValue(false);
		});

		it("should show loading slot when context is not ready", () => {
			const App = defineComponent({
				template: `
					<Treatment name="test_exp">
						<template #loading>
							<span class="loading">Loading...</span>
						</template>
						<template #default>
							<span class="content">Content</span>
						</template>
					</Treatment>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(wrapper.find(".loading").exists()).toBe(true);
			expect(wrapper.find(".content").exists()).toBe(false);
		});

		it("should transition from loading to content when context becomes ready", async () => {
			const App = defineComponent({
				template: `
					<Treatment name="test_exp">
						<template #loading>
							<span class="loading">Loading...</span>
						</template>
						<template #default="{ treatment }">
							<span class="content">{{ treatment }}</span>
						</template>
					</Treatment>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(wrapper.find(".loading").exists()).toBe(true);

			mockIsReady.mockReturnValue(true);
			readyResolve(true);

			await nextTick();
			await nextTick();

			expect(wrapper.find(".content").exists()).toBe(true);
		});
	});

	describe("Custom Global Name Integration", () => {
		it("should work with custom global name", () => {
			const App = defineComponent({
				template: `
					<Treatment name="test_exp">
						<template #default="{ treatment }">
							<span class="result">{{ treatment }}</span>
						</template>
					</Treatment>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalName: "$exp", globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(wrapper.vm.$exp).toBeDefined();
			expect(wrapper.find(".result").text()).toBe("1");
		});
	});

	describe("Error State Integration", () => {
		it("should pass failed state to slot", () => {
			mockIsFailed.mockReturnValue(true);

			const App = defineComponent({
				template: `
					<Treatment name="test_exp">
						<template #default="{ failed, treatment }">
							<span class="result" :class="{ error: failed }">{{ treatment }}</span>
						</template>
					</Treatment>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(wrapper.find(".result").classes()).toContain("error");
		});
	});

	describe("Slot Selection Integration", () => {
		it("should render correct slot for treatment 0 (control)", () => {
			mockTreatment.mockReturnValue(0);

			const App = defineComponent({
				template: `
					<Treatment name="test_exp">
						<template #A><span class="a">Control</span></template>
						<template #B><span class="b">Variant B</span></template>
					</Treatment>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(wrapper.find(".a").exists()).toBe(true);
			expect(wrapper.find(".b").exists()).toBe(false);
		});

		it("should render correct slot for treatment by number", () => {
			mockTreatment.mockReturnValue(2);

			const App = defineComponent({
				template: `
					<Treatment name="test_exp">
						<template #0><span class="zero">Zero</span></template>
						<template #1><span class="one">One</span></template>
						<template #2><span class="two">Two</span></template>
					</Treatment>
				`,
			});

			const wrapper = mount(App, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalComponents: false }]],
					components: { Treatment },
				},
			});

			expect(wrapper.find(".two").exists()).toBe(true);
			expect(wrapper.find(".zero").exists()).toBe(false);
			expect(wrapper.find(".one").exists()).toBe(false);
		});
	});
});
