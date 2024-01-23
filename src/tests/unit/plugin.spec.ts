import { Context, SDK } from "@absmartly/javascript-sdk";
import { mount } from "@vue/test-utils";
import { ABSmartlyVue as ABSmartly, Treatment } from "../../index.ts";
import { describe, expect, it, vi } from "vitest";
import { ContextData, ContextOptions, ContextParams } from "@absmartly/javascript-sdk/types/context";

type ContextArgs = [SDK, ContextOptions, ContextParams, ContextData];

// const {
// 	mockCreateContext,
// 	mockCreateContextWith,
// 	mockGetContextPublisher,
// 	mockGetContextDataProvider,
// 	mockGetEventLogger,
// } = vi.hoisted(() => {
const defaultSDK = new SDK({
	apiKey: "test_api_key",
	endpoint: "test.absmartly.io",
	application: "test-env",
	environment: "test",
});

const defaultContextArgs: ContextArgs = [
	defaultSDK,
	{ refreshPeriod: 5 * 60 * 1000, publishDelay: 5 },
	{ units: { user_id: "1234567890" } },
	{},
];
//
// 	return {
// 		mockCreateContext: vi.fn(() => new Context(...defaultContextArgs)),
// 		mockCreateContextWith: vi.fn(() => new Context(...defaultContextArgs)),
// 		mockGetContextPublisher: vi.fn(() => new ContextPublisher()),
// 		mockGetContextDataProvider: vi.fn(() => new ContextDataProvider()),
// 		mockGetEventLogger: vi.fn(),
// 	};
// });

const mockCreateContext = vi.fn(() => new Context(...defaultContextArgs));
const mockCreateContextWith = vi.fn(() => new Context(...defaultContextArgs));

vi.mock("@absmartly/javascript-sdk");

// @ts-ignore
SDK.mockImplementation(() => ({
	createContext: mockCreateContext,
	createContextWith: mockCreateContextWith,
}));

// 	const mockSDK = {
// 		createContext: mockCreateContext,
// 		createContextWith: mockCreateContextWith,
// 		getContextPublisher: mockGetContextPublisher,
// 		getContextDataProvider: mockGetContextDataProvider,
// 		getEventLogger: mockGetEventLogger,
// 	};
//
// 	const abSmartly = (await importOriginal()) as typeof ABSmartly;
//
// 	return {
// 		...abSmartly,
// 		SDK: vi.fn(() => mockSDK),
// 	};
// });

describe("ABSmartly Vue.js Plugin", () => {
	const Component = {
		template: "<div>test</div>",
	};

	const sdkOptions = {
		test: 1,
	};

	const contextOptions = {
		refreshPeriod: 600000,
		test: 2,
	};

	const context = {
		test: 2,
	};

	const data = {
		test: 2,
	};

	const attrs = {
		attr1: "value1",
		attr2: "value2",
	};

	const overrides = {
		not_found: 2,
	};

	it("should create SDK and context", () => {
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
							context,
							contextOptions,
							attributes: attrs,
							overrides,
						},
					],
				],
			},
		});

		expect(SDK).toHaveBeenCalledTimes(1);
		expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
		expect(mockCreateContext).toHaveBeenCalledTimes(1);
		expect(mockCreateContext).toHaveBeenCalledWith(context, contextOptions);

		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledWith(attrs);

		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledWith(overrides);
	});

	it("should create context with default options", () => {
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
							context,
							attributes: attrs,
							overrides,
						},
					],
				],
			},
		});

		expect(SDK).toHaveBeenCalledTimes(1);
		expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
		expect(mockCreateContext).toHaveBeenCalledTimes(1);
		expect(mockCreateContext).toHaveBeenCalledWith(context, {
			refreshPeriod: 300000,
		});

		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledWith(attrs);

		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledWith(overrides);
	});

	it("should create SDK and context with no attributes and no overrides", () => {
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
							context,
							contextOptions,
						},
					],
				],
			},
		});

		expect(SDK).toHaveBeenCalledTimes(1);
		expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
		expect(mockCreateContext).toHaveBeenCalledTimes(1);
		expect(mockCreateContext).toHaveBeenCalledWith(context, contextOptions);

		expect(wrapper.vm.$absmartly.attributes).not.toHaveBeenCalled();
		expect(wrapper.vm.$absmartly.overrides).not.toHaveBeenCalled();
	});

	it("should create SDK and context with data", () => {
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
							context,
							data,
							contextOptions,
							attributes: attrs,
							overrides,
						},
					],
				],
			},
		});

		expect(SDK).toHaveBeenCalledTimes(1);
		expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
		expect(mockCreateContextWith).toHaveBeenCalledTimes(1);
		expect(mockCreateContextWith).toHaveBeenCalledWith(context, data, contextOptions);

		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledWith(attrs);

		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledWith(overrides);
	});

	it("should use passed context", () => {
		const mockContext = new Context(...defaultContextArgs);
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							context: mockContext,
							attributes: attrs,
							overrides,
						},
					],
				],
			},
		});

		expect(SDK).not.toHaveBeenCalled();
		expect(mockCreateContext).not.toHaveBeenCalled();
		expect(mockCreateContextWith).not.toHaveBeenCalled();

		expect(mockContext.attributes).toHaveBeenCalledTimes(1);
		expect(mockContext.attributes).toHaveBeenCalledWith(attrs);

		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledWith(overrides);

		expect(wrapper.vm.$absmartly).toBe(mockContext);
	});

	it("should add global $absmartly context object", () => {
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
						},
					],
				],
			},
		});

		expect(wrapper.vm.$absmartly).toBeInstanceOf(Context);
	});

	it("should add options.globalName context object", () => {
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
							globalName: "$exp",
						},
					],
				],
			},
		});

		expect(wrapper.vm.$exp).toBeInstanceOf(Context);
	});

	it("should register components by default", () => {
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
						},
					],
				],
			},
		});

		const expectedComponents = {
			Treatment,
		};

		for (const componentName of Object.keys(expectedComponents)) {
			// @ts-expect-error
			expect(wrapper.__app._context.components).toHaveProperty(componentName);
		}
	});

	it("should not register components when options.globalComponents is false", () => {
		const globalComponents = false;
		const wrapper = mount(Component, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
							globalComponents,
						},
					],
				],
			},
		});

		const expectedComponents = {
			Treatment,
		};

		for (const componentName of Object.keys(expectedComponents)) {
			// @ts-expect-error
			expect(wrapper.__app._context.components).not.toHaveProperty(componentName);
		}
	});
});
