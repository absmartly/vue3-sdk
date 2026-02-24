# A/B Smartly Vue3 SDK

A/B Smartly Vue3 SDK for Vue 3 applications using the Composition API.

## Compatibility

The A/B Smartly Vue3 SDK is compatible with Vue 3 versions 3.3.0 and later.

## Getting Started

### Install the SDK

**npm**

```shell
npm install @absmartly/vue3-sdk --save
```

**Directly in the browser**

You can include an optimized and pre-built package directly in your HTML code through unpkg.com.

Simply add the following code to your head section to include the latest published version.

```html
<script src="https://unpkg.com/@absmartly/vue3-sdk"></script>
```

## Security Considerations

⚠️ **IMPORTANT: API Key Exposure**

When using the Vue3 SDK in a client-side application, the API key is embedded in the JavaScript bundle and is **fully visible to end users** through browser DevTools. This is an inherent limitation of client-side SDKs.

**Recommended Security Practices:**

1. **Use Read-Only API Keys**: Configure API keys with read-only permissions for client-side use
2. **Server-Side Proxy**: Implement a server-side proxy to keep API keys server-only
3. **Separate Keys**: Use different API keys for client-side vs server-side with appropriate permission levels
4. **Environment Variables**: Never commit API keys to version control; use environment variables

```javascript
// .env.local (DO NOT commit to git)
VITE_ABSMARTLY_ENDPOINT=https://your-company.absmartly.io/v1
VITE_ABSMARTLY_API_KEY=your-read-only-key
```

See the [Security Best Practices](https://docs.absmartly.com/security) documentation for more information.

## Import and Initialize the SDK

Once the SDK is installed, it can be initialized in your Vue 3 application.

```javascript
import { createApp } from 'vue';
import absmartly from '@absmartly/vue3-sdk';
import App from './App.vue';

const app = createApp(App);

app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: 'YOUR-API-KEY',
    environment: 'production',
    application: 'website',
  },
  context: {
    units: {
      session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
    },
  },
  attributes: {
    user_agent: navigator.userAgent
  },
  overrides: {
    exp_test_development: 1
  }
});

app.mount('#app');
```

**SDK Options**

| Config      | Type                                 | Required? | Default     | Description                                                                                                                                                                   |
| :---------- | :----------------------------------- | :-------: | :---------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| endpoint    | `string`                             |  &#9989;  | `undefined` | The URL to your API endpoint. Most commonly `"your-company.absmartly.io/v1"`                                                                                                  |
| apiKey      | `string`                             |  &#9989;  | `undefined` | Your API key which can be found on the Web Console.                                                                                                                           |
| environment | `string`                             |  &#9989;  | `undefined` | The environment of the platform where the SDK is installed. Environments are created on the Web Console and should match the available environments in your infrastructure.   |
| application | `string`                             |  &#9989;  | `undefined` | The name of the application where the SDK is installed. Applications are created on the Web Console and should match the applications where your experiments will be running. |
| retries     | `number`                             | &#10060;  | `5`         | The number of retries before the SDK stops trying to connect.                                                                                                                 |
| timeout     | `number`                             | &#10060;  | `3000`      | Connection timeout in milliseconds before the SDK will stop trying to connect.                                                                                                |
| eventLogger | `(context, eventName, data) => void` | &#10060;  | `null`      | A callback function which runs after SDK events. See "Using a Custom Event Logger" section below.                                                                             |

### Using a Custom Event Logger

The A/B Smartly SDK can be instantiated with an event logger used for all contexts. The event logger is a callback function that runs after SDK events, allowing you to integrate with your own logging or analytics systems.

```javascript
app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: 'YOUR-API-KEY',
    environment: 'production',
    application: 'website',
    eventLogger: (context, eventName, data) => {
      switch (eventName) {
        case 'error':
          console.error('ABSmartly Error:', data);
          break;
        case 'ready':
          console.log('ABSmartly Context Ready');
          break;
        case 'exposure':
          console.log('Experiment Exposure:', data);
          break;
        case 'goal':
          console.log('Goal Tracked:', data);
          break;
      }
    }
  }
});
```

**Event Types**

The data parameter depends on the type of event. Currently, the SDK logs the following events:

| eventName    | When                                                    | Data                                         |
| ------------ | ------------------------------------------------------- | -------------------------------------------- |
| `"error"`    | `Context` receives an error                             | Error object thrown                          |
| `"ready"`    | `Context` turns ready                                   | Data used to initialize the context          |
| `"refresh"`  | `Context.refresh()` method succeeds                     | Data used to refresh the context             |
| `"publish"`  | `Context.publish()` method succeeds                     | Data sent to the A/B Smartly event collector |
| `"exposure"` | `Context.treatment()` method succeeds on first exposure | Exposure data enqueued for publishing        |
| `"goal"`     | `Context.track()` method succeeds                       | Goal data enqueued for publishing            |
| `"finalize"` | `Context.finalize()` method succeeds the first time     | undefined                                    |

## Create a New Context Request

### Synchronously

The context is created when you initialize the Vue plugin. The SDK will automatically handle the context initialization.

```javascript
import { createApp } from 'vue';
import absmartly from '@absmartly/vue3-sdk';

const app = createApp(App);

app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: 'YOUR-API-KEY',
    environment: 'production',
    application: 'website',
  },
  context: {
    units: {
      session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
    },
  },
  attributes: {
    user_agent: navigator.userAgent
  },
});
```

### Asynchronously

In Vue 3 components using the Composition API, you can access the context asynchronously:

```vue
<script setup>
import { getCurrentInstance, onMounted } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

onMounted(async () => {
  try {
    await absmartly.ready();
    console.log('ABSmartly Context ready!');
  } catch (error) {
    console.error('ABSmartly initialization error:', error);
  }
});
</script>
```

### With Prefetched Data

When doing full-stack experimentation, you can create the context on the server-side and pass the data to the client to avoid an additional round-trip.

```javascript
// Server-side: fetch context data
const contextData = await fetchContextData();

// Client-side: initialize with prefetched data
app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: 'YOUR-API-KEY',
    environment: 'production',
    application: 'website',
  },
  context: {
    units: {
      session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
    },
  },
  attributes: {
    user_agent: navigator.userAgent
  },
  data: contextData,
});
```

### Refreshing the Context with Fresh Experiment Data

For long-running single-page applications, the context is usually created once when the application first loads. However, any experiments started after the context was created will not be triggered. To mitigate this, use the `refreshInterval` option.

```javascript
app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: 'YOUR-API-KEY',
    environment: 'production',
    application: 'website',
  },
  context: {
    units: { session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8' },
    refreshInterval: 5 * 60 * 1000, // refresh every 5 minutes
  },
});
```

Alternatively, call the `refresh()` method manually in your components:

```vue
<script setup>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

const refreshExperiments = async () => {
  try {
    await absmartly.refresh();
    console.log('Experiments refreshed');
  } catch (error) {
    console.error('Refresh error:', error);
  }
};

// Refresh after 5 minutes
setTimeout(refreshExperiments, 5 * 60 * 1000);
</script>
```

### Setting Extra Units

You can add additional units to a context dynamically, for example when a user logs in:

```vue
<script setup>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

const onUserLogin = (userId) => {
  // Add a new unit type
  absmartly.setUnit('user_id', userId);
};
</script>
```

Note: You cannot override an already set unit type as that would be a change of identity. In this case, you must create a new context instead.

## Basic Usage

### Selecting a Treatment

The Vue3 SDK provides multiple ways to select treatments in your components.

#### Using the Treatment Component (Recommended)

The preferred method is using the `<treatment>` component with named slots for each variant.

**Example using treatment alias:**
```vue
<template>
  <treatment name="exp_test_experiment">
    <template #A>
      <MyButton />
    </template>
    <template #B="{ config }">
      <MyButton :color="config.color" />
    </template>
    <template #loading>
      <MySpinner />
    </template>
  </treatment>
</template>

<script setup>
import { Treatment } from '@absmartly/vue3-sdk';
import MyButton from './MyButton.vue';
import MySpinner from './MySpinner.vue';
</script>
```

**Example using treatment index:**
```vue
<template>
  <treatment name="exp_test_experiment">
    <template #0>
      <MyButton />
    </template>
    <template #1="{ config }">
      <MyButton :color="config.color" />
    </template>
    <template #2="{ config }">
      <MyOtherButton :color="config.color" />
    </template>
    <template #loading>
      <MySpinner />
    </template>
  </treatment>
</template>
```

**Example using the default slot:**
```vue
<template>
  <treatment name="exp_test_experiment">
    <template #default="{ config, treatment, ready }">
      <template v-if="ready">
        <MyButton v-if="treatment === 0" />
        <MyButton v-else-if="treatment === 1" :color="config.color" />
        <MyOtherButton v-else-if="treatment === 2" :color="config.color" />
      </template>
      <template v-else>
        <MySpinner />
      </template>
    </template>
  </treatment>
</template>
```

**Scoped Slot Properties:**

The scoped slot provides the following properties:

```typescript
{
  treatment: number;      // Selected variant index (0, 1, 2, etc.)
  config: object;         // Treatment variables for this variant
  ready: boolean;         // Whether the context is ready
  failed: boolean;        // Whether the context failed to load
}
```

If the experiment is not running or the context creation failed, the default values are:
```typescript
{
  treatment: 0,
  config: {},
  ready: true,
  failed: false
}
```

#### Using the Composition API

You can also access treatments directly using Vue 3's Composition API:

```vue
<script setup>
import { computed, getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

const treatment = computed(() => absmartly.treatment('exp_test_experiment'));
const buttonColor = computed(() => {
  if (treatment.value === 0) return 'red';
  if (treatment.value === 1) return 'green';
  return 'blue';
});
</script>

<template>
  <button :style="{ backgroundColor: buttonColor }">
    Click Me
  </button>
</template>
```

### Treatment Variables

Treatment variables are a powerful tool that can be used to automate your experiments. When creating an experiment on the A/B Smartly Web Console, you can assign each variant a set of variables.

For example, let's say you have an experiment to find out what button color generates the most clicks. You have two variants:

- **Variant 0 (Control)**: Default red button
- **Variant 1**: `{ "button.color": "green" }`
- **Variant 2**: `{ "button.color": "blue" }`

**Using Treatment Variables in Options API:**

```vue
<script>
export default {
  computed: {
    buttonColor() {
      return this.$absmartly.variableValue('button.color', 'red');
    }
  }
}
</script>

<template>
  <button :style="{ backgroundColor: buttonColor }">
    Click Me
  </button>
</template>
```

**Using Treatment Variables in Composition API:**

```vue
<script setup>
import { computed, getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

const buttonColor = computed(() =>
  absmartly.variableValue('button.color', 'red')
);
</script>

<template>
  <button :style="{ backgroundColor: buttonColor }">
    Click Me
  </button>
</template>
```

### Peek at Treatment Variants

Although generally not recommended, it is sometimes necessary to peek at a treatment without triggering an exposure. The A/B Smartly SDK provides a `peek()` method for that.

**Options API:**
```vue
<script>
export default {
  mounted() {
    if (this.$absmartly.peek('exp_test_experiment') === 0) {
      console.log('User is in control group (variant 0)');
    } else {
      console.log('User is in treatment group');
    }
  }
}
</script>
```

**Composition API:**
```vue
<script setup>
import { onMounted, getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

onMounted(() => {
  if (absmartly.peek('exp_test_experiment') === 0) {
    console.log('User is in control group (variant 0)');
  } else {
    console.log('User is in treatment group');
  }
});
</script>
```

### Overriding Treatment Variants

During development, it is useful to force a treatment for an experiment. This can be achieved with the `override()` and/or `overrides()` methods.

**At Initialization:**
```javascript
app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: 'YOUR-API-KEY',
    environment: 'development',
    application: 'website',
  },
  context: {
    units: { session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8' },
  },
  overrides: {
    exp_test_development: 1,
  },
});
```

**In Components (Options API):**
```vue
<script>
export default {
  mounted() {
    this.$absmartly.override('exp_test_experiment', 1);

    // Or set multiple overrides at once
    this.$absmartly.overrides({
      exp_test_experiment: 1,
      exp_another_experiment: 0,
    });
  }
}
</script>
```

**In Components (Composition API):**
```vue
<script setup>
import { onMounted, getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

onMounted(() => {
  absmartly.override('exp_test_experiment', 1);

  // Or set multiple overrides at once
  absmartly.overrides({
    exp_test_experiment: 1,
    exp_another_experiment: 0,
  });
});
</script>
```

## Error Handling

The SDK provides comprehensive error handling to help you debug issues during development and production.

### Error Event Handler

You can provide an optional `onError` callback to handle SDK errors globally:

```javascript
app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: 'YOUR-API-KEY',
    environment: 'production',
    application: 'website',
  },
  context: {
    units: { session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8' },
  },
  onError: (error, context) => {
    console.error('[ABSmartly] Error:', error);
    // Send to error tracking service (e.g., Sentry)
    // Sentry.captureException(error, { contexts: { absmartly: context } });
  }
});
```

### Component Error States

The Treatment component provides error state information through scoped slots:

```vue
<template>
  <treatment name="exp_test_experiment">
    <template #default="{ treatment, ready, failed }">
      <div v-if="failed" class="error">
        Experiment failed to load. Showing default variant.
      </div>
      <div v-else-if="!ready" class="loading">
        Loading experiment...
      </div>
      <div v-else>
        <MyButton v-if="treatment === 0" />
        <MyButton v-else :variant="treatment" />
      </div>
    </template>
  </treatment>
</template>
```

### Common Error Scenarios

1. **Missing Configuration**: If you forget to provide `sdkOptions` or `context`, the plugin will throw a clear error during initialization.

2. **Network Failures**: If the context fails to initialize due to network issues, the error will be logged to the console and the `failed` state will be set to `true`.

3. **Invalid Experiment Names**: If you request a treatment for a non-existent experiment, a warning will be logged and the control variant (0) will be returned.

4. **Context Not Ready**: If you try to access treatments before the context is ready, the Treatment component will show the loading slot.

## Cleanup and Lifecycle Management

The SDK automatically manages cleanup when your Vue application unmounts.

### Automatic Cleanup

When your Vue app is unmounted, the SDK automatically closes the context and stops any background refresh timers:

```javascript
// Cleanup happens automatically
app.unmount();
```

### Manual Cleanup

If you need to manually clean up resources (e.g., before hot module reload), you can call:

```javascript
// In your component or app teardown logic
app.config.globalProperties.$absmartlyCleanup();
```

### Component Lifecycle

The Treatment component properly handles its lifecycle to prevent memory leaks:

- **Mount**: Subscribes to context ready events
- **Unmount**: Cancels pending callbacks to prevent "setState on unmounted component" warnings

## Advanced

### Context Attributes

Attributes are used to pass metadata about the user and/or the request. They can be used later in the Web Console to create segments or audiences. Attributes can be set before or after the context is ready.

**Options API:**
```vue
<script>
export default {
  mounted() {
    this.$absmartly.attribute('user_agent', navigator.userAgent);

    this.$absmartly.attributes({
      customer_age: 'new_customer',
      subscription_tier: 'premium',
    });
  }
}
</script>
```

**Composition API:**
```vue
<script setup>
import { onMounted, getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

onMounted(() => {
  absmartly.attribute('user_agent', navigator.userAgent);

  absmartly.attributes({
    customer_age: 'new_customer',
    subscription_tier: 'premium',
  });
});
</script>
```

**Using Attributes in the Treatment Component:**
```vue
<template>
  <treatment
    name="exp_test_experiment"
    :attributes="{ customer_age: 'returning' }"
  >
    <template #default="{ config, treatment, ready }">
      <template v-if="ready">
        <MyButton v-if="treatment === 0" />
        <MyButton v-else-if="treatment === 1" :color="config.color" />
        <MyOtherButton v-else-if="treatment === 2" :color="config.color" />
      </template>
      <template v-else>
        <MySpinner />
      </template>
    </template>
  </treatment>
</template>
```

### Custom Assignments

Sometimes it may be necessary to override the automatic selection of a variant based on external data, such as an API call.

**Options API:**
```vue
<script>
export default {
  async mounted() {
    const chosenVariant = await this.fetchVariantFromAPI();
    this.$absmartly.customAssignment('experiment_name', chosenVariant);

    // Or set multiple custom assignments
    this.$absmartly.customAssignments({
      experiment_name: 1,
      another_experiment_name: 0,
      a_third_experiment_name: 2,
    });
  }
}
</script>
```

**Composition API:**
```vue
<script setup>
import { onMounted, getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

const fetchVariantFromAPI = async () => {
  // API call logic
  return 1;
};

onMounted(async () => {
  const chosenVariant = await fetchVariantFromAPI();
  absmartly.customAssignment('experiment_name', chosenVariant);

  // Or set multiple custom assignments
  absmartly.customAssignments({
    experiment_name: 1,
    another_experiment_name: 0,
    a_third_experiment_name: 2,
  });
});
</script>
```

### Tracking Goals

Use the `track()` method to record user actions. Each action corresponds to a goal defined in the Web Console. Tracking goals allows you to measure the impact of your experiments on user behavior and business metrics.

**Parameters:**
- **goal_name** (String): The name of the goal as defined in the Web Console
- **properties** (Object, optional): Key-value pairs for additional metrics or filtering

**Options API:**
```vue
<script>
export default {
  methods: {
    handleBooking() {
      this.$absmartly.track('booking', {
        price: 10000,
        category: '5 stars',
        free_cancellation: true,
        instance_id: 5350,
      });
    }
  }
}
</script>
```

**Composition API:**
```vue
<script setup>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

const handleBooking = () => {
  absmartly.track('booking', {
    price: 10000,
    category: '5 stars',
    free_cancellation: true,
    instance_id: 5350,
  });
};
</script>

<template>
  <button @click="handleBooking">
    Complete Booking
  </button>
</template>
```

### Publish

Ensure all pending events have been published to the A/B Smartly collector before proceeding. This is useful, for example, before navigating away from the page.

**Options API:**
```vue
<script>
export default {
  methods: {
    async navigateAway() {
      await this.$absmartly.publish();
      window.location = 'https://www.absmartly.com';
    }
  }
}
</script>
```

**Composition API:**
```vue
<script setup>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

const navigateAway = async () => {
  await absmartly.publish();
  window.location = 'https://www.absmartly.com';
};
</script>
```

### Finalize

The `finalize()` method ensures all events have been published and "seals" the context, preventing any further events from being generated.

**Options API:**
```vue
<script>
export default {
  methods: {
    async completeSession() {
      await this.$absmartly.finalize();
      window.location = 'https://www.absmartly.com';
    }
  }
}
</script>
```

**Composition API:**
```vue
<script setup>
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const absmartly = instance.appContext.config.globalProperties.$absmartly;

const completeSession = async () => {
  await absmartly.finalize();
  window.location = 'https://www.absmartly.com';
};
</script>
```

## About A/B Smartly

**A/B Smartly** is the leading provider of state-of-the-art, on-premises, full-stack experimentation platforms for engineering and product teams that want to confidently deploy features as fast as they can develop them.
A/B Smartly's real-time analytics helps engineering and product teams ensure that new features will improve the customer experience without breaking or degrading performance and/or business metrics.

### Have a look at our growing list of clients and SDKs:
- [JavaScript SDK](https://www.github.com/absmartly/javascript-sdk)
- [Java SDK](https://www.github.com/absmartly/java-sdk)
- [PHP SDK](https://www.github.com/absmartly/php-sdk)
- [Swift SDK](https://www.github.com/absmartly/swift-sdk)
- [Vue2 SDK](https://www.github.com/absmartly/vue2-sdk)
- [Vue3 SDK](https://www.github.com/absmartly/vue3-sdk) (this package)
- [React SDK](https://www.github.com/absmartly/react-sdk)
- [Python3 SDK](https://www.github.com/absmartly/python3-sdk)
- [Go SDK](https://www.github.com/absmartly/go-sdk)
- [Ruby SDK](https://www.github.com/absmartly/ruby-sdk)
- [.NET SDK](https://www.github.com/absmartly/dotnet-sdk)
- [Dart SDK](https://www.github.com/absmartly/dart-sdk)
- [Flutter SDK](https://www.github.com/absmartly/flutter-sdk)
- [Rust SDK](https://www.github.com/absmartly/rust-sdk)

## Documentation

- [Full Documentation](https://docs.absmartly.com/)
- [API Reference](https://docs.absmartly.com/docs/sdk-documentation/getting-started)

## License

MIT License - see [LICENSE](LICENSE) for details.