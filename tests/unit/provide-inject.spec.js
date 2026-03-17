import { mount } from "@vue/test-utils";
import { defineComponent, inject, h } from "vue";
import { Context, SDK } from "@absmartly/javascript-sdk";
import ABSmartly from "@/plugin";

jest.mock("@absmartly/javascript-sdk");

const mockCreateContext = jest.fn().mockImplementation(() => {
	return new Context();
});

SDK.mockImplementation(() => {
	return {
		createContext: mockCreateContext,
	};
});

describe("Provide/Inject", () => {
	const sdkOptions = {
		test: 1,
	};

	it("should provide context to descendant components", (done) => {
		const ChildComponent = defineComponent({
			setup() {
				const globalName = inject("__absmartlyGlobal");
				const context = inject(globalName);
				return { context, globalName };
			},
			render() {
				return h("div", { class: "child" }, this.globalName);
			},
		});

		const ParentComponent = defineComponent({
			components: { ChildComponent },
			template: "<div><ChildComponent /></div>",
		});

		const wrapper = mount(ParentComponent, {
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

		const child = wrapper.findComponent(ChildComponent);
		expect(child.vm.context).toBeInstanceOf(Context);
		expect(child.vm.globalName).toBe("$absmartly");

		done();
	});

	it("should inject context from ancestor using custom global name", (done) => {
		const ChildComponent = defineComponent({
			setup() {
				const globalName = inject("__absmartlyGlobal");
				const context = inject(globalName);
				return { context, globalName };
			},
			render() {
				return h("div", { class: "child" }, this.globalName);
			},
		});

		const ParentComponent = defineComponent({
			components: { ChildComponent },
			template: "<div><ChildComponent /></div>",
		});

		const wrapper = mount(ParentComponent, {
			global: {
				plugins: [
					[
						ABSmartly,
						{
							sdkOptions,
							globalName: "$experiments",
						},
					],
				],
			},
		});

		const child = wrapper.findComponent(ChildComponent);
		expect(child.vm.context).toBeInstanceOf(Context);
		expect(child.vm.globalName).toBe("$experiments");

		done();
	});

	it("should provide context to deeply nested components", (done) => {
		const GrandchildComponent = defineComponent({
			setup() {
				const globalName = inject("__absmartlyGlobal");
				const context = inject(globalName);
				return { context };
			},
			render() {
				return h("span", { class: "grandchild" }, "grandchild");
			},
		});

		const ChildComponent = defineComponent({
			components: { GrandchildComponent },
			template: "<div><GrandchildComponent /></div>",
		});

		const ParentComponent = defineComponent({
			components: { ChildComponent },
			template: "<div><ChildComponent /></div>",
		});

		const wrapper = mount(ParentComponent, {
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

		const grandchild = wrapper.findComponent(GrandchildComponent);
		expect(grandchild.vm.context).toBeInstanceOf(Context);

		done();
	});

	it("should allow accessing context via global properties and inject", (done) => {
		const ChildComponent = defineComponent({
			setup() {
				const globalName = inject("__absmartlyGlobal");
				const injectedContext = inject(globalName);
				return { injectedContext };
			},
			render() {
				return h("div");
			},
		});

		const ParentComponent = defineComponent({
			components: { ChildComponent },
			template: "<div><ChildComponent /></div>",
		});

		const wrapper = mount(ParentComponent, {
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

		const child = wrapper.findComponent(ChildComponent);
		expect(child.vm.injectedContext).toBe(wrapper.vm.$absmartly);

		done();
	});
});
