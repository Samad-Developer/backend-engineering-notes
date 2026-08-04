# Day 8 — Modules Deep Dive: CommonJS vs ES Modules

## Why this exists
`require()` and `module.exports` have been used since Day 1 without asking
why they work that way, or that a completely different, newer syntax
(`import`/`export`) exists and does the same job differently. Real
codebases use both depending on age/setup — understanding both avoids
confusion reading either style.

## What a module actually is
One file of code that can share (export) some of its functions/variables
with other files, and use (import) code from other files — a way to split
a program into multiple organized files instead of one giant file, while
still letting those files talk to each other.

## The history
JavaScript, for most of its history, had no built-in module system at
all — no official `import`/`export` keywords existed. Node needed this
immediately (real programs need multiple files), so it invented its own
system early on: **CommonJS** (`require()`/`module.exports`). Years later,
JavaScript the language itself finally got an official, standardized
module system: **ES Modules (ESM)** — `import`/`export` — the same syntax
browsers use, now natively supported in Node too.

## Syntax side by side

**CommonJS:**
```js
// exporting
module.exports = { greet };

// importing
const { greet } = require('./helpers');
```

**ES Modules:**
```js
// exporting
export function greet(name) { ... }

// importing
import { greet } from './helpers.mjs';
```

## Key technical differences (not just syntax)
- **Loading style**: `require()` loads and executes synchronously — blocks
  until the file is fully read and run. ES Modules were designed with
  async loading in mind from the start.
- **`__dirname`/`__filename` don't exist in ESM** — confirmed with a real
  error: `ReferenceError: __dirname is not defined in ES module scope`.
  ESM uses `import.meta.url` instead.
- **File extensions are mandatory in ESM imports** —
  `import x from './helpers'` fails; must be `'./helpers.mjs'` (or `.js`
  with proper config), extension included. CommonJS works without the
  extension.

## How Node decides which system a file uses
By default, `.js` files are CommonJS. To use ES Modules, either:
- name files `.mjs`, or
- add `"type": "module"` to `package.json` — this makes all `.js` files in
  that project ESM instead, and `.cjs` becomes the escape hatch back to
  CommonJS if needed.

## What I built
Two parallel folders — `commonjs-version/` and `esm-version/` — each with
a `helpers` file exporting a `greet()` function and a `main` file
importing and using it, demonstrating the real syntax and behavioral
differences side by side, including triggering the actual `__dirname`
error in ESM to prove it rather than just stating it.

## Practical decision going forward
Both are legitimate real-world choices. CommonJS is simpler to set up (no
`.mjs`/config needed) and still common in existing Node codebases /
Express tutorials. ESM matches modern JS standards and frontend habits
(Next.js already uses `import`/`export`). Either is fine to continue with;
worth knowing both, which is now the case.

## How to run it
```bash
cd commonjs-version && node main.js
cd esm-version && node main.mjs
```