import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { SDK } from "@absmartly/javascript-sdk";
import ABSmartly from "@/plugin";
import Treatment from "@/components/Treatment.vue";
import { useABSmartly } from "@/useABSmartly";

// Custom clients must implement what the SDK's Context reads from Client, including the configured
// application and environment it evaluates audiences with.
function fakeClient(methods) {
	return {
		getApplication: () => ({ name: "website", version: 0 }),
		getEnvironment: () => "production",
		...methods,
	};
}

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

function strictEnvironmentAudienceData(environment) {
	return {
		experiments: [
			{
				id: 1,
				name: "exp_test_ab",
				iteration: 1,
				unitType: "session_id",
				seedHi: 3603515,
				seedLo: 233373850,
				split: [0.0, 1.0],
				trafficSeedHi: 449867249,
				trafficSeedLo: 455443629,
				trafficSplit: [0.0, 1.0],
				fullOnVariant: 0,
				applications: [{ name: "website" }],
				variants: [
					{ name: "A", config: null },
					{ name: "B", config: '{"banner.size":"large"}' },
				],
				audienceStrict: true,
				audience: JSON.stringify({ filter: [{ eq: [{ var: "environment" }, { value: environment }] }] }),
			},
		],
	};
}

function mountExperiment(context) {
	let result;
	const wrapper = mount(
		defineComponent({
			setup() {
				result = useABSmartly();
				return () => h(Treatment, { name: "exp_test_ab" }, { default: ({ treatment }) => `variant ${treatment}` });
			},
		}),
		{ global: { plugins: [[ABSmartly, { context }]] } }
	);
	return { wrapper, result };
}

describe("real JavaScript SDK context", () => {
	it("resolves failed readiness and sends the original error to the SDK event logger", async () => {
		let rejectLoad;
		const client = fakeClient({
			getContext: jest.fn(
				() =>
					new Promise((resolve, reject) => {
						rejectLoad = reject;
					})
			),
		});
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
		const client = fakeClient({
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
		});
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

	describe("system attributes in audience evaluation", () => {
		async function contextFor(audienceEnvironment) {
			const client = fakeClient({
				getContext: jest.fn().mockResolvedValue(strictEnvironmentAudienceData(audienceEnvironment)),
				publish: jest.fn().mockResolvedValue(undefined),
			});
			const eventLogger = jest.fn();
			const sdk = new SDK({ client, eventLogger });
			const context = sdk.createContext({ units: { session_id: "e791e240fcd3df7d238cfc285f475e8152fcc0ec" } });
			await context.ready();
			return { context, eventLogger };
		}

		function exposures(eventLogger) {
			return eventLogger.mock.calls.filter(([, type]) => type === "exposure").map(([, , data]) => data);
		}

		it("gives a strict environment audience the matching variant from the configured environment", async () => {
			const { context, eventLogger } = await contextFor("production");
			const { wrapper, result } = mountExperiment(context);
			try {
				expect(wrapper.text()).toBe("variant 1");
				expect(result.treatment("exp_test_ab").value).toBe(1);
				expect(result.variableValue("banner.size", "small").value).toBe("large");
				expect(context.getAttributes()).toEqual({});
				expect(exposures(eventLogger)).toEqual([
					expect.objectContaining({ name: "exp_test_ab", variant: 1, audienceMismatch: false }),
				]);
			} finally {
				wrapper.unmount();
				await context.finalize();
			}
		});

		it("gives variant 0 when a strict audience names another environment", async () => {
			const { context, eventLogger } = await contextFor("staging");
			const { wrapper, result } = mountExperiment(context);
			try {
				expect(wrapper.text()).toBe("variant 0");
				expect(result.treatment("exp_test_ab").value).toBe(0);
				expect(exposures(eventLogger)).toEqual([
					expect.objectContaining({ name: "exp_test_ab", variant: 0, audienceMismatch: true }),
				]);
			} finally {
				wrapper.unmount();
				await context.finalize();
			}
		});

		it("matches through a context the plugin creates from sdkOptions, without publishing the attribute", async () => {
			const publisher = { publish: jest.fn().mockResolvedValue(undefined) };
			let result;
			const wrapper = mount(
				defineComponent({
					setup() {
						result = useABSmartly();
						return () => h(Treatment, { name: "exp_test_ab" }, { default: ({ treatment }) => `variant ${treatment}` });
					},
				}),
				{
					global: {
						plugins: [
							[
								ABSmartly,
								{
									sdkOptions: {
										endpoint: "https://sandbox.test.io/v1",
										apiKey: "test-api-key",
										application: "website",
										environment: "production",
										publisher,
									},
									context: { units: { session_id: "e791e240fcd3df7d238cfc285f475e8152fcc0ec" } },
									data: strictEnvironmentAudienceData("production"),
									contextOptions: { publishDelay: -1 },
								},
							],
						],
					},
				}
			);
			const context = result.context;
			try {
				expect(wrapper.text()).toBe("variant 1");
				expect(result.treatment("exp_test_ab").value).toBe(1);
				await context.publish();
				expect(publisher.publish).toHaveBeenCalledTimes(1);
				const [request] = publisher.publish.mock.calls[0];
				expect(request.exposures).toEqual([
					expect.objectContaining({ name: "exp_test_ab", variant: 1, audienceMismatch: false }),
				]);
				expect(request.attributes).toBeUndefined();
			} finally {
				wrapper.unmount();
				await context.finalize();
			}
		});
	});
});
