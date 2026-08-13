# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A personal backend-engineering learning journal, organized as daily lessons. Each lesson lives in
its own numbered folder and pairs a small, runnable code example with a `NOTES.md` write-up of what
was learned. There is no single application, build system, or test suite spanning the repo — every
folder is independent.

Top-level areas:
- `nodejs/` — daily Node.js core-API lessons, numbered `00-...` through the current day
  (`fs`, `path`, `streams`, `process.env`, CommonJS vs ESM, manual HTTP routing, etc.).
- `express/` — a small Express + TypeScript playground (separate from the numbered `nodejs/` days).
- `javascript/` — standalone JS concept notes (e.g. async programming mental model), not tied to a
  day number.

## Working in a lesson **folder**

Each `nodejs/NN-topic/` folder is self-contained:
- `server.js` (or similar) — runnable example code, plain CommonJS (`require`/`module.exports`)
  unless the lesson is specifically about ESM.
- `NOTES.md` — the write-up for that day. Follow the existing structure when adding or editing one:
  `# Day N — Title`, then `## Why this exists`, explanations of the APIs/concepts used, `## What I
  built`, and `## How to run it` with the exact command. Notes are written in first person as
  learning journal entries, not reference documentation — preserve that voice.
- Some folders (`05-process-env`, `express/`) have their own `package.json`/`pnpm-lock.yaml` and
  `node_modules`, independent of the repo root (there is no root `package.json`).

Run a lesson from inside its own folder, e.g.:
```bash
cd nodejs/07-streams && node server.js
cd nodejs/05-process-env && node server.js   # needs its own node_modules (dotenv)
cd express && npx tsx index.ts               # or the pnpm script if one is added
```

There are no lint or test commands in this repo — verification is done by running the example and
observing output/behavior (curl, Thunder Client, or console logs), as described in each `NOTES.md`.

## Conventions to preserve

- Each new lesson gets the next sequential number under `nodejs/` (currently up to `08-`).
- Bare Node HTTP servers use `http.createServer` with a manually destructured `port`/`hostname`,
  called via `server.listen(port, hostname, callback)` — keep this pattern in new bare-server
  examples rather than switching to Express unless the lesson is specifically about Express.
- The `express/` folder uses TypeScript with ESM (`"type": "module"` in `package.json`) and typed
  Express imports (`Express`, `Request`, `Response`, `NextFunction`); this is a different stack from
  the plain-JS `nodejs/` lessons — don't mix the two styles within one folder.
- `.env` files and `node_modules` under lesson folders are gitignored per-folder; don't commit them.
