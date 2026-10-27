# Changelog

## 1.1.0

- Added the `useABSmartly()` composable and the `ABSMARTLY_INJECTION_KEY` export (additive; no breaking changes).
- `Treatment` and `useABSmartly()` detect failed initialization through `isFailed()` after `context.ready()` resolves.
  The JavaScript SDK reports the original error through its configured `eventLogger`; `ready()` does not reject.
- The composable's `treatment()`, `peek()` and `variableValue()` return `0` / the default until `ready` is `true`
  (they do not throw like `context.treatment()` does before ready) and queue no exposure before ready.
