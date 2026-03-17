import { inject, ref, computed, readonly, onScopeDispose } from "vue";

export const ABSMARTLY_INJECTION_KEY = Symbol("absmartly");

export function useABSmartly() {
	const context = inject(ABSMARTLY_INJECTION_KEY);

	if (!context) {
		throw new Error(
			"useABSmartly() requires the ABSmartlyVue plugin to be installed. " +
				"Call app.use(ABSmartlyVue, options) before using this composable."
		);
	}

	const ready = ref(context.isReady());
	const failed = ref(context.isFailed());

	let disposed = false;
	onScopeDispose(() => {
		disposed = true;
	});

	if (!ready.value) {
		context
			.ready()
			.then(() => {
				if (disposed) return;
				ready.value = context.isReady();
				failed.value = context.isFailed();
			})
			.catch((err) => {
				if (disposed) return;
				failed.value = true;
				console.error("ABSmartly context failed to initialize:", err);
			});
	}

	const treatmentCache = new Map();
	function treatment(name) {
		if (!treatmentCache.has(name)) {
			treatmentCache.set(
				name,
				computed(() => {
					if (!ready.value) return 0;
					return context.treatment(name);
				})
			);
		}
		return treatmentCache.get(name);
	}

	function variableValue(key, defaultValue) {
		return computed(() => {
			if (!ready.value) {
				return defaultValue;
			}
			return context.variableValue(key, defaultValue);
		});
	}

	const peekCache = new Map();
	function peek(name) {
		if (!peekCache.has(name)) {
			peekCache.set(
				name,
				computed(() => {
					if (!ready.value) return 0;
					return context.peek(name);
				})
			);
		}
		return peekCache.get(name);
	}

	function track(goalName, properties) {
		if (!ready.value) {
			console.warn("ABSmartly: tracking before context ready");
		}
		context.track(goalName, properties);
	}

	return {
		context,
		ready: readonly(ready),
		failed: readonly(failed),
		treatment,
		variableValue,
		peek,
		track,
	};
}
