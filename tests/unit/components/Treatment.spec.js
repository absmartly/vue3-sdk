import { mount } from "@vue/test-utils";
import Treatment from "@/components/Treatment.vue";

describe("Treatment.vue", () => {
	const mocks = {
		__absmartlyGlobal: "$absmartly",
		$absmartly: {
			treatment: jest.fn(),
			attributes: jest.fn(),
			ready: jest.fn(),
			isReady: jest.fn(),
			isFailed: jest.fn(),
		},
	};

	it("it should not render loading slot when ready", (done) => {
		const slotMock = jest.fn();
		const loadingMock = jest.fn();

		const attributes = {
			attr1: 15,
			attr2: 50,
		};

		mocks.$absmartly.isReady.mockReturnValue(true);
		mocks.$absmartly.isFailed.mockReturnValue(false);
		mocks.$absmartly.treatment.mockReturnValue(1);

		mount(Treatment, {
			props: {
				name: "test_exp",
				attributes,
			},
			slots: {
				default: slotMock,
				loading: loadingMock,
			},
			global: {
				mocks,
			},
			shallow: true,
		});

		expect(mocks.$absmartly.treatment).toHaveBeenCalledTimes(1);
		expect(mocks.$absmartly.treatment).toHaveBeenCalledWith("test_exp");
		expect(mocks.$absmartly.attributes).toHaveBeenCalledTimes(1);
		expect(mocks.$absmartly.attributes).toHaveBeenCalledWith(attributes);
		expect(loadingMock).not.toHaveBeenCalled();
		expect(slotMock).toHaveBeenCalledTimes(1);
		expect(slotMock).toHaveBeenCalledWith({
			ready: true,
			failed: false,
			treatment: 1,
		});

		done();
	});

	it("should render loading slot when not ready", (done) => {
		const slotMock = jest.fn();
		const loadingMock = jest.fn();

		mocks.$absmartly.isReady.mockReturnValue(false);
		mocks.$absmartly.isFailed.mockReturnValue(false);

		const ready = Promise.resolve(true);
		mocks.$absmartly.ready.mockReturnValue(ready);

		const attributes = {
			attr1: 15,
			attr2: 50,
		};

		const wrapper = mount(Treatment, {
			props: {
				name: "test_exp",
				attributes,
			},
			slots: {
				default: slotMock,
				loading: loadingMock,
			},
			global: {
				mocks,
			},
			shallow: true,
		});

		expect(mocks.$absmartly.treatment).not.toHaveBeenCalled();
		expect(mocks.$absmartly.attributes).not.toHaveBeenCalled();
		expect(slotMock).not.toHaveBeenCalled();
		expect(loadingMock).toHaveBeenCalledTimes(1);
		expect(loadingMock).toHaveBeenCalledWith({
			ready: false,
			failed: false,
		});

		mocks.$absmartly.isReady.mockReturnValue(true);
		mocks.$absmartly.treatment.mockReturnValue(1);

		ready.then(() => {
			wrapper.vm.$nextTick(() => {
				expect(mocks.$absmartly.treatment).toHaveBeenCalledTimes(1);
				expect(mocks.$absmartly.treatment).toHaveBeenCalledWith("test_exp");
				expect(mocks.$absmartly.attributes).toHaveBeenCalledTimes(1);
				expect(mocks.$absmartly.attributes).toHaveBeenCalledWith(attributes);
				expect(slotMock).toHaveBeenCalledTimes(1);
				expect(slotMock).toHaveBeenCalledWith({
					ready: true,
					failed: false,
					treatment: 1,
				});

				done();
			});
		});
	});

	it("should render default slot when not ready", (done) => {
		const slotMock = jest.fn();

		mocks.$absmartly.isReady.mockReturnValue(false);
		mocks.$absmartly.isFailed.mockReturnValue(false);

		const ready = Promise.resolve(true);
		mocks.$absmartly.ready.mockReturnValue(ready);

		const attributes = {
			attr1: 15,
			attr2: 50,
		};

		const wrapper = mount(Treatment, {
			props: {
				name: "test_exp",
				attributes,
			},
			slots: {
				default: slotMock,
			},
			global: {
				mocks,
			},
			shallow: true,
		});

		expect(mocks.$absmartly.treatment).not.toHaveBeenCalled();
		expect(mocks.$absmartly.attributes).not.toHaveBeenCalled();
		expect(slotMock).toHaveBeenCalledTimes(1);
		expect(slotMock).toHaveBeenCalledWith({
			ready: false,
			failed: false,
		});

		slotMock.mockClear();

		mocks.$absmartly.isReady.mockReturnValue(true);
		mocks.$absmartly.treatment.mockReturnValue(1);

		ready.then(() => {
			wrapper.vm.$nextTick(() => {
				expect(mocks.$absmartly.treatment).toHaveBeenCalledTimes(1);
				expect(mocks.$absmartly.treatment).toHaveBeenCalledWith("test_exp");
				expect(mocks.$absmartly.attributes).toHaveBeenCalledTimes(1);
				expect(mocks.$absmartly.attributes).toHaveBeenCalledWith(attributes);
				expect(slotMock).toHaveBeenCalledTimes(1);
				expect(slotMock).toHaveBeenCalledWith({
					ready: true,
					failed: false,
					treatment: 1,
				});

				done();
			});
		});
	});

	it.each([
		[0, "0"],
		[1, "1"],
		[2, "2"],
		[3, "3"],
		[4, "4"],
	])("should render treatment slot %i by index (%s)", (treatment, slot, done) => {
		const slotMock = jest.fn();

		mocks.$absmartly.isReady.mockReturnValue(true);
		mocks.$absmartly.isFailed.mockReturnValue(false);
		mocks.$absmartly.treatment.mockReturnValue(treatment);

		mount(Treatment, {
			props: {
				name: "test_exp",
			},
			slots: {
				[slot]: slotMock,
			},
			global: {
				mocks,
			},
			shallow: true,
		});

		expect(slotMock).toHaveBeenCalledTimes(1);
		expect(slotMock).toHaveBeenCalledWith({
			ready: true,
			failed: false,
			treatment: treatment,
		});

		done();
	});

	it.each([
		[0, "A"],
		[1, "B"],
		[2, "C"],
		[3, "D"],
		[4, "E"],
	])("should render treatment slot %i by alpha (%s)", (treatment, slot, done) => {
		const slotMock = jest.fn();

		mocks.$absmartly.isReady.mockReturnValue(true);
		mocks.$absmartly.isFailed.mockReturnValue(false);
		mocks.$absmartly.treatment.mockReturnValue(treatment);

		mount(Treatment, {
			props: {
				name: "test_exp",
			},
			slots: {
				[slot]: slotMock,
			},
			global: {
				mocks,
			},
			shallow: true,
		});

		expect(slotMock).toHaveBeenCalledTimes(1);
		expect(slotMock).toHaveBeenCalledWith({
			ready: true,
			failed: false,
			treatment,
		});

		done();
	});

	it.each([[0], [1], [2], [3], [4]])("should render default treatment slot for treatment %i", (treatment, done) => {
		const slotMock = jest.fn();

		mocks.$absmartly.isReady.mockReturnValue(true);
		mocks.$absmartly.isFailed.mockReturnValue(false);
		mocks.$absmartly.treatment.mockReturnValue(treatment);

		mount(Treatment, {
			props: {
				name: "test_exp",
			},
			slots: {
				default: slotMock,
			},
			global: {
				mocks,
			},
			shallow: true,
		});

		expect(slotMock).toHaveBeenCalledTimes(1);
		expect(slotMock).toHaveBeenCalledWith({
			ready: true,
			failed: false,
			treatment,
		});

		done();
	});

	it("should throw with no matching slot", (done) => {
		const slotMock = jest.fn();

		mocks.$absmartly.isReady.mockReturnValue(true);
		mocks.$absmartly.isFailed.mockReturnValue(false);
		mocks.$absmartly.treatment.mockReturnValue(2);

		expect(() => {
			jest.spyOn(console, "error").mockImplementation(() => {}); // suppress expected Vue error
			mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					unused: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});
		}).toThrow(new Error("No matching treatment slots. Expected one of C,2,default"));

		expect(slotMock).not.toHaveBeenCalled();

		done();
	});

	it("should not call context.attributes with no attribute property", (done) => {
		const slotMock = jest.fn();
		mocks.$absmartly.isReady.mockReturnValue(true);
		mocks.$absmartly.isFailed.mockReturnValue(false);
		mocks.$absmartly.treatment.mockReturnValue(1);

		mount(Treatment, {
			props: {
				name: "test_exp",
			},
			slots: {
				default: slotMock,
			},
			global: {
				mocks,
			},
			shallow: true,
		});

		expect(mocks.$absmartly.treatment).toHaveBeenCalledTimes(1);
		expect(mocks.$absmartly.treatment).toHaveBeenCalledWith("test_exp");
		expect(mocks.$absmartly.attributes).not.toHaveBeenCalledWith();
		expect(slotMock).toHaveBeenCalledTimes(1);

		done();
	});

	describe("Error Handling", () => {
		it("should handle context failure state", (done) => {
			const slotMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(true);
			mocks.$absmartly.treatment.mockReturnValue(0);

			mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(slotMock).toHaveBeenCalledTimes(1);
			expect(slotMock).toHaveBeenCalledWith({
				ready: true,
				failed: true,
				treatment: 0,
			});

			done();
		});

		it("should handle context failure during loading", (done) => {
			const slotMock = jest.fn();
			const loadingMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(false);
			mocks.$absmartly.isFailed.mockReturnValue(true);

			const ready = Promise.resolve(true);
			mocks.$absmartly.ready.mockReturnValue(ready);

			mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
					loading: loadingMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(loadingMock).toHaveBeenCalledTimes(1);
			expect(loadingMock).toHaveBeenCalledWith({
				ready: false,
				failed: true,
			});

			done();
		});

		it("should recover from not ready to ready state", (done) => {
			const slotMock = jest.fn();
			const loadingMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(false);
			mocks.$absmartly.isFailed.mockReturnValue(true);

			const ready = Promise.resolve(true);
			mocks.$absmartly.ready.mockReturnValue(ready);

			const wrapper = mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
					loading: loadingMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(loadingMock).toHaveBeenCalledWith({
				ready: false,
				failed: true,
			});

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(false);
			mocks.$absmartly.treatment.mockReturnValue(1);

			ready.then(() => {
				wrapper.vm.$nextTick(() => {
					expect(slotMock).toHaveBeenCalledWith({
						ready: true,
						failed: false,
						treatment: 1,
					});
					done();
				});
			});
		});

		it("should pass failed=true when context fails after ready", (done) => {
			const slotMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(true);
			mocks.$absmartly.treatment.mockReturnValue(0);

			mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(slotMock).toHaveBeenCalledWith(
				expect.objectContaining({
					failed: true,
				})
			);

			done();
		});
	});

	describe("Lifecycle", () => {
		it("should handle treatment value of 0 correctly", (done) => {
			const slotMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(false);
			mocks.$absmartly.treatment.mockReturnValue(0);

			mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(slotMock).toHaveBeenCalledWith({
				ready: true,
				failed: false,
				treatment: 0,
			});

			done();
		});

		it("should update state after ready promise resolves", (done) => {
			const slotMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(false);
			mocks.$absmartly.isFailed.mockReturnValue(false);

			let resolveReady;
			const ready = new Promise((resolve) => {
				resolveReady = resolve;
			});
			mocks.$absmartly.ready.mockReturnValue(ready);

			const wrapper = mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(slotMock).toHaveBeenCalledWith({
				ready: false,
				failed: false,
			});

			slotMock.mockClear();
			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.treatment.mockReturnValue(2);

			resolveReady(true);

			ready.then(() => {
				wrapper.vm.$nextTick(() => {
					expect(slotMock).toHaveBeenCalledWith({
						ready: true,
						failed: false,
						treatment: 2,
					});
					done();
				});
			});
		});

		it("should render wrapper div element", (done) => {
			const slotMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(false);
			mocks.$absmartly.treatment.mockReturnValue(1);

			const wrapper = mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
			});

			expect(wrapper.element.tagName).toBe("DIV");

			done();
		});

		it("should handle multiple slot options with priority", (done) => {
			const defaultMock = jest.fn();
			const indexMock = jest.fn();
			const alphaMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(false);
			mocks.$absmartly.treatment.mockReturnValue(1);

			mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					B: alphaMock,
					1: indexMock,
					default: defaultMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(alphaMock).toHaveBeenCalledTimes(1);
			expect(indexMock).not.toHaveBeenCalled();
			expect(defaultMock).not.toHaveBeenCalled();

			done();
		});
	});

	describe("Error Handling - Promise Rejection", () => {
		it("should set failed to true when context.ready() rejects", async () => {
			const slotMock = jest.fn();
			const loadingMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(false);
			mocks.$absmartly.isFailed.mockReturnValue(false);

			let rejectReady;
			const ready = new Promise((_, reject) => {
				rejectReady = reject;
			});
			mocks.$absmartly.ready.mockReturnValue(ready);

			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			const wrapper = mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
					loading: loadingMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(loadingMock).toHaveBeenCalledWith({
				ready: false,
				failed: false,
			});

			rejectReady(new Error("network error"));

			await new Promise((r) => setTimeout(r, 10));
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.failed).toBe(true);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"ABSmartly context failed to initialize:",
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});
	});

	describe("Nullish Coalescing", () => {
		it("should use nullish coalescing so treatment 0 is passed correctly", (done) => {
			const slotMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(false);
			mocks.$absmartly.treatment.mockReturnValue(0);

			mount(Treatment, {
				props: {
					name: "test_exp",
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(slotMock).toHaveBeenCalledWith({
				ready: true,
				failed: false,
				treatment: 0,
			});

			done();
		});
	});

	describe("Attributes Handling", () => {
		it("should handle empty attributes object", (done) => {
			const slotMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(false);
			mocks.$absmartly.treatment.mockReturnValue(1);

			mount(Treatment, {
				props: {
					name: "test_exp",
					attributes: {},
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(mocks.$absmartly.attributes).toHaveBeenCalledWith({});

			done();
		});

		it("should pass complex attributes to context", (done) => {
			const slotMock = jest.fn();
			const complexAttributes = {
				string: "value",
				number: 42,
				boolean: true,
				array: [1, 2, 3],
				nested: { key: "value" },
			};

			mocks.$absmartly.isReady.mockReturnValue(true);
			mocks.$absmartly.isFailed.mockReturnValue(false);
			mocks.$absmartly.treatment.mockReturnValue(1);

			mount(Treatment, {
				props: {
					name: "test_exp",
					attributes: complexAttributes,
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(mocks.$absmartly.attributes).toHaveBeenCalledWith(complexAttributes);

			done();
		});

		it("should not call attributes when not ready", (done) => {
			const slotMock = jest.fn();

			mocks.$absmartly.isReady.mockReturnValue(false);
			mocks.$absmartly.isFailed.mockReturnValue(false);

			const ready = Promise.resolve(true);
			mocks.$absmartly.ready.mockReturnValue(ready);

			mount(Treatment, {
				props: {
					name: "test_exp",
					attributes: { attr: "value" },
				},
				slots: {
					default: slotMock,
				},
				global: {
					mocks,
				},
				shallow: true,
			});

			expect(mocks.$absmartly.attributes).not.toHaveBeenCalled();

			done();
		});
	});
});
