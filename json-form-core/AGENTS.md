# Repository Guidelines

## Project Structure & Module Organization
This repository is a small Vue 3 + TypeScript + Vite app. Main application code lives in `src/`: `main.ts` boots the app, `App.vue` is the root component, and reusable UI belongs in `src/components/`. Static assets imported by components live in `src/assets/`, while public files served as-is belong in `public/`. Build output such as `dist/` and installed packages in `node_modules/` are generated and should not be edited or committed.

## Build, Test, and Development Commands
- `npm install`: install project dependencies.
- `npm run dev`: start the Vite dev server with hot module replacement.
- `npm run build`: run `vue-tsc -b` for type-checking, then produce a production build in `dist/`.
- `npm run preview`: serve the built app locally for a final check.

There is no dedicated test or lint script in `package.json` yet, so `npm run build` is the main validation command.

## Coding Style & Naming Conventions
Use Vue Single File Components with `<script setup lang="ts">`. Follow the existing 2-space indentation used in `.vue` templates and CSS. Name components in PascalCase, for example `HelloWorld.vue`; use camelCase for variables, refs, and imports such as `heroImg`. Keep styles in `src/style.css` or component-scoped styles, and prefer clear, lowercase class or id selectors like `#next-steps` and `.button-icon`.

## Testing Guidelines
No automated test framework is configured in the current workspace. Until Vitest or another runner is added, validate changes with `npm run build` and a manual browser check through `npm run dev` or `npm run preview`. If tests are introduced, place them next to the code they cover using names like `ComponentName.test.ts`.

## Commit & Pull Request Guidelines
Git history is not available in this workspace, so no repository-specific commit pattern can be confirmed from local logs. Use short, imperative commit messages and prefer Conventional Commit style, for example `feat: add field schema parser` or `fix: correct hero image sizing`.

For pull requests, include a brief summary, the commands you ran to validate the change, and screenshots for UI updates. Link the related issue when one exists, and keep PRs scoped to a single concern.

## Language & Spec Writing Guidelines
When answering questions or writing documentation for this repository, use Chinese by default unless the user explicitly requests another language. Preserve English identifiers, package names, commands, schema keys, and other machine-readable values as written.

When writing spec documents for this repository, write them in Chinese by default unless the user explicitly requests another language.

## Security & Configuration Tips
Do not hardcode secrets or environment-specific values in source files. Keep runtime configuration out of the repo unless it is safe to publish, and avoid committing generated output from `dist/`.
