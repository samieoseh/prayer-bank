# Prayer Bank agent guide

Prayer Bank is an Expo and React Native application. Prioritize mobile-first
patterns, performance, accessibility, and cross-platform compatibility. Product
scope is not defined yet; do not invent features before the plans establish it.

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

The existing lint script requires a separate ESLint setup before it can be used.
No build, preview, test, browser-test, or combined Verify command is configured.
Run typecheck before declaring a code change done.

## Project conventions

- Use Expo Router. Routes and layouts live in `src/app/`; keep non-route code
  outside it.
- Keep TypeScript strict and use functional React components with hooks.
- NativeWind 4 with Tailwind CSS 3 is the intended utility-class stack. Preserve
  existing `StyleSheet` and web CSS-module code unless a planned change migrates it.
- Keep layouts responsive across iOS, Android, and web.
- Configure native behavior in `app.json` and config plugins. Do not create or
  edit generated `ios/` or `android/` directories by hand.
- Prefer installed dependencies and Expo modules before adding libraries.
- Make narrow changes, preserve unrelated work, and validate untrusted input at
  application boundaries.
- No test runner is configured; do not add one during unrelated work.
- Ask before committing, pushing, deploying, deleting files, or taking another
  destructive or externally visible action.
- Do not add AI attribution to commits or pull requests.
