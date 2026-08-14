# Express — Day 5: Debugging

---

## Interview Questions

**Q: What is debugging?**
> Debugging is the process of finding and fixing the cause of unexpected
> behavior in code — by inspecting what the program is actually doing at
> runtime, instead of just guessing from reading the code.

**Q: How do you debug an Express app?**
> Two main ways. For quick visibility into specific values, I use the
> `debug` package — like `console.log`, but silent by default and switched
> on with an environment variable, so the logging can stay in the code
> without cluttering production output. For a genuinely confusing bug, I
> use the Node inspector — run the app with `--inspect`, attach Chrome
> DevTools or VS Code, set a breakpoint, and inspect the actual live values
> of variables at that exact point in execution instead of guessing what to
> print.

---

## Method 1 — Express's Internal Logs

**What it is:** Express has its own internal `debug()` calls buried in its
source code. This flag turns on *Express's own* logging — its settings at
startup, and how it routes each request — not your code, not your
variables.

**Terminal command (Windows):**
```powershell
$env:DEBUG="express:*,router,router:*"; node src/index.ts
```

**What it shows:** lines like `express:application set "etag" to 'weak'`
and `router dispatching GET /users`. Every line describes Express talking
about itself — never `req.body`, never your calculated values, never your
bugs.

**Verdict: not the tool for finding your own bugs.** Only useful for the
rare case where a route genuinely won't match and the reason isn't visible
in your own code.

---

## Method 2 — `debug` in Your Own Code (the one to actually use)

**What it is:** the same tool Express uses internally, but for logging
*your own* messages. Works exactly like `console.log` — same syntax, pass
values directly — except it's **silent by default** and only prints when
switched on.

**Install:**
```powershell
npm install debug
npm install -D @types/debug
```

**Code:**
```ts
import createDebug from 'debug';
const debug = createDebug('myapp:server');

app.get('/', (req, res) => {
  debug('here is my value:', someVariable);   // same as console.log
  res.send('Hello World!');
});
```

**Run silently (default):**
```powershell
node src/index.ts
```

**Run with logs on:**
```powershell
$env:DEBUG="myapp:*"; node src/index.ts
```

**Why this beats console.log:** `console.log` is always on — remove it
manually or it logs in production forever. `debug` statements stay in the
code permanently but are silent unless `DEBUG` is set. No code changes
needed to turn logging on or off.

**Multiple namespaces** (one per concern — auth, db, server) can be created
and enabled selectively:
```powershell
$env:DEBUG="myapp:auth"     # only auth logs
$env:DEBUG="myapp:*"        # everything
```

---

## Method 3 — Setting DEBUG via `.vscode/launch.json`

**What it is:** instead of typing `$env:DEBUG=...` every time, save it once
in a config file. VS Code sets it automatically when launching through the
Run and Debug panel.

**File:** `.vscode/launch.json`
```json
{
  "type": "node",
  "request": "launch",
  "name": "Launch Express app",
  "program": "${workspaceFolder}/src/index.ts",
  "env": { "DEBUG": "express:*,router,router:*" }
}
```

**Steps:**
1. Create `.vscode/launch.json` with the content above (point `program` at
   the real entry file)
2. Open Run and Debug panel (`Ctrl+Shift+D`)
3. Select the config, press play

**Verdict:** optional convenience layer. Only worth setting up once
Methods 1 or 2 are used often enough that retyping the terminal command
becomes annoying.

---

## Key Confusions Resolved

### Where does each thing go?
- Lines shown as terminal commands → type in the **terminal**, never in a
  code file
- `import`/`function` code → goes in `.ts` files
- JSON config like `launch.json` → its own real file at `.vscode/launch.json`

### Is `$env:DEBUG=...` the same as a `.env` file?
No — two different ways to set an environment variable:
- **`.env` + dotenv** — persists, loaded automatically every run (`PORT`,
  `APP_NAME`)
- **`$env:DEBUG=...` typed before a command** — temporary, exists only for
  that one run, gone once the terminal closes

That's why running `node src/index.ts` alone afterward went silent again —
no `DEBUG` variable existed for that specific run.

### How to keep it silent in production?
Simply don't set `DEBUG` on the hosting platform (Railway, Vercel, etc.).
No code change needed — `debug` is silent unless `DEBUG` exists in the
environment. To investigate something live, temporarily add
`DEBUG=myapp:*` in the platform's environment variables panel, check the
logs, then remove it. Code never needs to be touched.

---

## What Was Skipped, and Why

| Section | Why skipped |
|---|---|
| `NODE_DEBUG=http` | Raw socket-level noise; Node itself warns it can leak passwords/auth headers |
| Diagnostics channels | Infrastructure for monitoring tools (DataDog, etc.), not app code — never called directly |
| `DEBUG_COLORS` / `DEBUG_DEPTH` / etc. | Purely cosmetic tuning of `debug` output appearance |

---

## Daily Use Summary

| Tool | Use for |
|---|---|
| `debug` in own code | Routine, ongoing visibility without cluttering the codebase permanently |
| Node inspector (`--inspect` + breakpoints) | A genuinely confusing bug — pause and inspect real live values |
| Express internal `DEBUG=express:*` | Rarely — only when routing itself seems broken |
| `.vscode/launch.json` | Convenience once the above two are used regularly |