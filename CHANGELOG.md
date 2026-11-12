# Changelog

## Unreleased

- Depends on `@absmartly/javascript-sdk` 1.14.0 (currently the `feat/sdk-system-attributes` branch, absmartly/javascript-sdk#68),
  which always evaluates audiences and assignment-rule conditions with the configured `application` and `environment`
  names and drops `app_version`. User-set attributes with the same names still win. Neither is published as an attribute.
- **This changes assignment for running experiments.** A unit in an experiment with Audience enforced (`audienceStrict`)
  and an `environment` or `application` condition currently gets variant 0, even when it matches the condition and even
  when the experiment is full-on. After upgrading, a matching unit is randomised normally (or gets the full-on variant).
  Those experiments are broken today; this release fixes them, but their exposures will change. If an audience used
  `app_version`, it no longer matches.
- `includeSystemAttributes` now only publishes `sdk_name` and `sdk_version`; it no longer controls `application` or
  `environment`.
- A custom `client` passed in `sdkOptions` must implement `getApplication()` and `getEnvironment()`, which the context
  now reads.

## 1.1.0

- Added the `useABSmartly()` composable and the `ABSMARTLY_INJECTION_KEY` export (additive; no breaking changes).
- `Treatment` and `useABSmartly()` detect failed initialization through `isFailed()` after `context.ready()` resolves.
  The JavaScript SDK reports the original error through its configured `eventLogger`; `ready()` does not reject.
- The composable's `treatment()`, `peek()` and `variableValue()` return `0` / the default until `ready` is `true`
  (they do not throw like `context.treatment()` does before ready) and queue no exposure before ready.
