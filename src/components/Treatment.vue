<script lang="ts">
import { h } from "vue";
import { Context } from "@absmartly/javascript-sdk";

export default {
	name: "Treatment",
	props: {
		name: {
			type: String,
			required: true,
		},

		attributes: {
			type: Object,
			default() {
				return undefined;
			},
		},
	},

	data(): { ready: boolean; failed?: boolean; treatment?: number; treatmentNames?: string[] } {
		return {
			ready: false,
			failed: undefined,
			treatment: undefined,
			treatmentNames: undefined,
		};
	},

	beforeMount() {
		const updateState = (context: Context) => {
			this.failed = context.isFailed();

			if (context.isReady()) {
				if (this.attributes != null) {
					context.attributes(this.attributes);
				}

				this.treatment = context.treatment(this.name);
				this.ready = true;
			}

			if (this.ready) {
				if (this.treatment == null) throw new Error("Context is ready, but treatment is not.");
				this.treatmentNames = [String.fromCharCode(65 + this.treatment), this.treatment.toString(), "default"];
			} else {
				this.treatmentNames = ["loading", "default"];
			}
		};

		// @ts-ignore
		const context: Context = this[this.__absmartlyGlobal];
		updateState(context);

		if (!context.isReady()) {
			context.ready().then(() => {
				updateState(context);
			});
		}
	},

	render() {
		const findSlot = (obj: Record<string, unknown>, names: string[] = []) => {
			for (const name of names) {
				if (name in obj) {
					return name;
				}
			}
			return undefined;
		};

		const props = this.ready
			? {
					treatment: this.treatment || 0,
					ready: this.ready,
					failed: this.failed,
				}
			: {
					ready: this.ready,
					failed: this.failed,
				};

		const slotName = findSlot(this.$slots, this.treatmentNames);
		if (slotName === undefined) {
			throw new Error(`No matching treatment slots. Expected one of ${this.treatmentNames}`);
		}

		return h("div", [this.$slots[slotName]?.(props)]);
	},
};
</script>
