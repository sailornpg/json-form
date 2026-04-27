# JSON Schema Form Engine Design

Date: 2026-04-21

## Summary

This project will build an engine-first JSON Schema form library for Vue 3. The public contract is `JSON Schema + UI Schema`, the runtime foundation is `@jsonforms/core + @jsonforms/vue`, and the first official UI implementation is an `Ant Design Vue` renderer set.

The goal of phase 1 is not a full product platform. The goal is a stable, reusable form engine with clear package boundaries, a config-first developer API, enough extension points for real business forms, and a demo app that proves the architecture against moderately complex scenarios.

## Scope Decisions

### Confirmed direction

- Engine-first phase 1
- Standard `JSON Schema + UI Schema`
- Based on `@jsonforms/core + @jsonforms/vue`
- Headless core plus official `Ant Design Vue` renderer layer
- Config-first business API
- Library-style package structure from day one
- Standard JSON Forms rules as the default rule mechanism
- Project-owned custom hooks for advanced behavior

### Explicit non-goals for phase 1

- Visual schema designer
- Drag-and-drop form builder
- Custom expression DSL
- Multi-UI-library support in the same phase
- Plugin marketplace style dynamic installation
- Full support for advanced composition schema such as `oneOf`, `anyOf`, `allOf`, `if/then/else`
- SSR and mobile-specific delivery targets

## Architecture

The system is split into four layers with one-way dependencies:

1. `apps/demo`
   A consumer app for examples, debugging, and acceptance scenarios. It must not host core logic.
2. `packages/form-kit`
   The project-owned public API layer. This is the stable package business consumers use.
3. `packages/renderer-antdv`
   The `Ant Design Vue` renderer set. It maps JSON Forms controls and layouts to actual Vue UI components.
4. `packages/engine-adapter`
   The thin adapter over `@jsonforms/core + @jsonforms/vue`. It owns runtime assembly, renderer registration, hook wiring, and upstream isolation.

Underlying dependencies:

- `@jsonforms/core` provides schema-driven state, validation, and rules support.
- `@jsonforms/vue` provides Vue bindings and renderer dispatch.
- `ant-design-vue` exists only in the renderer layer and must not leak into the engine adapter.

### Architectural constraints

- Business users should primarily consume `form-kit`, not `@jsonforms/vue` directly.
- Renderers are replaceable, but only `Ant Design Vue` is first-party in phase 1.
- Demo requirements must validate the engine, not dictate unstable internal APIs.
- The project should own a wrapper boundary so upstream JSON Forms changes do not become breaking changes for consumers.

## Runtime Data Flow

The runtime flow for a form instance is:

1. Consumer provides `jsonSchema`, `uiSchema`, `data`, and runtime config.
2. `form-kit` merges project defaults and injects default renderers, cells, hooks, and providers.
3. `engine-adapter` translates the project input into the JSON Forms Vue runtime context.
4. `renderer-antdv` renders controls and layouts based on JSON Forms state.
5. User interaction flows through a single change path such as `handleChange(path, value)`.
6. `@jsonforms/core` updates data, recalculates validation, and reevaluates rules.
7. Updated visibility, enabled state, errors, and values flow back into the renderers.
8. Project hooks and providers handle advanced behavior such as remote options, side effects, and submit-time transformations.

### Runtime principles

- Standard rules are the default for visibility and enabled state.
- Complex behavior uses hooks and providers, not schema abuse.
- Renderers do not own cross-field logic or direct network access.
- External services are injected, not imported ad hoc inside field components.

## Package Responsibilities

### `packages/engine-adapter`

Responsibilities:

- Wrap `@jsonforms/core + @jsonforms/vue`
- Build the runtime context
- Manage renderer and cell registration
- Wire lifecycle hooks and field hooks
- Provide shared internal types
- Normalize project-level runtime config

Restrictions:

- No `ant-design-vue` dependency
- No business-specific API assumptions

### `packages/renderer-antdv`

Responsibilities:

- Provide control renderers for common schema field types
- Provide layout renderers for groups, tabs, collapse, grids, and arrays
- Provide cell renderers for lightweight input scenarios
- Map field state into `Ant Design Vue` component props and `Form.Item` status

Restrictions:

- No business service access
- No direct async fetching
- No ownership of cross-field orchestration

### `packages/form-kit`

Responsibilities:

- Export the main `SchemaForm` component
- Export recommended defaults for renderers and cells
- Expose the project-facing extension API
- Expose a simplified config-first contract
- Shield business consumers from low-level JSON Forms details

### `apps/demo`

Responsibilities:

- Prove nested object and array scenarios
- Prove tabs, collapse, and grid layouts
- Prove rules, hooks, and remote options
- Act as a manual verification surface and usage guide

Restrictions:

- Do not contain engine logic that should live in packages

## Supported Phase 1 Capabilities

### Field types

Phase 1 should support:

- `string`
- `number`
- `integer`
- `boolean`
- `enum`
- `const`
- `object`
- `array`
- `default`
- Common `format` values: `date`, `date-time`, `email`, `uri`

Representative UI mappings:

- `string` -> `Input`, `Textarea`, `Password`
- `number` / `integer` -> `InputNumber`
- `boolean` -> `Switch` or `Checkbox`
- `enum` -> `Select` or `RadioGroup`
- `format: date` / `date-time` -> date components

### Layout and container types

Phase 1 should support:

- `VerticalLayout`
- `HorizontalLayout`
- `Group`
- `Categorization` / tab-style containers
- `Collapse`
- `Grid`
- Array container layout
- Nested subform or detail panel rendering

Note on `Grid` and `Collapse`:

The project may introduce project-level UI schema enhancements for these layouts, but they must coexist with standard JSON Forms UI schema conventions instead of replacing them globally.

### Rules and complex form behavior

Phase 1 should support:

- Visibility and hidden state
- Enabled and disabled state
- Required-state presentation
- Default value initialization
- Cross-field observation
- Dynamic enumerations
- Async remote options
- Submit-time data cleanup

Division of responsibility:

- JSON Forms rules handle basic conditional state
- Project hooks and providers handle async behavior, remote data, and complex side effects

## Extension Model

The extension model is split into four categories.

### 1. Renderer registry

Purpose:

- Decide which control, layout, or cell renderer should handle a given schema and UI schema combination

Requirements:

- Default renderer set registration
- Partial override of a single renderer
- Schema- or UI-schema-based renderer override
- Optional widget hint support such as `ui:widget`

### 2. Field extension hooks

Purpose:

- Add field behavior without mutating the JSON Schema contract

Phase 1 hooks:

- `resolveFieldProps`
  Used to enrich placeholder, help text, tooltip, disabled state, component props, and style
- `resolveFieldOptions`
  Used to provide sync or async options for select-like controls

### 3. Form lifecycle hooks

Purpose:

- Add controlled cross-cutting behavior around the form lifecycle

Phase 1 lifecycle hooks:

- `beforeInit`
- `afterInit`
- `beforeChange`
- `afterChange`
- `beforeSubmit`
- `afterSubmit`
- `mapErrors`

These hooks must run through a controlled context object. They must not mutate internal engine state arbitrarily.

### 4. Providers and services

Purpose:

- Inject external capabilities without coupling renderers to business infrastructure

Representative providers:

- `optionsProvider`
- `schemaEnhancer`
- `submitHandler`
- `localeProvider`
- `permissionProvider`

## Developer API Shape

The external API is config-first.

The common path for consumers should be:

- Provide `jsonSchema`
- Provide `uiSchema`
- Provide initial `data`
- Optionally override renderers, hooks, or providers

The default experience must be complete enough that consumers do not need to write custom hooks or custom renderers for standard forms.

### Public API expectations

`form-kit` should expose:

- A main `SchemaForm` component
- Default renderer and cell bundles
- Runtime config types
- Extension registration types for advanced users

Advanced customization must be possible, but it should remain a secondary path.

## Validation and Error Handling

Validation is split into three layers.

### 1. Schema validation

Owned by the schema validator behind JSON Forms. This handles standard JSON Schema constraints such as:

- `required`
- `type`
- `format`
- `enum`
- numeric bounds
- string length bounds

### 2. Project-level validation hooks

Used for business rules not naturally represented in JSON Schema, such as:

- start date must be earlier than end date
- a field becomes required under a project-specific state
- values need remote validation or comparison

### 3. Submit-time validation and normalization

Used to produce a stable outgoing payload by:

- final validation
- empty value cleanup
- shape normalization
- type conversion when necessary

### Error model

Errors are normalized into:

- Field errors
- Form-level errors

Server or remote validation failures should pass through `mapErrors` and become normalized path-based errors with message and severity.

### Failure handling principles

- Renderers must not silently swallow errors
- Async provider failures must degrade gracefully
- Dynamic options failure must surface a usable empty or error state
- Hook failures must not hard-crash the entire form when a safe degradation path exists
- Development mode should expose useful diagnostics; production mode should expose controlled output

## Testing Strategy

The current repository does not yet have a test framework, so phase 1 should introduce one as part of implementation planning.

Minimum test layers:

- Unit tests for `engine-adapter`
- Renderer component tests for key `Ant Design Vue` controls and layouts
- Integration tests for representative schemas
- Manual verification through the demo app

Representative integration scenarios:

- Basic field form
- Nested object plus array form
- Tabs, collapse, and grid containers
- Dynamic options
- Cross-field rule behavior

## Acceptance Criteria

Phase 1 is accepted when all of the following are true:

- A consumer can render a functional form from `jsonSchema + uiSchema + data`
- The default `Ant Design Vue` renderer set covers the main phase 1 field and layout targets
- Visibility and enabled-state rules work
- Nested object and array scenarios work
- Dynamic and async options work
- Consumers can register custom renderers
- Consumers can register field hooks and lifecycle hooks
- Submit-time normalization and error mapping work
- The demo app contains at least two or three representative complex forms proving the target architecture

## Risks and Mitigations

### Upstream JSON Forms Vue instability

Risk:

The Vue integration is usable, but the project should not expose raw upstream details as its public API.

Mitigation:

Keep a project-owned `engine-adapter` and `form-kit` public surface so upgrades can be absorbed internally.

### Renderer scope creep

Risk:

Trying to support too many field and layout patterns in phase 1 will slow the core engine and blur priorities.

Mitigation:

Keep phase 1 limited to the agreed field and layout set. Treat advanced schema composition as future scope.

### Hook overgrowth

Risk:

If hooks become an uncontrolled event bus, predictability and testability degrade quickly.

Mitigation:

Keep a small set of explicit hook stages and force all hooks through typed context objects.

## Implementation Notes for Planning

The implementation plan should assume:

- Package structure will be created from the start
- `form-kit` is the public entry
- `engine-adapter` is the internal runtime bridge
- `renderer-antdv` is the first-party UI package
- Demo scenarios are required for validation, not optional extras

The next step after spec approval is implementation planning, not coding directly from this document.
