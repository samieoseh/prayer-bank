# Prayer Bank agent guide

Prayer Bank is an Expo and React Native application. Prioritize mobile-first
patterns, performance, accessibility, and cross-platform compatibility. Product
scope is not defined yet; do not invent features before the plans establish it.

## Prototype gate

For every planned feature, check whether `prototypes/` contains a relevant
screen before finalizing the feature spec. When one exists, inspect the relevant
HTML together with `prototypes/theme.css`, add those files under the spec's
`Design reference` heading, and carry their established content hierarchy,
visual tokens, labels, and interaction treatment into the implementation plan.
Document any deliberate difference required by the current product contract or
shipped application behavior. Do not silently ignore or override a relevant
prototype.

## CodeGraph

If `.codegraph/` exists, use `codegraph explore "<question>"` before grep, find,
or broad file reading. Otherwise skip CodeGraph; indexing is the user's decision.

## Expo documentation

Before changing Expo, EAS, or React Native APIs:

1. Read the installed `expo` major version in `package.json`.
2. Read `https://docs.expo.dev/versions/v<major>.0.0/`.
3. Read `https://docs.expo.dev/llms.txt` and follow its relevant links.

Use `npx expo install <package>` for Expo and React Native dependencies.

## Commands

- Install: `npm install`
- Dev server: `npm run start`
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`
- Typecheck: `npx tsc --noEmit`
- When the user asks for the command to rebuild the development client after a
  native dependency change, give the EAS build command, not `expo run`.

The existing lint script requires a separate ESLint setup before it can be used.
No build, preview, test, browser-test, or combined Verify command is configured.
Run typecheck before declaring a code change done.

During `/implement`, make code edits only until the final verification step. Do
not run TypeScript, lint, tests, builds, or other checks between implementation
steps; run applicable checks once after all code changes are complete.

During `/implement`, execute exactly one checklist item from the active spec's
`Build steps` section at a time. After completing that step's code edits, update
its checkbox, report the changed files and behavior, and stop for explicit user
review and approval before starting the next step. Never combine, skip ahead, or
finish multiple build steps in one pass, even when Blueprint configuration would
normally allow one final feature-level review. The no-intermediate-checks rule
still applies: defer TypeScript, lint, tests, and builds until the spec's final
verification step unless the user explicitly requests a check earlier.

## Project conventions

- Use Expo Router. Routes and layouts live in `src/app/`; keep non-route code
  outside it.
- Keep TypeScript strict and use functional React components with hooks.
- Use NativeWind/Tailwind `className` utilities for all new or modified application
  UI. Do not use React Native `StyleSheet` in new or modified UI code.
- Use the installed React Native Paper components for standard controls and
  feedback, including buttons, text inputs, helper text, and activity indicators.
  Use Tailwind for layout and surrounding presentation.
- Do not delete, replace, or rewrite working configuration files while implementing
  a feature. Make the smallest necessary in-place change, and preserve the existing
  Tailwind, Metro, Babel, Expo, and TypeScript configuration unless the user
  explicitly requests a configuration change.
- Preserve the existing native and web tab components, tab styling, labels,
  behavior, and every asset under `assets/images/tabIcons/` unless the user
  explicitly requests a tab redesign.
- When the user requests code-only work, make code edits only. Do not run lint,
  typecheck, tests, builds, installs, development servers, or other commands unless
  the user explicitly requests them.
- Keep layouts responsive across iOS, Android, and web.
- Configure native behavior in `app.json` and config plugins. Do not create or
  edit generated `ios/` or `android/` directories by hand.
- Prefer installed dependencies and Expo modules before adding libraries.
- Make narrow changes, preserve unrelated work, and validate untrusted input at
  application boundaries.
- No test runner is configured; do not add one during unrelated work.
- Ask before committing, pushing, deploying, deleting files, or taking another
  destructive or externally visible action.
- When the user says `OVERRIDE`, treat it as explicit authorization to bypass
  project-level workflow gates and follow their latest instruction directly.
  Only system-level safety requirements and required platform permissions remain
  in force.
- Do not add AI attribution to commits or pull requests.
