import { Context } from "@absmartly/javascript-sdk";

declare module "vue" {
	export interface ComponentCustomProperties {
		$absmartly: Context;
	}
}

export {};
