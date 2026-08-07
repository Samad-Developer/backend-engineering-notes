# Express — Day 1: Setup, Basic Routing, and Static Files

---

## SECTION 1 — What Express Is and Why It Exists

Express is a framework that sits **on top of** Node's `http` module. It does
not replace anything learned in Node — underneath, it is still
`createServer`, still `req`/`res`, still the same event loop.

What it removes is repetition. Everything Express does was hand-written in
the raw Node stage:

| Raw Node (by hand) | Express |
|---|---|
| `if (method === 'GET' && url === '/')` if-chains | `app.get('/', handler)` |
| `req.on('data')` + `Buffer.concat` + `JSON.parse` | `express.json()` middleware |
| `res.statusCode` + `res.setHeader` + `res.end` | `res.status(201).json(data)` |
| Manual fallback block for 404s | Automatic |
| Repeating helper calls in every branch | `app.use(middleware)` once |

**Important:** Express is deliberately small. It provides routing,
middleware, and the `req`/`res` helpers — nothing else. No database, no
auth, no validation, no enforced folder structure. Those are all separate
packages brought in later.

---

## SECTION 2 — Installation and Setup

### Step 1 — Node version
```bash
node --version
```
Express needs Node 18+. But to run `.ts` files **directly** (no build step),
Node **22.18.0 or higher** is required. Below that, none of the TypeScript
setup below works.

### Step 2 — Create the project
```bash
mkdir 01-hello-world
cd 01-hello-world
npm init -y
```

`npm init` creates `package.json` — the project's manifest file. It asks
for an "entry point," which is just a field recording which file is the
main one. It does not force or run anything.

### Step 3 — Install Express
```bash
npm install express
```
Goes into **`dependencies`** — code the app genuinely needs at runtime on
the production server.

### Step 4 — Install TypeScript + type definitions
```bash
npm install --save-dev typescript @types/express @types/node
```
Goes into **`devDependencies`** — tools needed while *writing* code, not on
the production server.

**Why `@types/*` packages exist:** Express is written in plain JavaScript
and ships no type information. TypeScript has no idea what `res.send()` is
or what properties `req` has. The `@types/*` packages are separate,
community-maintained files that describe those shapes to TypeScript. Same
reason `@types/node` exists — Node itself is not written in TypeScript.

Note: some middleware packages also ship without types. If TypeScript
complains a package is untyped, install its types too (e.g. `@types/cors`
alongside `cors`).

### Step 5 — Create `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

What matters:
- **`noEmit: true`** — TypeScript produces **no** `.js` files. It only
  *checks*. Node runs the `.ts` directly.
- **`erasableSyntaxOnly: true`** — blocks TypeScript features Node cannot
  simply delete (`enum`, `namespace`, parameter properties). Node removes
  types by deleting them; anything needing real transformation won't work.
- **`strict: true`** — full type checking on. This is the setting that
  actually catches bugs.
- **`module: "nodenext"`** — follow Node's own module resolution rules.

### Step 6 — Add `"type": "module"` to `package.json`
**The docs do not mention this, and without it the setup fails.**

Running `npx tsc` with the docs' tsconfig produces:
```
error TS1295: ECMAScript imports and exports cannot be written in a
CommonJS file under 'verbatimModuleSyntax'.
```

Because `verbatimModuleSyntax` + `module: nodenext` require the project to
be an **ES Module** project, but `npm init -y` defaults to CommonJS. Fix:
```json
"type": "module"
```

### Step 7 — Add scripts
```json
"scripts": {
  "start": "node src/index.ts",
  "typecheck": "tsc"
}
```

### Step 8 — Run and type-check
```bash
npm run start       # runs the app
npm run typecheck   # checks types (does NOT run the app)
```

---

## SECTION 3 — Confusion Points and Answers (Setup)

### Q: What happens without `tsconfig.json`?
Without it, `tsc` has no rules to follow — it falls back to loose defaults
that catch almost nothing. Effectively no real type safety. With it
(especially `strict: true`), TypeScript actually catches real bugs.

### Q: Why `import { type Express }` instead of `import { Express }`?
The `type` keyword explicitly marks the import as **type-only** — meaning
"delete this completely before running." At runtime the line becomes just
`import express from 'express'`.

Without `type`, Node cannot always tell whether `Express`/`Request`/
`Response` are meant to be real runtime values or type-only definitions —
they don't exist as real importable values in Express's code, so this can
cause a runtime error.

### Q: What does "Node strips the types" actually mean?
"Strip" means **delete**. Node reads the `.ts` file, deletes the
TypeScript-only parts, and runs the plain JavaScript that's left.

What was written:
```ts
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});
```

What Node actually runs:
```js
app.get('/', (req, res) => {
  res.send('Hello World!');
});
```

`: Request` and `: Response` are simply gone.

### Q: If `tsconfig.json` already exists, why is `npx tsc` still needed?
`tsconfig.json` is **only a settings file** — it holds the rules but checks
nothing by itself. Something has to run those rules against the code, and
that something is the `tsc` command.

`node src/index.ts` never reads `tsconfig.json` at all — it just deletes
types and runs, ignoring every rule.

- **Node's job:** delete type annotations, run what's left, no questions
  asked.
- **`tsc`'s job:** read the type annotations *before* deletion and report
  mismatches.

Node's stripping is **dumb on purpose**. Even this passes:
```ts
const port: number = "three thousand";  // WRONG
```
Node deletes `: number` and runs `const port = "three thousand"` without
complaint. Only `tsc` catches that mismatch.

### Proven live: the same typo, two outcomes
A deliberate typo `res.staus(200)` was introduced:

- `node src/index.ts` → **server started fine, zero warnings.** The bug
  only surfaced when a real request hit that line:
  `TypeError: res.staus is not a function` → `500 Internal Server Error`
  shown to the client.
- `npm run typecheck` → caught instantly, without starting a server:
  `error TS2551: Property 'staus' does not exist on type 'Response'.
  Did you mean 'status'?`

**Habit:** run `npm run typecheck` before committing or deploying.

### Q: `npm run typecheck` vs `npx tsc` — what's the difference?
**None.** `npm run typecheck` just looks up `"typecheck": "tsc"` in
`package.json` and runs `tsc`. A shortcut, not a new tool.

### Q: What is `"scripts"` in package.json?
A place to save shortcut commands. `"start": "node src/index.ts"` means
"when I type `npm run start`, run `node src/index.ts` for me." Pure 1-to-1
substitution — nothing extra happens.

Two reasons to use it: shorter/consistent to type across a team, and if
the real command changes later, only one place needs updating.

### Q: Why `npm run <name>` — why the word "run"?
`run` is the npm sub-command meaning "execute a script from package.json,"
as opposed to `npm install` or `npm init`. Exception: `npm start` and
`npm test` work without `run` as special shortcuts. Every other custom
script name requires `run`.

### Q: `npm error ENOENT — Could not read package.json`
Command was run from the **wrong folder**. `npm run` only looks for
`package.json` in the *current* folder — it does not search subfolders.
Always `cd` into the specific project folder first.

### Q: npm does more than package management?
Correct. "npm" stands for Node Package Manager, but it does three jobs:
- `npm init` — project scaffolding
- `npm install` — actual package management (its original core job)
- `npm run` — task runner

The name is historical. Before npm existed, developers wrote
`package.json` by hand and either typed raw commands every time or wrote
their own shell scripts / Makefiles.

---

## SECTION 4 — Basic Routing

### The formula
```
app.METHOD(PATH, HANDLER)
```
- **`app`** — the Express application object from `express()`
- **`METHOD`** — the HTTP verb in lowercase: `get`, `post`, `put`, `delete`
- **`PATH`** — the URL path: `/`, `/user`, `/api/tasks`
- **`HANDLER`** — the function that runs when method AND path both match

### Direct comparison to the raw Node stage
```js
// Raw Node
if (method === 'GET' && url === '/api/orders') { ... }
if (method === 'POST' && url === '/api/orders') { ... }

// Express
app.get('/api/orders', handler)
app.post('/api/orders', handler)
```
Same two checks happening — Express just does them automatically and stops
looking once matched (what the manual `return` statements were doing).

### The key point: method matters as much as path
`GET /user` and `DELETE /user` are two **completely separate routes** that
happen to share a URL. A path alone does not identify a route.

Verified: with only PUT and DELETE registered for `/user`, a `GET /user`
request correctly returns **404**.

This is how real APIs work: `/api/tasks` means "list all tasks" with GET
and "create a task" with POST — same URL, opposite behavior.

### 404s are automatic
Any unregistered method+path combination returns 404 with no code written
for it. The Day 2 raw-Node fallback block is now built in.

### Mentioned but not yet explained by the docs
"Each route can have one or more handler functions" — meaning multiple
functions can be passed to one route and run in order:
```js
app.get('/user', checkAuth, getUser)
```
This is a preview of **middleware** — the next major topic.

---

## SECTION 5 — Express Generator (brief)

`express-generator` is a tool (`npx express-generator`) that auto-creates a
full folder skeleton — routes, views, public assets, config — instead of
building it by hand.

**Skipping it, for three reasons:** it's built for server-rendered HTML
apps using template engines (Pug, EJS, Handlebars), not JSON APIs consumed
by a separate frontend; it generates plain JavaScript with no TypeScript
support; and auto-generated scaffolding works against learning by building
each piece deliberately.

Worth knowing it exists so the name isn't confusing if a coworker or
tutorial mentions it. The one useful takeaway from that page is the folder
structure it hints at — separating routes into their own files — which is a
real concept to build manually later.

---

## SECTION 6 — Serving Static Files

### What "static" means
Files sent to the client exactly as they are, with no processing — images,
CSS, JavaScript files, PDFs, HTML. The file on disk is what gets sent,
unchanged.

### The one line that handles an entire folder
```js
app.use(express.static('public'));
```
Any request matching a file inside `public/` gets that file sent back
automatically — no route written per file.

### The rule that confuses everyone: "public" is NOT in the URL

| File on disk | URL the browser uses |
|---|---|
| `public/logo.png` | `http://localhost:3000/logo.png` |
| `public/images/cat.jpg` | `http://localhost:3000/images/cat.jpg` |
| `public/css/style.css` | `http://localhost:3000/css/style.css` |

Wrong: `http://localhost:3000/public/logo.png` → **404** (verified)

The folder name is where Express *looks*, not part of what the client
*types*. `public/` effectively becomes the new root.

### Mount path (virtual prefix)
```js
app.use('/static', express.static('public'));
```
Adding a first argument creates a URL prefix that does not exist as a real
folder. `public/images/cat.jpg` is now reached at
`http://localhost:3000/static/images/cat.jpg`. There is no `static` folder
on disk — it's purely a URL label.

### The relative-path trap (important)
The path given to `express.static` is **relative to where the node process
was launched from**, not where the code file lives. This is the same
`process.cwd()` vs `__dirname` distinction from the Node stage.

Project at `D:\myapp\` with `public/` inside it:

```bash
cd D:\myapp
node src/index.ts        # looks for public in D:\myapp\  -> FOUND
```
```bash
cd D:\
node myapp/src/index.ts  # looks for public in D:\  -> NOT FOUND, images break
```

Same code, same files, different terminal location, different result.

**Fix — always use an absolute path:**
```js
app.use(express.static(path.join(__dirname, 'public')));
```

### ESM gotcha the docs' CommonJS example hides
The docs show `path.join(__dirname, 'public')` in a **CommonJS** example.
This project is **ESM** (`"type": "module"`), where `__dirname` does not
exist — it throws `__dirname is not defined in ES module scope`.

ESM equivalent:
```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

### English: relative vs absolute
- **Relative** — depends on where you're starting from. Like "the shop is
  two streets ahead" — useless unless you know where you're standing.
  Example: `public/logo.png`
- **Absolute** — complete and independent, works from anywhere. Like "12
  Main Street, Islamabad." Example: `D:\myapp\public\logo.png`

`path.join(__dirname, 'public')` converts a relative path into an absolute
one, which is why it fixes the problem.

---

## SECTION 7 — How the Client Actually Gets a File (Q&A)

### Q: Do I send the file in the API response?
No. The API returns **a URL string pointing to the file**. The browser then
fetches it with a separate request.

**Step 1 — API returns JSON with a URL:**
```json
{
  "id": 5,
  "title": "Blue Notebook",
  "imageUrl": "http://localhost:3000/images/notebook.jpg"
}
```

**Step 2 — frontend uses that URL:**
```jsx
<img src={product.imageUrl} />
```

When the browser renders that tag, it makes a **second, completely
separate HTTP request** to that URL. That second request is what
`express.static` answers — automatically, no route needed.

The URL string is built manually when saving the file: save to
`public/images/notebook.jpg`, store `/images/notebook.jpg` in the database
alongside the record, return it in the API response.

### Q: What if I don't write `app.use(express.static('public'))`?
Static files **won't work**. Requesting `http://localhost:3000/logo.png`
returns 404 even though the file exists on disk. Express serves nothing by
default — without that line no route matches, so it falls through to 404.

### Q: Why can the browser auto-fetch `<img src>` but API calls need
manual fetch/loading/error handling?
Because the job is completely predictable for an image: fetch bytes,
display them. One thing to do with the result, no decisions needed.

With JSON, the browser has no idea what should happen — should it go into
state? Update a list? Trigger a redirect? Merge with existing data? That's
application logic, which nothing can guess.

Also worth noting: the browser isn't skipping that work for images, just
hiding it. Images do have loading states (progressive rendering), error
states (broken-image icon, the `onError` event), and caching — the browser
just applies sensible defaults because correct behavior is universal. The
tradeoff is losing control: custom retries, skeletons, or conditional
preloading require dropping to manual JavaScript anyway. Which is exactly
why libraries like TanStack Query exist for data fetching — the same
conveniences without giving up control.

---

## SECTION 8 — Is Each Docs Page Relevant?

| Docs page | Relevant? |
|---|---|
| Installing | Yes — fully |
| Hello World | Yes — fully |
| Generator | No — skip, but know it exists |
| Basic Routing | Yes — this is the core of Express |
| Static Files | Partially — know the concept and the absolute-path trap. A separate frontend serves its own assets; this matters later for user-uploaded files and generated exports |
| Examples | No — just a link directory. Return to individual examples *after* learning each topic |

---

## SECTION 9 — What's Next

`app.use()` has now appeared twice (`express.json()`, `express.static()`)
without explanation, and the routing page mentioned "one or more handler
functions" in passing. Both point to the same next topic: **middleware** —
the concept that makes Express click as a whole rather than a collection
of separate tricks.

Also still ahead in routing: route parameters (`/user/:id`), query strings
(`?status=pending`), and splitting routes across multiple files.

---

## How to Run This Folder

```bash
npm install
npm run typecheck   # should print nothing
npm run start
```

Test the routes (Thunder Client or curl.exe):
- `GET  http://localhost:3000/`         → Hello World!
- `POST http://localhost:3000/`         → Got a POST request
- `PUT  http://localhost:3000/user`     → Got a PUT request at /user
- `DELETE http://localhost:3000/user`   → Got a DELETE request at /user
- `GET  http://localhost:3000/user`     → 404 (no GET handler registered)

Test static files:
- `GET http://localhost:3000/css/style.css`   → serves `public/css/style.css`
- `GET http://localhost:3000/sample.txt`      → serves `public/sample.txt`
- `GET http://localhost:3000/public/sample.txt` → 404 (proves "public" is
  not part of the URL)