# A/B Smartly SDK

A/B Smartly Vue3 SDK

## Compatibility

The A/B Smartly Vue3 SDK is compatible with Vue3 versions
3.3.0 and later.

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

## Import and Initialize the SDK

Once the SDK is installed, it can be initialized in your project.

```javascript
const absmartly = require('@absmartly/vue3-sdk');
// OR with ES6 modules:
import absmartly from '@absmartly/vue3-sdk';

// create vue app ...

app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://sandbox-api.absmartly.com/v1',
    apiKey: ABSMARTLY_API_KEY,
    environment: "production",
    application: "website",
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

```

**SDK Options**

| Config      | Type                                 | Required? |                 Default                 | Description                                                                                                                                                                   |
| :---------- | :----------------------------------- | :-------: | :-------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| endpoint    | `string`                             |  &#9989;  |               `undefined`               | The URL to your API endpoint. Most commonly `"your-company.absmartly.io"`                                                                                                     |
| apiKey      | `string`                             |  &#9989;  |               `undefined`               | Your API key which can be found on the Web Console.                                                                                                                           |
| environment | `"production"` or `"development"`    |  &#9989;  |               `undefined`               | The environment of the platform where the SDK is installed. Environments are created on the Web Console and should match the available environments in your infrastructure.   |
| application | `string`                             |  &#9989;  |               `undefined`               | The name of the application where the SDK is installed. Applications are created on the Web Console and should match the applications where your experiments will be running. |
| retries     | `number`                             | &#10060;  |                   `5`                   | The number of retries before the SDK stops trying to connect.                                                                                                                 |
| timeout     | `number`                             | &#10060;  |                 `3000`                  | An amount of time, in milliseconds, before the SDK will stop trying to connect.                                                                                               |
| eventLogger | `(context, eventName, data) => void` | &#10060;  | See "Using a Custom Event Logger" below | A callback function which runs after SDK events.                                                                                                                              |

### Using a Custom Event Logger

The A/B Smartly SDK can be instantiated with an event logger used for all
contexts. In addition, an event logger can be specified when creating a
particular context, in the `context`.

```javascript
app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: "https://sandbox-api.absmartly.com/v1",
    apiKey: ABSMARTLY_API_KEY,
    environment: "production",
    application: "website",
    eventLogger: (context, eventName, data) => {
      if (eventName == "error") {
        console.error(data);
      }
    }
  }
});
```

The data parameter depends on the type of event. Currently, the SDK logs the
following events:

| eventName    | when                                                    | data                                         |
| ------------ | ------------------------------------------------------- | -------------------------------------------- |
| `"error"`    | `Context` receives an error                             | error object thrown                          |
| `"ready"`    | `Context` turns ready                                   | data used to initialize the context          |
| `"refresh"`  | `Context.refresh()` method succeeds                     | data used to refresh the context             |
| `"publish"`  | `Context.publish()` method succeeds                     | data sent to the A/B Smartly event collector |
| `"exposure"` | `Context.treatment()` method succeeds on first exposure | exposure data enqueued for publishing        |
| `"goal"`     | `Context.track()` method succeeds                       | goal data enqueued for publishing            |
| `"finalize"` | `Context.finalize()` method succeeds the first time     | undefined                                    |

## Create a New Context Request

**Synchronously**

```javascript

app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    endpoint: 'https://sandbox-api.absmartly.com/v1',
    apiKey: ABSMARTLY_API_KEY,
    environment: "production",
    application: "website",
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

**Asynchronously**

```
Creating a context request asynchronously
```

**With Prefetched Data**

```javascript
// somewhere in your application initialization code, before mounting your Vue application
app.use(absmartly.ABSmartlyVue, {
    sdkOptions: {
        endpoint: 'https://sandbox-api.absmartly.com/v1',
        apiKey: ABSMARTLY_API_KEY,
        environment: "production",
        application: "website",
    },
    context: {
        units: {
            session_id: '5ebf06d8cb5d8137290c4abb64155584fbdb64d8',
        },
    },
    attributes: {
        user_agent: navigator.userAgent
    },
    data: prefetchedContext, // assuming prefectedContext has been inject
});

```

**Refreshing the Context with Fresh Experiment Data**

For long-running contexts, the context is usually created once when the
application is first started. However, any experiments being tracked in your
production code, but started after the context was created, will not be
triggered. To mitigate this, we can use the `refreshInterval`
option on the context config.

```javascript
app.use(absmartly.ABSmartlyVue, {
  /* ... */
  context: {
    units: { session_id: "5ebf06d8cb5d8137290c4abb64155584fbdb64d8" },
    refreshInterval: 5 * 60 * 1000,
  },
  /* ... */
});

```

Alternatively, the `refresh()` method can be called manually. The
`refresh()` method pulls updated experiment data from the A/B
Smartly collector and will trigger recently started experiments when
`treatment()` is called again.

```javascript
setTimeout(async () => {
  try {
    this.$absmartly.refresh();
  } catch (error) {
    console.error(error);
  }
}, 5 * 60 * 1000);
```

[//]: # ()
[//]: # (**Setting Extra Units**)

[//]: # ()
[//]: # (You can add additional units to a context by calling the `unit&#40;&#41;` or)

[//]: # (`units&#40;&#41;` methods. These methods may be used, for example, when a user)

[//]: # (logs in to your application and you want to use the new unit type in the)

[//]: # (context.)

[//]: # ()
[//]: # (Please note, you cannot override an already set unit type as that would be)

[//]: # (a change of identity and would throw an exception. In this case, you must)

[//]: # (create a new context instead. The `unit&#40;&#41;` and)

[//]: # (`units&#40;&#41;` methods can be called before the context is ready.)

[//]: # ()
[//]: # (```)

[//]: # (Using the setUnit&#40;&#41; and setUnits methods.)

[//]: # (```)

## Basic Usage

### Selecting A Treatment
The preferred method to select a treatment is using the Treatment component with a named and scoped slot per treatment.
Example using the treatment alias
```vue
<treatment name="exp_test_experiment">
    <template #A>
        <my-button></my-button>
    </template>
    <template #B="{ config }">
        <my-button :color="config.color"></my-button>
    </template>
    <template #loading>
        <my-spinner></my-spinner>
    </template>
</treatment>
```

Example using the treatment index
```vue
<treatment name="exp_test_experiment">
    <template #0>
        <my-button></my-button>
    </template>
    <template #1="{ config }">
        <my-button :color="config.color"></my-button>
    </template>
    <template #2="{ config }">
        <my-other-button :color="config.color"></my-other-button>
    </template>
    <template #loading>
        <my-spinner></my-spinner>
    </template>
</treatment>
```

Example using only the default slot
```vue
<treatment name="exp_test_experiment">
    <template #default="{ config, treatment, ready }">
        <template v-if="ready">
            <my-button v-if="treatment == 0"></my-button>
            <my-button v-else-if="treatment == 1" :color="config.color"></my-button>
            <my-other-button v-else-if="treatment == 2" :color="config.color"></my-other-button>
        </template>
        <template v-else><my-spinner></my-spinner></template>
    </template>
</treatment>
```
The scoped slot properties contain information about the A/B Smartly context and the selected treatment:
```json
{
  "treatment": 1,
  "config": {
    "color": "red"
  },
  "ready": true,
  "failed": false
}
```

If the experiment is not running, or the context creation failed, the slot will be rendered with the following properties:
```json
{
  "treatment": 0,
  "config": {},
  "ready": true,
  "failed": false
}
```
Treatment variables are a powerful tool that can be used to automate your experiments. When creating an experiment on your A/B Smartly Web Console, you can give each variant a set of variables. You can then use your context to pull the values of these variables into your code.

For example, let's say you have an experiment to find out what color of button generates the most clicks on your homepage. In this experiment, you have two variants - *Variant 1* and *Variant 2*. On both of these variants, you have assigned a variable:

- Variant 1: `{ "button.color": "green" }`
- Variant 2: `{ "button.color": "blue" }`
And you wish for the control group ***(Variant 0)*** to have `{ "button.color": red }`.


### Treatment Variables

```javascript
const defaultButtonColorValue = "red";

const buttonColor = this.$absmartly.variableValue(
  "button.color",
  defaultButtonColorValue
);
```

### Peek at Treatment Variants

Although generally not recommended, it is sometimes necessary to peek at
a treatment without triggering an exposure. The A/B Smartly
SDK provides a `peek()` method for that.

```javascript
if (this.$absmartly.peek("exp_test_experiment") == 0) {
  // user is in control group (variant 0)
} else {
  // user is in treatment group
}
```

### Overriding Treatment Variants

During development, for example, it is useful to force a treatment for an
experiment. This can be achieved with the `override()` and/or `overrides()`
methods. These methods can be called before the context is ready.

```javascript
app.use(absmartly.ABSmartlyVue, {
  sdkOptions: {
    /* ... */
  },
  context: {
    /* ... */
  },
  overrides: {
    exp_test_development: 1,
  },
});
```

#### With the override methods
```javascript
this.$absmartly.override("exp_test_experiment", 1); // force variant 1 of treatment
this.$absmartly.overrides({
  exp_test_experiment: 1,
  exp_another_experiment: 0,
});
```

## Advanced

### Context Attributes

Attributes are used to pass meta-data about the user and/or the request.
They can be used later in the Web Console to create segments or audiences.
They can be set using the `attribute()` or `attributes()`
methods, before or after the context is ready.

```javascript
this.$absmartly.attribute("user_agent", navigator.userAgent);

this.$absmartly.attributes({
  customer_age: "new_customer",
});
```

Or directly in templates with the :attributes property of the Treatment component.

```vue
<treatment
  name="exp_test_experiment"
  :attributes="{ customer_age: 'returning' }"
>
  <template #default="{ config, treatment, ready }">
    <template v-if="ready">
      <my-button v-if="treatment == 0"></my-button>
      <my-button v-else-if="treatment == 1" :color="config.color"></my-button>
      <my-other-button
        v-else-if="treatment == 2"
        :color="config.color"
      ></my-other-button>
    </template>
    <template v-else><my-spinner></my-spinner></template>
  </template>
</treatment>
```

### Custom Assignments

Sometimes it may be necessary to override the automatic selection of a
variant. For example, if you wish to have your variant chosen based on
data from an API call. This can be accomplished using the
`customAssignment()` method.

```javascript
const chosenVariant = 1;

this.$absmartly.customAssignment("experiment_name", chosenVariant);
```

If you are running multiple experiments and need to choose different
custom assignments for each one, you can do so using the
`customAssignments()` method.

```javascript
const assignments = {
  experiment_name: 1,
  another_experiment_name: 0,
  a_third_experiment_name: 2,
};

this.$absmartly.customAssignments(assignments);
```

### Publish

Sometimes it is necessary to ensure all events have been published to the
A/B Smartly collector, before proceeding. You can explicitly call the
`publish()` method.

```javascript
await this.$absmartly.publish().then(() => {
  window.location = "https://www.absmartly.com";
});
```

### Finalize

The `finalize()` method will ensure all events have been
published to the A/B Smartly collector, like `publish()`, and will also
"seal" the context, throwing an error if any method that could generate
an event is called.

```javascript
await this.$absmartly.finalize().then(() => {
  window.location = "https://www.absmartly.com";
});
```

### Tracking Goals
Use the `track()` method to record any actions that your customers perform. Each action is known as a goal and corresponds to a `goal_name` as defined in the Web Console. Calling `track()` through the SDKs is the easiest way of getting experimentation data into A/B Smartly and allows you to measure the impact of your experiments on your users' actions and metrics. You can also track goals through the Segment.io integration or by using enrichments to consume them from other event streams and/or databases. In the examples below you can see that the `track()` method can take up to two arguments. The proper data type and syntax for each are:

- **goal_name**: The traffic type of the key in the `track()` call. The expected data type is `String`. You should only pass values that match the names of goals that you have defined in the Web Console, everything else will be ignored.
- **properties** (Optional): An object of key value pairs that can be used to create extra metrics or to filter the goal.

```javascript
var properties = {
  price: 10000,
  category: "5 stars",
  free_cancellation: true,
  instance_id: 5350,
};

this.$absmartly.track("booking", properties);
```