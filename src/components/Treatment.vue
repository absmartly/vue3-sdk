<script>
import { h } from "vue";

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

	data() {
		return {
			ready: false,
			failed: undefined,
			treatment: undefined,
			treatmentNames: undefined,
		};
	},

	beforeMount() {
		const updateState = (context) => {
			this.failed = context.isFailed();

			if (context.isReady()) {
				if (this.attributes instanceof Object) {
					context.attributes(this.attributes);
				}

				this.treatment = context.treatment(this.name);
				this.ready = true;
			}

			if (this.ready) {
				this.treatmentNames = [String.fromCharCode(65 + this.treatment), this.treatment.toString(), "default"];
			} else {
				this.treatmentNames = ["loading", "default"];
			}
		};

		const context = this[this.__absmartlyGlobal];
		updateState(context);

		if (!context.isReady()) {
			// ready() never rejects: on init failure it resolves and the failure is
			// reported through isFailed()/readyError(), which updateState reads.
			context
				.ready()
				.then(() => {
					if (this.$.isUnmounted) return;
					updateState(context);
					if (this.failed) {
						console.error("ABsmartly context failed to initialize:", context.readyError?.());
					}
				})
				.catch((err) => {
					if (this.$.isUnmounted) return;
					console.error("ABsmartly Treatment failed to update:", err);
				});
		}
	},

	render() {
		const findSlot = (obj, names) => {
			for (const name of names) {
				if (name in obj) {
					return name;
				}
			}
			return undefined;
		};

		const props = this.ready
			? {
					treatment: this.treatment ?? 0,
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

		return h("div", [this.$slots[slotName](props)]);
	},
};
</script>
