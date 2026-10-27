import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { SDK } from "@absmartly/javascript-sdk";
import ABSmartly from "@/plugin";
import Treatment from "@/components/Treatment.vue";
import { useABSmartly } from "@/useABSmartly";

function mountContext(context) {
	let result;
	const wrapper = mount(
		defineComponent({
			setup() {
				result = useABSmartly();
				return () =>
					h(
						Treatment,
						{ name: "missing" },
						{
							default: ({ ready, failed, treatment }) => `${ready}/${failed}/${treatment}`,
							loading: () => "loading",
						}
					);
			},
		}),
		{ global: { plugins: [[ABSmartly, { context }]] } }
	);
	return { wrapper, result };
}

describe("real JavaScript SDK context", () => {
	it("resolves failed readiness and sends the original error to the SDK event logger", async () => {
		let rejectLoad;
		const client = {
			getContext: jest.fn(
				() =>
					new Promise((resolve, reject) => {
						rejectLoad = reject;
					})
			),
		};
		const eventLogger = jest.fn();
		const sdk = new SDK({ client, eventLogger });
		const context = sdk.createContext({ units: { user: "test-user" } }, { publishDelay: -1 });
		const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		const { wrapper, result } = mountContext(context);
		try {
			expect(wrapper.text()).toBe("loading");
			expect(result.treatment("missing").value).toBe(0);
			const failure = new Error("initial load failed");
			rejectLoad(failure);
			await expect(context.ready()).resolves.toBe(true);
			await nextTick();
			await nextTick();

			expect(result.ready.value).toBe(true);
			expect(result.failed.value).toBe(true);
			expect(result.peek("missing").value).toBe(0);
			expect(result.variableValue("missing", "fallback").value).toBe("fallback");
			expect(wrapper.text()).toBe("true/true/0");
			expect(eventLogger).toHaveBeenCalledWith(context, "error", failure);
			expect(errorSpy).toHaveBeenCalledWith(
				"ABsmartly context failed to initialize; see the SDK event logger for details."
			);
		} finally {
			wrapper.unmount();
			await context.finalize();
			errorSpy.mockRestore();
		}
	});

	it("uses the real context for readiness, refresh and goal publishing", async () => {
		let resolveLoad;
		const client = {
			getContext: jest
				.fn()
				.mockImplementationOnce(
					() =>
						new Promise((resolve) => {
							resolveLoad = resolve;
						})
				)
				.mockResolvedValue({ experiments: [] }),
			publish: jest.fn().mockResolvedValue(undefined),
		};
		const eventLogger = jest.fn();
		const sdk = new SDK({ client, eventLogger });
		const context = sdk.createContext({ units: { user: "test-user" } }, { publishDelay: -1 });
		const { wrapper, result } = mountContext(context);
		try {
			expect(wrapper.text()).toBe("loading");
			resolveLoad({ experiments: [] });
			await context.ready();
			await nextTick();
			await nextTick();
			expect(result.ready.value).toBe(true);
			expect(result.failed.value).toBe(false);
			expect(wrapper.text()).toBe("true/false/0");

			await result.context.refresh();
			expect(client.getContext).toHaveBeenCalledTimes(2);
			expect(eventLogger).toHaveBeenCalledWith(context, "refresh", { experiments: [] });

			result.track("purchase", { value: 42 });
			await result.context.publish();
			expect(client.publish).toHaveBeenCalledWith(
				expect.objectContaining({
					goals: [expect.objectContaining({ name: "purchase", properties: { value: 42 } })],
				}),
				undefined
			);
			expect(context.pending()).toBe(0);
		} finally {
			wrapper.unmount();
			await context.finalize();
		}
	});
});
