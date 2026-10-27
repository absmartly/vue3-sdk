export * from "@absmartly/javascript-sdk";

import ABSmartlyVue from "./plugin";
import Treatment from "./components/Treatment.vue";
import { useABSmartly, ABSMARTLY_INJECTION_KEY } from "./useABSmartly";

export { ABSmartlyVue, Treatment, useABSmartly, ABSMARTLY_INJECTION_KEY };
export default { ABSmartlyVue, Treatment, useABSmartly, ABSMARTLY_INJECTION_KEY };
