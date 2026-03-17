# ABsmartly Vue3 SDK

A/B Smartly Vue3 SDK for Vue 3 applications using the Composition API.

## Compatibility

The A/B Smartly Vue3 SDK is compatible with Vue 3 versions 3.3.0 and later.

## Installation

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

## Getting Started

Please follow the [installation](#installation) instructions before trying the following code.

### Initialization

This example assumes an API Key, an Application, and an Environment have been created in the A/B Smartly web console.

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

#### With Optional Parameters

```javascript
app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://your-company.absmartly.io/v1',
    apiKey: 'YOUR-API-KEY',
    environment: 'production',
    application: 'website',
    retries: 3,
    timeout: 5000,
  },
  context: {
    units: {
      session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
    },
  },
});
```

**SDK Options**

| Config      | Type                                 | Required? | Default     | Description                                                                                                                                                                   |
| :---------- | :----------------------------------- | :-------: | :---------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| endpoint    | `string`                             |  &#9989;  | `undefined` | The URL to your API endpoint. Most commonly `"https://your-company.absmartly.io/v1"`                                                                                         |
| apiKey      | `string`                             |  &#9989;  | `undefined` | Your API key which can be found on the Web Console.                                                                                                                           |
| environment | `string`                             |  &#9989;  | `undefined` | The environment of the platform where the SDK is installed. Environments are created on the Web Console and should match the available environments in your infrastructure.   |
| application | `string`                             |  &#9989;  | `undefined` | The name of the application where the SDK is installed. Applications are created on the Web Console and should match the applications where your experiments will be running. |
| retries     | `number`                             | &#10060;  | `5`         | The number of retries before the SDK stops trying to connect.                                                                                                                 |
| timeout     | `number`                             | &#10060;  | `3000`      | Connection timeout in milliseconds.                                                                                                                                           |
| eventLogger | `(context, eventName, data) => void` | &#10060;  | `null`      | A callback function which runs after SDK events.                                                                                                                              |

## Creating a New Context

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
});
```

### Asynchronously

In Vue 3 components using the Composition API, you can access the context asynchronously with the `useABSmartly()` composable:

```vue
<script setup>
import { watch } from 'vue';
import { useABSmartly } from '@absmartly/vue3-sdk';

const { context, ready } = useABSmartly();

watch(ready, (isReady) => {
  if (isReady) {
    console.log('ABSmartly Context ready!');
  }
});
</script>
```

### With Pre-fetched Data

When doing full-stack experimentation, you can create the context on the server-side and pass the data to the client to avoid an additional round-trip.

```javascript
const contextData = await fetchContextData();

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
  data: contextData,
});
```

### Refreshing the Context with Fresh Experiment Data

For long-running single-page applications, the context is usually created once when the application first loads. However, any experiments started after the context was created will not be triggered. To mitigate this, use the `refreshInterval` option in `contextOptions`.

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
  contextOptions: {
    refreshPeriod: 5 * 60 * 1000,
  },
});
```

Alternatively, call the `refresh()` method manually in your components:

```vue
<script setup>
import { useABSmartly } from '@absmartly/vue3-sdk';

const { context } = useABSmartly();

const refreshExperiments = async () => {
  try {
    await context.refresh();
    console.log('Experiments refreshed');
  } catch (error) {
    console.error('Refresh error:', error);
  }
};
</script>
```

### Setting Extra Units

You can add additional units to a context dynamically, for example when a user logs in.

**Note:** You cannot override an already set unit type as that would be a change of identity. In this case, you must create a new context instead.

```vue
<script setup>
import { useABSmartly } from '@absmartly/vue3-sdk';

const { context } = useABSmartly();

const onUserLogin = (userId) => {
  context.setUnit('user_id', userId);
};
</script>
```

## Basic Usage

### Selecting a Treatment

The Vue3 SDK provides multiple ways to select treatments in your components.

#### Using the Treatment Component (Recommended)

The preferred method is using the `<treatment>` component with named slots for each variant.

**Example using treatment alias (A, B, C...):**

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

**Example using treatment index (0, 1, 2...):**

```vue
<template>
  <treatment name="exp_test_experiment">
    <template #0>
      <MyButton />
    </template>
    <template #1="{ config }">
      <MyButton :color="config.color" />
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
        <MyButton v-else :color="config.color" />
      </template>
      <template v-else>
        <MySpinner />
      </template>
    </template>
  </treatment>
</template>
```

#### Using the `useABSmartly()` Composable

The `useABSmartly()` composable provides clean Composition API access to experiments. It returns reactive refs that automatically update when the context becomes ready.

```vue
<script setup>
import { computed } from 'vue';
import { useABSmartly } from '@absmartly/vue3-sdk';

const { treatment, ready } = useABSmartly();

const variant = treatment('exp_test_experiment');
const buttonColor = computed(() => {
  if (variant.value === 0) return 'red';
  if (variant.value === 1) return 'green';
  return 'blue';
});
</script>

<template>
  <button :style="{ backgroundColor: buttonColor }">
    Click Me
  </button>
</template>
```

**Returned values:**

| Property        | Type                                       | Description                                                            |
| :-------------- | :----------------------------------------- | :--------------------------------------------------------------------- |
| `context`       | `Context`                                  | The ABSmartly context instance for direct access.                      |
| `ready`         | `ComputedRef<boolean>`                     | Reactive ref that is `true` when the context is ready.                 |
| `failed`        | `ComputedRef<boolean>`                     | Reactive ref that is `true` when the context has failed.               |
| `treatment`     | `(name: string) => ComputedRef<number>`    | Returns a reactive treatment value (defaults to `0` before ready).     |
| `variableValue` | `(key: string, defaultValue) => ComputedRef` | Returns a reactive variable value (defaults to `defaultValue` before ready). |
| `peek`          | `(name: string) => ComputedRef<number>`    | Like `treatment()` but without triggering an exposure.                 |
| `track`         | `(goalName: string, properties?) => void`  | Tracks a goal event.                                                   |

### Treatment Variables

Treatment variables allow you to configure different values for each variant. When creating an experiment on the A/B Smartly Web Console, you can assign each variant a set of variables.

```vue
<script setup>
import { useABSmartly } from '@absmartly/vue3-sdk';

const { variableValue } = useABSmartly();

const buttonColor = variableValue('button.color', 'red');
</script>

<template>
  <button :style="{ backgroundColor: buttonColor }">
    Click Me
  </button>
</template>
```

### Peek at Treatment Variants

Although generally not recommended, it is sometimes necessary to peek at a treatment without triggering an exposure. The `useABSmartly()` composable provides a reactive `peek()` method for that.

```vue
<script setup>
import { watch } from 'vue';
import { useABSmartly } from '@absmartly/vue3-sdk';

const { peek, ready } = useABSmartly();

const variant = peek('exp_test_experiment');

watch(ready, (isReady) => {
  if (isReady) {
    if (variant.value === 0) {
      console.log('User is in control group (variant 0)');
    } else {
      console.log('User is in treatment group');
    }
  }
});
</script>
```

### Overriding Treatment Variants

During development, it is useful to force a treatment for an experiment. This can be achieved with the `override()` and/or `overrides()` methods.
The `override()` and `overrides()` methods can be called before the context is ready.

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

**In Components:**

```vue
<script setup>
import { onMounted } from 'vue';
import { useABSmartly } from '@absmartly/vue3-sdk';

const { context } = useABSmartly();

onMounted(() => {
  context.override('exp_test_experiment', 1);

  context.overrides({
    exp_test_experiment: 1,
    exp_another_experiment: 0,
  });
});
</script>
```

## Advanced

### Context Attributes

Attributes are used to pass metadata about the user and/or the request. They can be used later in the Web Console to create segments or audiences. Attributes can be set before or after the context is ready.

```vue
<script setup>
import { onMounted } from 'vue';
import { useABSmartly } from '@absmartly/vue3-sdk';

const { context } = useABSmartly();

onMounted(() => {
  context.attribute('user_agent', navigator.userAgent);

  context.attributes({
    customer_age: 'new_customer',
    subscription_tier: 'premium',
  });
});
</script>
```

### Custom Assignments

Sometimes it may be necessary to override the automatic selection of a variant based on external data, such as an API call.

```vue
<script setup>
import { onMounted } from 'vue';
import { useABSmartly } from '@absmartly/vue3-sdk';

const { context } = useABSmartly();

onMounted(async () => {
  const chosenVariant = await fetchVariantFromAPI();
  context.customAssignment('experiment_name', chosenVariant);

  context.customAssignments({
    experiment_name: 1,
    another_experiment_name: 0,
  });
});
</script>
```

### Tracking Goals

Goals are created in the A/B Smartly web console. Use the `track()` method to record user actions.

```vue
<script setup>
import { useABSmartly } from '@absmartly/vue3-sdk';

const { track } = useABSmartly();

const handleBooking = () => {
  track('booking', {
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

### Publishing Pending Data

Sometimes it is necessary to ensure all pending events have been published to the A/B Smartly collector before proceeding. You can explicitly call the `publish()` method.

```vue
<script setup>
import { useABSmartly } from '@absmartly/vue3-sdk';

const { context } = useABSmartly();

const navigateAway = async () => {
  await context.publish();
  window.location = 'https://www.absmartly.com';
};
</script>
```

### Finalizing

The `finalize()` method ensures all events have been published and "seals" the context, preventing any further events from being generated.

```vue
<script setup>
import { useABSmartly } from '@absmartly/vue3-sdk';

const { context } = useABSmartly();

const completeSession = async () => {
  await context.finalize();
  window.location = 'https://www.absmartly.com';
};
</script>
```

### Custom Event Logger

The A/B Smartly SDK can be instantiated with an event logger used for all contexts. The event logger is a callback function that runs after SDK events.

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

| eventName    | When                                                    | Data                                         |
| ------------ | ------------------------------------------------------- | -------------------------------------------- |
| `"error"`    | `Context` receives an error                             | Error object thrown                          |
| `"ready"`    | `Context` turns ready                                   | Data used to initialize the context          |
| `"refresh"`  | `Context.refresh()` method succeeds                     | Data used to refresh the context             |
| `"publish"`  | `Context.publish()` method succeeds                     | Data sent to the A/B Smartly event collector |
| `"exposure"` | `Context.treatment()` method succeeds on first exposure | Exposure data enqueued for publishing        |
| `"goal"`     | `Context.track()` method succeeds                       | Goal data enqueued for publishing            |
| `"finalize"` | `Context.finalize()` method succeeds the first time     | `undefined`                                  |

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
