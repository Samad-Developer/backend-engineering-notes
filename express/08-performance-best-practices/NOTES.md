# Express — Performance Best Practices

Simple explanations of every performance concept covered, split the same
way the official docs split them: things to do in your **code**, and
things to do in your **deployment environment**.

---

## PART 1 — Things to Do in Your Code

### 1. Compression

**What it means:** shrink the response before sending it over the network,
so it downloads faster.

**How:**
```ts
import compression from 'compression';
app.use(compression());
```

**Why it helps:** a smaller response takes less time to travel to the
client, especially on slow connections or large JSON payloads. One line,
real speed gain, no real downside for a small app.

**Note:** at high traffic, this is often better done at the reverse proxy
level (Nginx) instead of in the app itself — offloading the work to the
layer that's already there for exactly this purpose.

---

### 2. Don't Use Synchronous Functions

**What it means:** never use the blocking version of a function —
`fs.readFileSync()` instead of `await fs.readFile()`.

**How:** always pick the async version. Already the habit followed since
the `fs` module was learned.

**Why it matters:** Node runs JavaScript on **one thread**. A synchronous
call **freezes the entire server** until it finishes — no other request
can be handled during that time. One slow sync call, and every user waits,
not just the one who triggered it.

**Extra tool:** `node --trace-sync-io` — a flag that warns if code
accidentally uses a sync function. Worth running once before deploying, to
catch mistakes.

---

### 3. Do Logging Correctly

Two completely different jobs get called "logging," worth keeping
separate:

**Debugging** = temporary, investigative — "why is this specific bug
happening right now." Turn it on, look, turn it off.

**App activity logging** = permanent, ongoing record — "what has the app
been doing." Always running, forever, as a historical record.

#### Why `debug` beats `console.log` for debugging
1. **Silent by default** — `debug()` prints nothing unless `DEBUG=...` is
   set. `console.log` always prints, everywhere, until manually deleted.
2. **Non-blocking when writing to a file** — `console.log` is synchronous
   when its output goes to a file, which is what happens in real
   deployment (server output piped into log files). Synchronous = blocks
   the event loop, same problem as #2 above.

#### What Pino is, and why it's different from `debug`
**Pino's job:** permanently record what the app is doing — every request,
every error — in structured, machine-readable JSON, always on, in
production.

```ts
import pino from 'pino';
const logger = pino();
logger.info({ userId: '5', action: 'created order' });
```
```json
{"level":30,"time":1699999999,"userId":"5","action":"created order"}
```

**Why not just use `debug` for this too:**
- `debug` is designed to be **switched off** most of the time. Logging
  needs to be **always on**.
- `debug`'s output is plain text for a human reading a terminal. Pino's
  output is structured JSON, meant for machines to search and filter later
  ("show me every error for user 5 last Tuesday" needs structured data).
- Pino is built for speed at high, constant volume (every request,
  forever) — `debug` was never designed for that load.

**Simple way to hold both in mind:**
- `debug` -> "let me peek at what's happening right now, then turn it back
  off"
- Pino -> "permanently record everything, so it can be searched later"

**Verdict:** `debug` already in use correctly. Pino is a later addition,
once there's real production traffic to log.

---

### 4. Handle Exceptions Properly

**What it means:** make sure errors are actually caught, not left to crash
the app or leave a request hanging.

**How:** what's already being done —
- `async`/`await` in routes -> Express 5 auto-catches thrown errors and
  rejected promises
- try/catch only needed **inside raw callbacks** (`setTimeout`,
  `setImmediate`, `fs.readFile`'s callback) — code Express cannot see
  because it isn't a returned Promise
- a proper error handler at the bottom of the app

**Why it matters:** an uncaught error crashes the **entire Node process**
— not just that one request, every user gets disconnected.

**A tricky example, resolved:** the docs show try/catch inside a
`setImmediate` wrapping a `JSON.parse`. This isn't a contradiction of "no
try/catch needed" — `setImmediate` is a callback, same category as
`setTimeout`. Express can't see inside callbacks, so a throw there isn't
caught automatically. Written directly with no callback wrapper, the same
`JSON.parse` would need no try/catch at all — Express would catch it like
any other sync throw.

**Respond directly vs `next(err)`:** responding directly (`res.status(400)
.send(...)`) makes sense for an error already known how to handle cleanly
— like "bad JSON, return 400." `next(err)` makes sense for an unexpected
failure, letting a centralized handler log and format it consistently.

**What NOT to do — `uncaughtException`:**
```ts
process.on('uncaughtException', () => { /* do not do this */ });
```
This catches an error that reached the very top with nowhere left to go.
**Never use it to keep the app alive** — once an exception reaches this
point, the process's internal state is corrupted and unpredictable. The
correct fix is to let it crash and restart cleanly (see restarts, below).

---

### 5. Worker Threads for CPU-Intensive Tasks

**What it means:** if a task is heavy computation — not waiting on a
database, actual number-crunching like image resizing or encryption — run
it on a separate thread instead of the main one.

**How:**
```ts
const worker = new Worker('./resize-worker.js', { workerData: req.body.image });
worker.once('message', (result) => res.send(result));
```
A pool library like `piscina` is used in real setups instead of spawning a
new worker per request, since creating one is relatively expensive.

**Why it matters:** heavy computation on the main thread blocks the event
loop, exactly like #2 above — freezing every other request while it runs.
Worker threads let that heavy work happen in parallel without blocking
anything else.

**Key detail:** data passed to a worker is **copied, not shared** —
completely separate memory space.

**Verdict:** not needed yet. Worth remembering for a future CPU-heavy
feature (image processing, etc.).

---

## PART 2 — Things to Do in the Environment

### 6. Set NODE_ENV to "production"

**What it means:** a flag telling Node "this is the real deployment, not a
laptop."

**Who reads it:** Node itself, via `process.env.NODE_ENV`. Express checks
it internally; any code can check it too.

**How to set it:** in the hosting platform's environment variables
settings (Railway/Vercel dashboard) — never in a `.env` file that gets
deployed, and never typed manually in production.

**Why it matters:** Express hides stack traces (security) and caches
things internally when this is set. Measured performance improvement:
**roughly 3x**, from this one setting alone.

---

### 7. Use the Latest LTS Version of Node.js

**What it means:** run on a recent, stable Node release rather than an old
one.

**How:** install a current LTS version, keep it updated over time —
nothing to write in code.

**Why it matters:** every new Node version improves V8 (the engine
executing the JS) — the same code runs faster for free, just by
upgrading.

---

### 8. Ensure the App Automatically Restarts

**What it means:** if the app crashes, something should notice and
restart it automatically instead of leaving it dead.

**How:** entirely handled by Railway/Vercel automatically — not something
configured manually. (Traditional self-hosted setups use a process
manager plus the OS's init system — not relevant to this deployment path.)

**Why it matters:** without it, one crash means the site stays down until
a human manually restarts it. With it, downtime is seconds instead of
hours.

---

## PART 3 — Recognize But Not Implement Yet

Covered conceptually, connects to reverse proxy and Redis knowledge
already in place, but owned by the hosting platform or a later roadmap
stage:

- **Clustering** — running multiple app instances, one per CPU core.
  Instances don't share memory — anything needing to be shared (sessions,
  cache) must use Redis instead of a plain JS variable. This is exactly
  why Redis already sits in the later roadmap.
- **Caching** (Varnish/Nginx) — storing a response so identical future
  requests don't repeat the work.
- **Load balancer** — distributing traffic across multiple app instances;
  usually a reverse proxy itself.
- **Reverse proxy** — already covered in depth on a previous day. This
  page just confirms the same recommendation: run Express behind one in
  production.


## PART 4 — Priority Summary

**Do now, when deploying BookEasy:**
- `app.use(compression())`
- Confirm `NODE_ENV=production` on the host
- Use latest Node LTS

**Already following correctly:**
- No synchronous functions in routes
- try/catch only inside raw callbacks; async/await routes auto-caught
- `debug` package for investigative debugging

**Know the rule, implement later:**
- Never use `uncaughtException` to stay alive
- Worker threads for CPU-heavy work, when a real need appears
- Clustering needs Redis for shared state
- Pino for real production logging; Sentry for monitoring

**Skip entirely — owned by the hosting platform:**
- Process managers, systemd, PM2, manual clustering setup, manual load
  balancer/reverse proxy/caching-server configuration