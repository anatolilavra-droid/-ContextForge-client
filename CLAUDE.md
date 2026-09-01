# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                      # install dependencies
npm run dev                      # Vite dev server (http://localhost:5173)
npm run build                    # tsc -b (type-check) && vite build
GITHUB_PAGES=true npm run build  # production build for the GitHub Pages deploy (sets vite base path)
npm run preview                  # serve the production build locally
npm run lint                     # oxlint
npx tsc -p tsconfig.app.json --noEmit   # type-check only, no build output
```

There is no automated test suite (no `npm test`, no test files). Verification
today is: `tsc --noEmit` + `npm run build` + `npm run lint`, plus manually
exercising the app in a real browser (`npm run dev`) — drop/select a
repository, walk the ignore/settings/preview/forge flow, and check the
DevTools console for errors. If you add non-trivial logic, prefer a manual
pass through `npm run dev` over assuming a diff is correct.

Deployment is automatic: pushing to `main` runs `.github/workflows/deploy.yml`,
which builds with `GITHUB_PAGES=true` and publishes `dist/` to GitHub Pages.
The GitHub Pages URL path segment is case-sensitive and must exactly match
the repository's name (`-ContextForge-client`, capital C/F) — this has
already caused a 404 once; if the repo is ever renamed, `vite.config.ts`'s
`base`, `package.json#homepage`, and the README demo link all need updating
together.

## Non-negotiable constraints

This app's entire value proposition is "your source code never leaves the
browser." There is no backend, no API routes, and no network calls anywhere
in the app code — don't add any (analytics, telemetry, a "check for
updates" ping, etc.), even for something that seems harmless. `localStorage`
persists only the `ForgeSettings` object (`lib/defaults.ts`'s
`SETTINGS_STORAGE_KEY`) — never repository source, file contents, or
generated bundles.

## Architecture

### Main thread / worker split

All repository content lives in `src/worker/forge.worker.ts` and is never
pushed into React state wholesale. The main thread only ever holds: file
*metadata* (`RepoFileMeta[]`, paths/sizes/language/inclusion — no content),
one active file's preview, and the final compiled Markdown bundle string.
This split is the reason the UI stays responsive on large repos and it's a
constraint on any new feature, not an implementation detail — don't add a
main-thread code path that reads full file contents or that accumulates
per-file transformed source in a React reducer.

`src/worker/worker-protocol.ts` is the typed contract between the two
sides (`MainToWorkerMessage` / `WorkerToMainMessage` discriminated unions).
`src/hooks/useForgeWorker.ts` owns the `Worker` instance and the reducer
driven by those messages. Selecting a new repository terminates the current
worker and creates a fresh one (`startIngest`); adjusting settings that only
affect inclusion (ignore rules, size limits, include-toggles) sends a
`RESCAN` message to the *same* worker/job instead, which re-applies
`apply-ignore-rules.ts` against already-ingested files without re-reading
anything from disk — this is what makes toggling settings feel instant.

Forge cancellation is cooperative, not preemptive: the worker checks a
per-job `cancelled` flag before/after reading each file and before running
its transform, and again between batches. On a very small/fast job the
whole forge can finish before a `FORGE_CANCEL` message is even delivered —
that's expected, not a bug.

### Ignore pipeline order

`src/worker/apply-ignore-rules.ts` applies exclusion reasons in a fixed,
meaningful order — built-in patterns → `.gitignore` (if the toggle is on)
→ `.contextforgeignore` → toggle-based rules (tests/config/markdown/
lock files/source maps/max-preset fixtures) → user's custom ignore
patterns → force-include overrides. Force-include can override any of the
above but never binary detection or the size-limit checks, which run last
and are treated as safety floors. Every excluded file carries a typed
`ExclusionReasonCode` + human-readable detail, shown in the UI via
`ExclusionReasonBadge`.

### Syntax-aware transforms

`src/worker/transform-source.ts` is a generic AST-edit engine: it collects
byte-range edits (strip a comment, strip a standalone debug call, replace a
function body) from a tree-sitter tree and applies them in one pass,
dropping any edit fully contained inside a larger one. The four
`src/parsers/*-transform.ts` files are pure data — each just declares which
node types are comments, what a "standalone debug call" looks like for
that language (the call's direct parent must be the statement node, which
is what excludes calls used in assignments/conditions/arguments), and which
node types are function bodies. Adding a language means adding one of
these spec files plus a grammar in `parser-registry.ts`, not touching the
engine.

Grammars (`public/grammars/*.wasm`) are loaded lazily per language on first
use via `parser-registry.ts` / `parsers/tree-sitter-loader.ts`. If a
grammar fails to load or a file fails to parse, the transform falls back to
safe normalization (line endings / trailing whitespace only) and records a
warning — it must never throw, and never silently drop/alter source beyond
that safe normalization. Because of the GitHub Pages base-path bug this
project already hit once, grammar and `tree-sitter.wasm` URLs are built
from `import.meta.env.BASE_URL`, not hardcoded absolute paths — keep it
that way if you touch the loader.

### Settings

`ForgeSettings` (preset + toggles + limits + budget + ignoreRules,
`src/app/app-types.ts`) is the one source of truth for forge behavior,
managed by a `useReducer` in `src/hooks/usePersistedSettings.ts` and
persisted to `localStorage`. `lib/defaults.ts#createSettingsForPreset`
derives a full toggle set for a given preset (Safe/Balanced/Architecture/
Maximum); after that, individual toggles can still be flipped independently
— presets are a starting point, not a locked mode.

### Layout shell

`AppShell.tsx`'s root is a fixed `h-dvh` (not `min-h-screen`) with
`overflow-hidden`, and every scrollable region down the tree
(`main`/`section`/`RepositoryTree`'s list/`FileDetailsPanel`) explicitly
sets `min-h-0` on its flex item. This app previously had a real bug where
omitting `min-h-0` let a flex column grow to its content's height instead
of clipping/scrolling internally (classic flexbug), which was invisible on
short content and only showed up with a tall file open on a small viewport.
If you add a new scrollable panel inside this shell, it needs both
`overflow-y-auto`/`overflow-hidden` *and* `min-h-0` on the flex item, or it
can silently reintroduce page-level overflow.

See `README.md` for the user-facing feature walkthrough and screenshots.
