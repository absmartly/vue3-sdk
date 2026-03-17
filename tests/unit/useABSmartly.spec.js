import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { Context, SDK } from "@absmartly/javascript-sdk";
import ABSmartly from "@/plugin";
import { useABSmartly, ABSMARTLY_INJECTION_KEY } from "@/useABSmartly";

jest.mock("@absmartly/javascript-sdk");

describe("useABSmartly", () => {
	let mockContext;
	let mockTreatment;
	let mockVariableValue;
	let mockPeek;
	let mockTrack;
	let mockIsReady;
	let mockIsFailed;
	let mockReady;
	let readyResolve;

	beforeEach(() => {
		mockTreatment = jest.fn().mockReturnValue(1);
		mockVariableValue = jest.fn().mockReturnValue("blue");
		mockPeek = jest.fn().mockReturnValue(0);
		mockTrack = jest.fn();
		mockIsReady = jest.fn().mockReturnValue(true);
		mockIsFailed = jest.fn().mockReturnValue(false);
		mockReady = jest.fn().mockReturnValue(
			new Promise((resolve) => {
				readyResolve = resolve;
			})
		);

		mockContext = {
			treatment: mockTreatment,
			variableValue: mockVariableValue,
			peek: mockPeek,
			track: mockTrack,
			isReady: mockIsReady,
			isFailed: mockIsFailed,
			ready: mockReady,
			attributes: jest.fn(),
			overrides: jest.fn(),
		};

		Context.mockImplementation(() => mockContext);

		SDK.mockImplementation(() => ({
			createContext: jest.fn().mockReturnValue(mockContext),
			createContextWith: jest.fn().mockReturnValue(mockContext),
		}));
	});

	function mountWithComposable(composableFn) {
		let result;
		const TestComponent = defineComponent({
			setup() {
				result = composableFn();
				return {};
			},
			render() {
				return h("div");
			},
		});

		const wrapper = mount(TestComponent, {
			global: {
				plugins: [[ABSmartly, { sdkOptions: {} }]],
			},
		});

		return { wrapper, result };
	}

	it("should throw when used without the plugin", () => {
		const TestComponent = defineComponent({
			setup() {
				useABSmartly();
				return {};
			},
			render() {
				return h("div");
			},
		});

		jest.spyOn(console, "warn").mockImplementation(() => {});

		expect(() => {
			mount(TestComponent);
		}).toThrow(
			"useABSmartly() requires the ABSmartlyVue plugin to be installed."
		);
	});

	it("should return context", () => {
		const { result } = mountWithComposable(() => useABSmartly());
		expect(result.context).toBe(mockContext);
	});

	it("should return ready as true when context is ready", () => {
		const { result } = mountWithComposable(() => useABSmartly());
		expect(result.ready.value).toBe(true);
	});

	it("should return failed as false when context has not failed", () => {
		const { result } = mountWithComposable(() => useABSmartly());
		expect(result.failed.value).toBe(false);
	});

	it("should return failed as true when context has failed", () => {
		mockIsFailed.mockReturnValue(true);
		const { result } = mountWithComposable(() => useABSmartly());
		expect(result.failed.value).toBe(true);
	});

	describe("when context is not ready", () => {
		beforeEach(() => {
			mockIsReady.mockReturnValue(false);
		});

		it("should return ready as false", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			expect(result.ready.value).toBe(false);
		});

		it("should update ready when context becomes ready", async () => {
			const { result } = mountWithComposable(() => useABSmartly());
			expect(result.ready.value).toBe(false);

			mockIsReady.mockReturnValue(true);
			readyResolve();
			await nextTick();
			await nextTick();

			expect(result.ready.value).toBe(true);
		});

		it("should update failed when context becomes ready with failure", async () => {
			const { result } = mountWithComposable(() => useABSmartly());
			expect(result.failed.value).toBe(false);

			mockIsReady.mockReturnValue(true);
			mockIsFailed.mockReturnValue(true);
			readyResolve();
			await nextTick();
			await nextTick();

			expect(result.failed.value).toBe(true);
		});

		it("should return default treatment value of 0 before ready", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const variant = result.treatment("test_exp");
			expect(variant.value).toBe(0);
			expect(mockTreatment).not.toHaveBeenCalled();
		});

		it("should return default variable value before ready", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const color = result.variableValue("button.color", "red");
			expect(color.value).toBe("red");
			expect(mockVariableValue).not.toHaveBeenCalled();
		});

		it("should return default peek value of 0 before ready", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const variant = result.peek("test_exp");
			expect(variant.value).toBe(0);
			expect(mockPeek).not.toHaveBeenCalled();
		});

		it("should return real treatment value after context becomes ready", async () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const variant = result.treatment("test_exp");
			expect(variant.value).toBe(0);

			mockIsReady.mockReturnValue(true);
			readyResolve();
			await nextTick();
			await nextTick();

			expect(variant.value).toBe(1);
			expect(mockTreatment).toHaveBeenCalledWith("test_exp");
		});

		it("should return real variable value after context becomes ready", async () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const color = result.variableValue("button.color", "red");
			expect(color.value).toBe("red");

			mockIsReady.mockReturnValue(true);
			readyResolve();
			await nextTick();
			await nextTick();

			expect(color.value).toBe("blue");
			expect(mockVariableValue).toHaveBeenCalledWith("button.color", "red");
		});

		it("should return real peek value after context becomes ready", async () => {
			mockPeek.mockReturnValue(2);
			const { result } = mountWithComposable(() => useABSmartly());
			const variant = result.peek("test_exp");
			expect(variant.value).toBe(0);

			mockIsReady.mockReturnValue(true);
			readyResolve();
			await nextTick();
			await nextTick();

			expect(variant.value).toBe(2);
			expect(mockPeek).toHaveBeenCalledWith("test_exp");
		});
	});

	describe("when context is ready", () => {
		it("should return treatment value from context", () => {
			mockTreatment.mockReturnValue(2);
			const { result } = mountWithComposable(() => useABSmartly());
			const variant = result.treatment("test_exp");
			expect(variant.value).toBe(2);
			expect(mockTreatment).toHaveBeenCalledWith("test_exp");
		});

		it("should return variable value from context", () => {
			mockVariableValue.mockReturnValue("green");
			const { result } = mountWithComposable(() => useABSmartly());
			const color = result.variableValue("button.color", "red");
			expect(color.value).toBe("green");
			expect(mockVariableValue).toHaveBeenCalledWith("button.color", "red");
		});

		it("should return peek value from context", () => {
			mockPeek.mockReturnValue(1);
			const { result } = mountWithComposable(() => useABSmartly());
			const variant = result.peek("test_exp");
			expect(variant.value).toBe(1);
			expect(mockPeek).toHaveBeenCalledWith("test_exp");
		});

		it("should return treatment 0 correctly", () => {
			mockTreatment.mockReturnValue(0);
			const { result } = mountWithComposable(() => useABSmartly());
			const variant = result.treatment("test_exp");
			expect(variant.value).toBe(0);
		});
	});

	describe("track", () => {
		it("should call context.track with goal name and properties", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const properties = { amount: 99.99, category: "premium" };
			result.track("purchase", properties);
			expect(mockTrack).toHaveBeenCalledWith("purchase", properties);
		});

		it("should call context.track with goal name only", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			result.track("click");
			expect(mockTrack).toHaveBeenCalledWith("click", undefined);
		});
	});

	describe("injection key", () => {
		it("should use the well-known injection key", () => {
			let injectedContext;
			const TestComponent = defineComponent({
				setup() {
					const { context } = useABSmartly();
					injectedContext = context;
					return {};
				},
				render() {
					return h("div");
				},
			});

			mount(TestComponent, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {} }]],
				},
			});

			expect(injectedContext).toBe(mockContext);
		});

		it("should work regardless of custom globalName", () => {
			let injectedContext;
			const TestComponent = defineComponent({
				setup() {
					const { context } = useABSmartly();
					injectedContext = context;
					return {};
				},
				render() {
					return h("div");
				},
			});

			mount(TestComponent, {
				global: {
					plugins: [[ABSmartly, { sdkOptions: {}, globalName: "$experiments" }]],
				},
			});

			expect(injectedContext).toBe(mockContext);
		});
	});

	describe("multiple treatments", () => {
		it("should handle multiple treatment calls independently", () => {
			mockTreatment.mockImplementation((name) => {
				if (name === "exp_a") return 0;
				if (name === "exp_b") return 1;
				return 2;
			});

			const { result } = mountWithComposable(() => useABSmartly());
			const variantA = result.treatment("exp_a");
			const variantB = result.treatment("exp_b");
			const variantC = result.treatment("exp_c");

			expect(variantA.value).toBe(0);
			expect(variantB.value).toBe(1);
			expect(variantC.value).toBe(2);
		});
	});

	describe("error handling (.catch on context.ready())", () => {
		beforeEach(() => {
			mockIsReady.mockReturnValue(false);
		});

		it("should set failed to true when context.ready() rejects", async () => {
			let readyReject;
			mockReady.mockReturnValue(
				new Promise((_, reject) => {
					readyReject = reject;
				})
			);

			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			const { result } = mountWithComposable(() => useABSmartly());
			expect(result.failed.value).toBe(false);

			readyReject(new Error("network failure"));
			await nextTick();
			await nextTick();

			expect(result.failed.value).toBe(true);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"ABSmartly context failed to initialize:",
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});

		it("should not update state after rejection if component is unmounted", async () => {
			let readyReject;
			mockReady.mockReturnValue(
				new Promise((_, reject) => {
					readyReject = reject;
				})
			);

			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			const { wrapper, result } = mountWithComposable(() => useABSmartly());
			expect(result.failed.value).toBe(false);

			wrapper.unmount();

			readyReject(new Error("network failure"));
			await nextTick();
			await nextTick();

			expect(result.failed.value).toBe(false);

			consoleErrorSpy.mockRestore();
		});
	});

	describe("unmount guard on context.ready()", () => {
		beforeEach(() => {
			mockIsReady.mockReturnValue(false);
		});

		it("should not update ready/failed after component is unmounted", async () => {
			const { wrapper, result } = mountWithComposable(() => useABSmartly());
			expect(result.ready.value).toBe(false);

			wrapper.unmount();

			mockIsReady.mockReturnValue(true);
			readyResolve();
			await nextTick();
			await nextTick();

			expect(result.ready.value).toBe(false);
			expect(result.failed.value).toBe(false);
		});
	});

	describe("Symbol injection key", () => {
		it("should export ABSMARTLY_INJECTION_KEY as a Symbol", () => {
			expect(typeof ABSMARTLY_INJECTION_KEY).toBe("symbol");
			expect(ABSMARTLY_INJECTION_KEY.toString()).toContain("absmartly");
		});
	});

	describe("track ready guard", () => {
		beforeEach(() => {
			mockIsReady.mockReturnValue(false);
		});

		it("should warn when tracking before context is ready", () => {
			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

			const { result } = mountWithComposable(() => useABSmartly());
			result.track("click");

			expect(consoleWarnSpy).toHaveBeenCalledWith("ABSmartly: tracking before context ready");
			expect(mockTrack).toHaveBeenCalledWith("click", undefined);

			consoleWarnSpy.mockRestore();
		});

		it("should not warn when tracking after context is ready", () => {
			mockIsReady.mockReturnValue(true);
			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

			const { result } = mountWithComposable(() => useABSmartly());
			result.track("click");

			expect(consoleWarnSpy).not.toHaveBeenCalled();
			expect(mockTrack).toHaveBeenCalledWith("click", undefined);

			consoleWarnSpy.mockRestore();
		});
	});

	describe("readonly refs", () => {
		it("should return ready as a readonly ref that warns on mutation", () => {
			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
			const { result } = mountWithComposable(() => useABSmartly());

			result.ready.value = false;

			expect(consoleWarnSpy).toHaveBeenCalled();
			consoleWarnSpy.mockRestore();
		});

		it("should return failed as a readonly ref that warns on mutation", () => {
			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
			const { result } = mountWithComposable(() => useABSmartly());

			result.failed.value = true;

			expect(consoleWarnSpy).toHaveBeenCalled();
			consoleWarnSpy.mockRestore();
		});
	});

	describe("treatment/peek memoization", () => {
		it("should return the same computed ref for repeated treatment() calls with same name", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const ref1 = result.treatment("exp_a");
			const ref2 = result.treatment("exp_a");
			expect(ref1).toBe(ref2);
		});

		it("should return different computed refs for different treatment names", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const ref1 = result.treatment("exp_a");
			const ref2 = result.treatment("exp_b");
			expect(ref1).not.toBe(ref2);
		});

		it("should return the same computed ref for repeated peek() calls with same name", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const ref1 = result.peek("exp_a");
			const ref2 = result.peek("exp_a");
			expect(ref1).toBe(ref2);
		});

		it("should return different computed refs for different peek names", () => {
			const { result } = mountWithComposable(() => useABSmartly());
			const ref1 = result.peek("exp_a");
			const ref2 = result.peek("exp_b");
			expect(ref1).not.toBe(ref2);
		});
	});
});
