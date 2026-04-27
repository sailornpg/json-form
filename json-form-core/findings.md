# Findings

Last Updated: 2026-04-21

## Repository State

- The current repository started as a minimal Vue 3 + TypeScript + Vite app.
- There is no existing form engine code in `src/`.
- The workspace currently is not a git repository, so git-based history and committing are unavailable in this environment.
- `.superpowers/` was added to `.gitignore` during brainstorming to avoid tracking brainstorm session artifacts.
- The Vite app has now been moved to `apps/demo`.
- Root build and dev scripts now point at `apps/demo/vite.config.ts`.
- Build output for the demo now lands in `dist/demo`.
- Placeholder package directories now exist for `engine-adapter`, `renderer-antdv`, and `form-kit`.
- The repository now uses workspace-aware package manifests, but local package references use `file:` instead of `workspace:*` because the available npm client rejected the workspace protocol.

## Approved Product Direction

- Phase 1 is engine-first, not demo-first.
- The public schema contract is `JSON Schema + UI Schema`.
- The project should use JSON Forms rather than invent a new form engine core.
- The first-party UI implementation is `Ant Design Vue`.
- The public API should be config-first for consumers.

## Architecture Findings

- The preferred layering is:
  - `apps/demo`
  - `packages/form-kit`
  - `packages/renderer-antdv`
  - `packages/engine-adapter`
- `@jsonforms/core` is the schema, state, and rule foundation.
- `@jsonforms/vue` is the Vue binding layer and should be reused instead of rebuilding Vue glue from scratch.
- A project-owned adapter layer is required so consumers are not directly coupled to raw JSON Forms Vue APIs.
- The first implemented runtime wrapper is `packages/engine-adapter/src/JsonFormsRuntime.ts`.
- The first implemented public wrapper is `packages/form-kit/src/SchemaForm.ts`.
- The first implemented renderer MVP lives in `packages/renderer-antdv`.

## Capability Findings

- Phase 1 field support includes:
  - `string`
  - `number`
  - `integer`
  - `boolean`
  - `enum`
  - `const`
  - `object`
  - `array`
  - `default`
  - `format`: `date`, `date-time`, `email`, `uri`
- Phase 1 layout support includes:
  - `VerticalLayout`
  - `HorizontalLayout`
  - `Group`
  - `Categorization` or tabs
  - `Collapse`
  - `Grid`
  - array container layout
  - nested detail or subform rendering
- Advanced composition schema like `oneOf`, `anyOf`, `allOf`, and `if/then/else` are deferred.

## Extension Findings

- Standard JSON Forms rules are the default for conditional visibility and enabled state.
- Project-level hooks are needed for advanced behavior without creating a new DSL.
- Planned field hooks:
  - `resolveFieldProps`
  - `resolveFieldOptions`
- Planned lifecycle hooks:
  - `beforeInit`
  - `afterInit`
  - `beforeChange`
  - `afterChange`
  - `beforeSubmit`
  - `afterSubmit`
  - `mapErrors`
- Providers are the correct boundary for async options, submission, permissions, locale, and schema enhancement.

## Reliability Findings

- Validation should be layered:
  - standard schema validation
  - project-level validation hooks
  - submit-time normalization and validation
- Errors should be normalized into field errors and form-level errors.
- Renderer components should not own cross-field logic or direct async fetching.
- The current MVP build passes, but runtime behavior has only build-level verification so far, not browser-level manual validation.
- The demo bundle is currently large enough to trigger Vite's chunk-size warning after adding Ant Design Vue.
- `SchemaForm` previously had a reactive feedback loop with `@jsonforms/vue`: repeated `change` events wrote equivalent `currentData` and `schemaErrors` back into refs, causing `runtimeConfig` and `additionalErrors` to re-enter JSON Forms and trigger recursive updates.
- Async field options amplified the loop because function-based options were evaluated inside the `resolvedFields` computed chain, creating new Promises during reactive derivation.
- The current fix keeps async option execution inside the watcher, guards all state writes by content equality, and stabilizes renderer/cell references passed to JSON Forms.

## References Created

- Design spec: `docs/superpowers/specs/2026-04-21-json-schema-form-engine-design.md`
- Planning files:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`
- Initial implementation files:
  - `packages/engine-adapter/src/JsonFormsRuntime.ts`
  - `packages/renderer-antdv/src/AntdvControlRenderer.ts`
  - `packages/renderer-antdv/src/AntdvLayoutRenderer.ts`
  - `packages/form-kit/src/SchemaForm.ts`
- Reactive loop fix spec:
  - `docs/superpowers/specs/2026-04-27-schema-form-reactive-loop-fix-spec.md`

## Constraints To Respect During Implementation

- Keep the default path simple for consumers.
- Do not let demo-specific shortcuts leak into package APIs.
- Avoid introducing a custom expression DSL in phase 1.
- Keep the workspace able to run a demo app early, even while package extraction is in progress.
- Keep the initial renderer set intentionally small until the adapter and extension contracts stabilize.
