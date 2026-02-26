import { inject, ref, computed } from "vue";

export const ABSMARTLY_INJECTION_KEY = "__absmartly";

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

	if (!ready.value) {
		context.ready().then(() => {
			ready.value = context.isReady();
			failed.value = context.isFailed();
		});
	}

	function treatment(name) {
		return computed(() => {
			if (!ready.value) {
				return 0;
			}
			return context.treatment(name);
		});
	}

	function variableValue(key, defaultValue) {
		return computed(() => {
			if (!ready.value) {
				return defaultValue;
			}
			return context.variableValue(key, defaultValue);
		});
	}

	function peek(name) {
		return computed(() => {
			if (!ready.value) {
				return 0;
			}
			return context.peek(name);
		});
	}

	function track(goalName, properties) {
		context.track(goalName, properties);
	}

	return {
		context,
		ready: computed(() => ready.value),
		failed: computed(() => failed.value),
		treatment,
		variableValue,
		peek,
		track,
	};
}
