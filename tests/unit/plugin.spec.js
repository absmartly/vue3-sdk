import { Context, SDK } from "@absmartly/javascript-sdk";
import { mount } from "@vue/test-utils";
import ABSmartly from "@/plugin";
import Treatment from "@/components/Treatment.vue";
import { createApp } from "vue";

jest.mock("@absmartly/javascript-sdk");

const mockCreateContext = jest.fn().mockImplementation(() => {
	return new Context();
});

const mockCreateContextWith = jest.fn().mockImplementation(() => {
	return new Context();
});

SDK.mockImplementation(() => {
	return {
		createContext: mockCreateContext,
		createContextWith: mockCreateContextWith
	};
});

describe("ABSmartly Vue.js Plugin", () => {
	const Component = {
		template: "<div>test</div>"
	};

	const sdkOptions = {
		test: 1
	};

	const contextOptions = {
		refreshPeriod: 600000,
		test: 2
	};

	const context = {
		test: 2
	};

	const data = {
		test: 2
	};

	const attrs = {
		attr1: "value1",
		attr2: "value2"
	};

	const overrides = {
		not_found: 2
	};

	it("should create SDK and context", done => {
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					sdkOptions,
					context,
					contextOptions,
					attributes: attrs,
					overrides
				}]]
			}
		});

		expect(SDK).toHaveBeenCalledTimes(1);
		expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
		expect(mockCreateContext).toHaveBeenCalledTimes(1);
		expect(mockCreateContext).toHaveBeenCalledWith(context, contextOptions);

		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledWith(attrs);

		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledWith(overrides);

		done();
	});
	it("should create context with default options", done => {
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					sdkOptions,
					context,
					attributes: attrs,
					overrides
				}]]
			}
		});

		expect(SDK).toHaveBeenCalledTimes(1);
		expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
		expect(mockCreateContext).toHaveBeenCalledTimes(1);
		expect(mockCreateContext).toHaveBeenCalledWith(context, {
			refreshPeriod: 300000
		});

		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledWith(attrs);

		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledWith(overrides);

		done();
	});


	it("should create SDK and context with no attributes and no overrides", done => {
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					sdkOptions,
					context,
					contextOptions
				}]]
			}
		});

		expect(SDK).toHaveBeenCalledTimes(1);
		expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
		expect(mockCreateContext).toHaveBeenCalledTimes(1);
		expect(mockCreateContext).toHaveBeenCalledWith(context, contextOptions);

		expect(wrapper.vm.$absmartly.attributes).not.toHaveBeenCalled();
		expect(wrapper.vm.$absmartly.overrides).not.toHaveBeenCalled();

		done();
	});

	it("should create SDK and context with data", done => {
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					sdkOptions,
					context,
					data,
					contextOptions,
					attributes: attrs,
					overrides
				}]]
			}
		});

		expect(SDK).toHaveBeenCalledTimes(1);
		expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
		expect(mockCreateContextWith).toHaveBeenCalledTimes(1);
		expect(mockCreateContextWith).toHaveBeenCalledWith(context, data, contextOptions);

		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.attributes).toHaveBeenCalledWith(attrs);

		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledWith(overrides);

		done();
	});

	it("should use passed context", done => {
		const mockContext = new Context();
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					context: mockContext,
					attributes: attrs,
					overrides
				}]]
			}
		});

		expect(SDK).not.toHaveBeenCalled();
		expect(mockCreateContext).not.toHaveBeenCalled();
		expect(mockCreateContextWith).not.toHaveBeenCalled();

		expect(mockContext.attributes).toHaveBeenCalledTimes(1);
		expect(mockContext.attributes).toHaveBeenCalledWith(attrs);

		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledTimes(1);
		expect(wrapper.vm.$absmartly.overrides).toHaveBeenCalledWith(overrides);

		expect(wrapper.vm.$absmartly).toBe(mockContext);

		done();
	});

	it("should add global $absmartly context object", done => {
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					sdkOptions
				}]]
			}
		});

		expect(wrapper.vm.$absmartly).toBeInstanceOf(Context);

		done();
	});

	it("should add options.globalName context object", done => {
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					sdkOptions,
					globalName: "$exp"
				}]]
			}
		});

		expect(wrapper.vm.$exp).toBeInstanceOf(Context);

		done();
	});

	it("should register components by default", done => {
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					sdkOptions
				}]]
			}
		});

		const expectedComponents = {
			Treatment
		};

		for (const componentName of Object.keys(expectedComponents)) {
			expect(wrapper.__app._context.components).toHaveProperty(componentName);
		}

		done();
	});

	it("should not register components when options.globalComponents is false", done => {
		const globalComponents = false;
		const wrapper = mount(Component, {
			global: {
				plugins: [[ABSmartly, {
					sdkOptions,
					globalComponents
				}]]
			}
		});

		const expectedComponents = {
			Treatment
		};

		for (const componentName of Object.keys(expectedComponents)) {
			expect(wrapper.__app._context.components).not.toHaveProperty(componentName);
		}

		done();
	});
});
