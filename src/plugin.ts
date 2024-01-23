import { Plugin } from "vue";
import { Context, SDK } from "@absmartly/javascript-sdk";
import Treatment from "./components/Treatment.vue";
import { ContextData, ContextOptions, ContextParams } from "@absmartly/javascript-sdk/types/context";
import { SDKOptions } from "@absmartly/javascript-sdk/types/sdk";
import { ClientOptions } from "@absmartly/javascript-sdk/types/client";

const ABsmartlyPlugin: Plugin = {
	install(
		app,
		options: {
			data: ContextData;
			context: Context | ContextParams;
			sdkOptions: SDKOptions & ClientOptions;
			contextOptions: ContextOptions;
			attributes?: Record<string, string | number>;
			overrides?: Record<string, number>;
		},
	) {
		const opts = Object.assign(
			{},
			{
				globalName: "$absmartly",
				globalComponents: true,
			},
			options,
		);

		let context = opts.context;

		if (!(context instanceof Context)) {
			const sdkOptions = opts.sdkOptions;
			const sdk = new SDK(sdkOptions);

			const contextOptions = Object.assign(
				{},
				{
					refreshPeriod: 5 * 60 * 1000,
				},
				opts.contextOptions || {},
			);

			if (opts.data) {
				context = sdk.createContextWith(context, opts.data, contextOptions);
			} else {
				context = sdk.createContext(context, contextOptions);
			}
		}

		if (opts.attributes != null) {
			context.attributes(opts.attributes);
		}

		if (opts.overrides != null) {
			context.overrides(opts.overrides);
		}

		app.config.globalProperties.__absmartlyGlobal = opts.globalName;
		app.config.globalProperties[opts.globalName] = context;

		app.provide("__absmartlyGlobal", opts.globalName);
		app.provide(opts.globalName, context);

		if (opts.globalComponents) {
			app.component("Treatment", Treatment);
		}
	},
};

export default ABsmartlyPlugin;
