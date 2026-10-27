import { Context, SDK } from "@absmartly/javascript-sdk";
import Treatment from "@/components/Treatment";
import { ABSMARTLY_INJECTION_KEY } from "./useABSmartly";

export default {
	install(app, options) {
		options = Object.assign(
			{},
			{
				globalName: "$absmartly",
				globalComponents: true,
			},
			options
		);

		let context = options.context;

		if (!(context instanceof Context)) {
			const sdkOptions = options.sdkOptions;
			const sdk = new SDK(sdkOptions);

			const contextOptions = Object.assign(
				{},
				{
					refreshPeriod: 5 * 60 * 1000,
				},
				options.contextOptions || {}
			);

			if (options.data) {
				context = sdk.createContextWith(context, options.data, contextOptions);
			} else {
				context = sdk.createContext(context, contextOptions);
			}
		}

		if (options.attributes instanceof Object) {
			context.attributes(options.attributes);
		}

		if (options.overrides instanceof Object) {
			context.overrides(options.overrides);
		}

		app.config.globalProperties.__absmartlyGlobal = options.globalName;
		app.config.globalProperties[options.globalName] = context;

		app.provide("__absmartlyGlobal", options.globalName);
		app.provide(options.globalName, context);
		app.provide(ABSMARTLY_INJECTION_KEY, context);

		if (options.globalComponents) {
			app.component("Treatment", Treatment);
		}
	},
};
