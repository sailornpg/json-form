# Task Plan

Project: JSON Schema Form Engine for Vue 3
Last Updated: 2026-04-27
Status: in_progress

## Goal

Build an engine-first JSON Schema form library for Vue 3 based on `@jsonforms/core + @jsonforms/vue`, with a project-owned wrapper layer, a first-party `Ant Design Vue` renderer set, a config-first public API, and a demo app that proves the architecture against moderately complex form scenarios.

## Approved Inputs

- Design spec: `docs/superpowers/specs/2026-04-21-json-schema-form-engine-design.md`
- Public contract: `JSON Schema + UI Schema`
- Runtime foundation: `@jsonforms/core + @jsonforms/vue`
- First-party UI library: `ant-design-vue`
- Public entry package: `packages/form-kit`

## Phases

| Phase | Status | Outcome |
|-------|--------|---------|
| 0. Repository baseline and workspace reshape | complete | Converted the Vite starter into a library-oriented repo structure with `packages/` and `apps/demo/`, while keeping the demo buildable |
| 1. Tooling and package foundation | complete | Added workspace package manifests, shared TypeScript base config, dependency topology, and a successful full-repo build |
| 2. Engine adapter runtime | in_progress | Minimal `JsonFormsRuntime` wrapper exists and the demo consumes it through package boundaries |
| 3. Ant Design Vue renderer set | in_progress | Minimal control and layout renderers exist for strings, numbers, booleans, enums, groups, and basic layouts |
| 4. Public `form-kit` API | in_progress | `SchemaForm` exists and the demo renders through it, but the public API is still MVP-level |
| 5. Extensions and async behavior | pending | Add renderer registry overrides, field hooks, lifecycle hooks, and provider injection |
| 6. Validation and error pipeline | pending | Add project-level validation hooks, submit normalization, and server error mapping |
| 7. Demo scenarios | pending | Build representative complex forms proving arrays, nesting, tabs, collapse, grid, rules, and async options |
| 8. Testing and verification | pending | Add automated tests and manual verification coverage for critical flows |
| 9. Documentation and release readiness | pending | Document usage, architecture, extension model, and known limits |
| 10. UI-neutral renderer preset and widget protocol | in_progress | Implement the first non-breaking slice from the approved 2026-04-29 renderer preset design |

## Phase Details

### Phase 10. UI-neutral renderer preset and widget protocol

Tasks:

- Add a UI-neutral protocol package for renderer presets, widget types, renderer config, and widget registry.
- Add `rendererPreset` to `SchemaForm` while preserving existing `renderers/cells` behavior.
- Export `antdvPreset` from `renderer-antdv`.
- Move Antdv renderer widget-registry usage onto the shared protocol package.
- Update the demo to pass `antdvPreset` explicitly.
- Validate with the root build.

Exit criteria:

- Existing demo behavior remains compatible.
- Custom widgets still work through `widgets + uischema.options.widget`.
- `rendererPreset` works and direct `renderers/cells` remain higher priority.
- `npm run build` passes.

Status notes:

- In progress. To avoid a package cycle, the implementation will use a small `@json-form/form-protocol` package instead of making `renderer-antdv` import from `form-kit`.

### Phase 0. Repository baseline and workspace reshape

Tasks:

- Inspect the current single-app Vite structure
- Decide whether to use npm workspaces or a lighter same-repo package layout
- Reshape directories into:
  - `packages/engine-adapter`
  - `packages/renderer-antdv`
  - `packages/form-kit`
  - `apps/demo`
- Preserve a working local dev entry as soon as possible

Exit criteria:

- Workspace layout exists
- Root scripts are aligned with the new structure
- The demo app can still boot

Status notes:

- `apps/demo` now owns the moved Vite app files
- `packages/engine-adapter`, `packages/renderer-antdv`, and `packages/form-kit` now exist with placeholder entries
- Root scripts now target the demo app via `apps/demo/vite.config.ts`
- `npm run build` passes and outputs to `dist/demo`

### Phase 1. Tooling and package foundation

Tasks:

- Introduce workspace package manifests
- Add build strategy for packages and demo app
- Share TypeScript config safely across packages
- Decide package entry points and internal dependency directions
- Add `ant-design-vue`, `@jsonforms/core`, and `@jsonforms/vue`

Exit criteria:

- All packages install correctly
- Types resolve across workspace boundaries
- Base build passes

Status notes:

- Root `package.json` now defines workspaces for `apps/*` and `packages/*`
- Shared TypeScript base config exists in `tsconfig.base.json`
- Package manifests and build configs exist for the three planned packages
- Installed dependencies:
  - `@jsonforms/core@3.7.0`
  - `@jsonforms/vue@3.7.0`
  - `ant-design-vue@4.2.6`
- `npm run build` passes across all packages and the demo app

### Phase 2. Engine adapter runtime

Tasks:

- Define internal runtime context types
- Implement JSON Forms assembly and wrapper surface
- Centralize renderer and cell registration
- Define change pipeline, runtime config, and adapter contracts
- Protect the rest of the project from direct low-level JSON Forms coupling

Exit criteria:

- A minimal form can render through the adapter
- Data updates and rules flow through the wrapper
- Internal APIs are typed and bounded

Status notes:

- `packages/engine-adapter/src/JsonFormsRuntime.ts` exists as the first adapter wrapper
- The adapter currently forwards schema, uischema, data, renderers, cells, config, and readonly state
- Change events are normalized and re-emitted upward

### Phase 3. Ant Design Vue renderer set

Tasks:

- Implement core control renderers for string, number, integer, boolean, enum, object, and array use cases
- Implement date and date-time handling
- Implement core layout renderers for vertical, horizontal, group, tabs, collapse, and grid
- Implement baseline cell renderers
- Standardize error and label presentation through `Form.Item`

Exit criteria:

- Main field and layout targets from the spec render correctly
- Required, disabled, visible, and error states reflect runtime data

Status notes:

- Minimal renderers now exist for:
  - string
  - number and integer
  - boolean
  - enum
  - generic layouts
  - group layouts
- This is an MVP renderer set, not the full phase 1 renderer surface

### Phase 4. Public `form-kit` API

Tasks:

- Implement `SchemaForm`
- Export defaults for renderers and cells
- Expose config-first runtime props and events
- Keep advanced extension APIs available without making them the default path

Exit criteria:

- A consumer can render a working form from `jsonSchema + uiSchema + data`
- The public package does not require direct JSON Forms knowledge for standard usage

Status notes:

- `packages/form-kit/src/SchemaForm.ts` exists
- The demo app already imports `SchemaForm` from `@json-form/form-kit`
- The package currently exports default renderers, default cells, and core schema types

### Phase 5. Extensions and async behavior

Tasks:

- Implement renderer override registration
- Implement `resolveFieldProps`
- Implement `resolveFieldOptions`
- Implement lifecycle hooks:
  - `beforeInit`
  - `afterInit`
  - `beforeChange`
  - `afterChange`
  - `beforeSubmit`
  - `afterSubmit`
  - `mapErrors`
- Implement provider injection for options, submit, and related external services

Exit criteria:

- Sync and async field enrichment works
- Complex behavior can be added without embedding business logic inside renderers

### Phase 6. Validation and error pipeline

Tasks:

- Wire standard schema validation output into renderer state
- Add project-level validation hook support
- Implement submit-time normalization
- Implement path-based server error mapping
- Standardize field-level and form-level error handling

Exit criteria:

- Field errors and form errors are distinguishable and consumable
- Submit pipeline can clean and validate outgoing payloads

### Phase 7. Demo scenarios

Tasks:

- Build at least one baseline form
- Build at least two complex forms covering:
  - nested objects
  - arrays
  - tabs
  - collapse
  - grid
  - rules
  - dynamic or async options
- Add debugging affordances to inspect schema, data, and runtime errors

Exit criteria:

- Demo proves the agreed phase 1 capability set
- Demo does not contain package logic that should live in reusable code

### Phase 8. Testing and verification

Tasks:

- Introduce a test runner suitable for Vue 3 package work
- Add unit tests for `engine-adapter`
- Add renderer component tests
- Add integration coverage for representative schemas
- Run manual verification through the demo app

Exit criteria:

- Critical happy path and failure path coverage exists
- The build and tests are repeatable locally

### Phase 9. Documentation and release readiness

Tasks:

- Document quick start usage
- Document extension points and providers
- Document supported schema and layout scope
- Document known limitations and deferred features
- Prepare release-facing README structure if publication is desired later

Exit criteria:

- A developer can understand how to use and extend the library without reading internal code

## Dependencies Between Phases

- Phase 0 blocks all later phases
- Phase 1 blocks Phases 2 through 9
- Phase 2 blocks Phases 3 through 8
- Phase 3 and Phase 4 can overlap after Phase 2 is stable
- Phase 5 depends on Phase 2 and Phase 4
- Phase 6 depends on Phase 2, Phase 3, and Phase 5
- Phase 7 depends on Phases 3 through 6
- Phase 8 depends on at least one usable path through Phases 2 through 7
- Phase 9 starts after Phase 7 has meaningful examples

## Open Decisions To Resolve During Implementation

- Workspace style: npm workspaces only, or a fuller monorepo tool if needed
- Test stack choice for Vue package and renderer testing
- Package build tool choice and output format
- Date component handling details inside `ant-design-vue`
- Whether grid layout stays as a project-specific UI schema enhancement or a stricter custom layout contract

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@jsonforms/vue` integration details shift upstream | Medium | Keep project-owned adapter and public wrapper boundary |
| Renderer scope grows beyond phase 1 | High | Hold the field and layout support line defined in the spec |
| Hooks become an uncontrolled side-effect channel | High | Keep a small explicit lifecycle and typed contexts |
| Workspace refactor breaks the initial dev loop | Medium | Keep demo app bootable from the earliest workspace phase |
| Async options and validation create hidden coupling | Medium | Force async access through providers and standardized hook contracts |

## Validation Gates

- Gate 1: workspace builds after restructure
- Gate 2: minimal schema form renders through `engine-adapter`
- Gate 3: default Ant Design Vue renderers cover the agreed field and layout set
- Gate 4: hooks and providers support at least one real async scenario
- Gate 5: demo app proves at least two or three complex forms
- Gate 6: test and build workflows pass consistently

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Brainstorm companion local server did not stay alive | 1 | Continued in terminal-only mode |
| Git commit of spec could not run | 1 | Repository is not a git worktree in the current workspace |
| Direct `Move-Item src` failed during repo reshape | 1 | Moved the contents after creating `apps/demo/src`, then removed the original directory |
| `npm` rejected `workspace:*` local dependency protocol | 1 | Switched local package references to `file:` dependencies |
| Sandboxed `npm install` could not reach the npm registry | 1 | Re-ran the install with approval outside the sandbox |
| Root dev script forwarded Vite arguments incorrectly | 1 | Used `npm run --workspace @json-form/demo dev -- --host localhost --port 5199` for targeted runtime verification |
| Workspace Vite dev server failed in sandbox with `spawn EPERM` | 1 | Re-ran the workspace dev server outside the sandbox with approval |
| Stopping approved dev-server process failed in sandbox with access denied | 1 | Stopped the process outside the sandbox with approval |
