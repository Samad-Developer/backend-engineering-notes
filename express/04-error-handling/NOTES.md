# Express — Day 4: Error Handling

---

## SECTION 1 — The Base

Every app hits errors — a database goes down, a file is missing, bad input
arrives, or there's simply a bug. This page answers one question: **when
something breaks mid-request, how does Express find out, and what happens
to the client?**

Two things can go wrong if this is unclear:

1. The client gets nothing and the request hangs forever
2. **The entire server process crashes** — one bad request takes down the
   app for every user

That second one is not theoretical. Most of this page is about which
situations Express catches automatically and which ones will kill the
process if not handled.

### The one rule that explains everything

> **Express catches errors from code it is directly running, or from a
> Promise you handed it. Anything else is invisible to it.**

Every case below is just that rule applied:

| Situation | Does Express see it? | Why |
|---|---|---|
| `throw` in sync code | Yes | Express is running that code |
| `throw` in an `async` handler | Yes | `async` returns a Promise, Express watches it |
| `return`ed promise chain | Yes | The Promise was handed over |
| Promise not returned | **No** | Express never saw the Promise |
| Callback error (`fs`, older libs) | **No** | Not thrown, not a Promise |
| `setTimeout` callback | **No** | Handler already finished, no Promise |

---

## SECTION 2 — Errors in Synchronous Code

**Automatic. Nothing to do.**

```ts
app.get('/', (req: Request, res: Response) => {
  throw new Error('BROKEN');   // Express catches this on its own
});
```

Express is directly running the handler, so it wraps it and catches the
throw — exactly like a `try/catch` around a normal function call.

### Two kinds of sync errors in real code

**Deliberate** — you decided the request cannot proceed:
```ts
if (!product) {
  throw new AppError('Product not found', 404);
}
```

**Accidental** — a real bug:
```ts
const name = req.body.name.toUpperCase();
// If the client omits "name", this throws a TypeError.
// Express still catches it. The server survives.
```

**Verified:** both returned proper responses and the server stayed alive
through both.

### What "Express will catch this on its own" actually means

It means **the process won't crash and the client will get a response** —
not that the job is done.

- If a custom error handler exists → **that one runs**
- If not → Express's **built-in default handler** runs, sending an HTML
  page (stack trace in dev, `Internal Server Error` in production)

That's exactly why a custom handler is still needed: the default sends
HTML, and a JSON API frontend will break on it.

---

## SECTION 3 — Errors in Asynchronous Code

**Also automatic.** This is an Express 5 improvement — in Express 4 an
async throw crashed the process, which is why older tutorials wrap every
handler in try/catch.

```ts
app.get('/user/:id', async (req: Request, res: Response) => {
  const user = await getUserById(req.params.id);   // no try/catch
  res.send(user);
});
```

**Why it works:** `async` functions **always return a Promise**, and
Express watches returned Promises. If it rejects, Express calls `next(err)`
automatically. It's not that "async is special" — it's that a Promise got
handed over.

### Three failure types, all caught, all treated differently

**Verified live** with a fake database:

| What happened | Client got | Server log got |
|---|---|---|
| **You threw** — user not found | `404` `"User not found"` | `User not found` |
| **DB rejected** — connection failed | `500` `"Something went wrong"` | `Connection to database failed` |
| **Accidental bug** — `null.name` | `500` `"Something went wrong"` | `Cannot read properties of null` |

Only the first is *your decision*. The other two get a generic message so
they don't leak "our database is down" or JavaScript internals to whoever
is probing the API.

### Other things verified

- `throw` **after** an `await` works exactly like sync code
- Rejections you didn't throw yourself are caught too (the DB function
  threw, not the route)
- **Multiple awaits** are fine — if the first rejects, the rest never run
- This applies to **async middleware**, not just routes

### "If you pass anything to next() ... Express regards it as an error"

Two separate claims in that sentence.

**Claim 1 — Express decides based on whether an argument was passed at
all**, not what it is:
```ts
next()                    // continue normally
next(new Error('boom'))   // ERROR
next('some string')       // ERROR  <- even a plain string
next(404)                 // ERROR  <- even a number
next('route')             // the ONE exception - skip to next route
```

**Practical consequence: always pass a real Error object.** Pass a string
and `err.message` is `undefined` and `err instanceof AppError` is false.

**Claim 2 — an in-flight error skips all normal middleware** and jumps to
the first error handler (four parameters). This is why a 404 catch-all
placed *above* an error handler never fires for a thrown error.

---

## SECTION 4 — Working with Promise Chains

**You will almost certainly never write this.** `async`/`await` is what the
docs themselves recommend. This section matters only for reading older
code — but one variant is a process-killer, so it's worth recognising.

### Three versions, real results

| Version | Code | Client got | Server after |
|---|---|---|---|
| **A** | `return Promise.resolve().then(...)` | `500` with the error | alive ✅ |
| **B** | no return, but `.catch(next)` | `500` with the error | alive ✅ |
| **C** | no return, no catch | **nothing** `[000]` | **DEAD** ❌ |

```ts
// A — works
app.get('/', (req, res) => {
  return Promise.resolve().then(() => { throw new Error('BROKEN'); });
});

// B — works
app.get('/', (req, res, next) => {
  Promise.resolve()
    .then(() => { throw new Error('BROKEN'); })
    .catch(next);
});

// C — KILLS THE PROCESS
app.get('/', (req, res) => {
  Promise.resolve().then(() => { throw new Error('BROKEN'); });
});
```

**The difference between A and C is a single `return` keyword.** As the
docs put it: *"If the promise is not returned, Express does not know it
exists."* Nothing was watching, and an unhandled rejection kills Node.

### Why `.catch(next)` works

Shape-matching, not magic:

```ts
.catch(err => next(err))   // explicit
.catch(next)               // identical, shorter
```

`.catch` calls whatever function it's given, passing the error as the first
argument. `next` takes an error as its first argument. Same shape, so
`next` can be handed over directly.

Note: **no parentheses.** `.catch(next)` passes the function;
`.catch(next())` would call it immediately, which is wrong. Same pattern as
`onClick={handleClick}` vs `onClick={handleClick()}` in React.

### Use async/await and this whole section disappears

```ts
app.get('/', async (req, res) => {
  throw new Error('BROKEN');   // no way to make the version-C mistake
});
```

An `async` function returns a Promise automatically — there's no `return`
to forget.

---

## SECTION 5 — Working with Callback APIs

Callbacks give Express **neither a throw nor a Promise**. The error just
appears as an argument inside a function Express isn't watching.

```ts
fs.readFile('/some/path', (err, data) => {
  // Express has already moved on. It has no idea this function exists.
});
```

By the time this callback runs, the route handler already finished. So
**you** must hand the error back with `next(err)`.

### Four working patterns

**Pattern 1 — the default.** Check `err`, pass it on.
```ts
app.get('/', (req, res, next) => {
  fs.readFile('/file-does-not-exist', (err, data) => {
    if (err) {
      next(err);
    } else {
      res.send(data);
    }
  });
});
```

**Pattern 2 — `next` IS the callback** (when the callback returns no data,
only maybe an error):
```ts
app.get('/', [
  (req, res, next) => { fs.writeFile('/path', 'data', next); },
  (req, res) => { res.json({ message: 'written OK' }); },
]);
```
`writeFile`'s callback receives only `(err)`. `next` takes `(err)`. Same
shape-matching trick as `.catch(next)`. Error → `next(err)`. No error →
`next()` and the second handler runs.

**Pattern 3 — get out of the callback fast.** This one is subtle and worth
understanding properly.

```ts
app.get('/', [
  (req, res, next) => {
    fs.readFile(file, 'utf-8', (err, data) => {
      res.locals.data = data;   // just stash it — trivial, can't fail
      next(err);                // leave immediately
    });
  },
  (req, res) => {
    // Back in sync land. If THIS throws, Express catches it.
    res.locals.data = res.locals.data.split(',')[1];
    res.json({ value: res.locals.data });
  },
]);
```

**Why bother?** Same `.split()` call, different location, different
outcome. Inside the callback, a throw kills the process. In the next
handler, Express is running the code, so a throw is caught normally.

That's what *"return to the world of synchronous error handling"* means —
get back into code Express is running, where throwing is safe again.

**Pattern 4 — timers.** `setTimeout` has no `err` argument at all, so
try/catch inside and call `next(err)`:
```ts
app.get('/', (req, res, next) => {
  setTimeout(() => {
    try {
      throw new Error('BROKEN');
    } catch (err) {
      next(err);
    }
  }, 100);
});
```

### Two versions that kill the process — both verified

```ts
// DEAD: throwing inside a callback
fs.readFile('/no-such-file', (err, data) => {
  if (err) throw err;        // nobody catches this
});

// DEAD: timer with no try/catch
setTimeout(() => {
  throw new Error('BROKEN');
}, 50);
```

Both produced: client got **nothing**, server **DEAD**.

### "setTimeout is async — why doesn't Express catch it?"

Because **Express doesn't catch "async code" — it catches Promises you
return.**

```ts
// async function -> returns a Promise -> Express watches it
app.get('/', async (req, res) => { throw new Error('boom'); });   // caught

// setTimeout -> handler returns undefined -> nothing to watch
app.get('/', (req, res) => {
  setTimeout(() => { throw new Error('boom'); }, 100);            // NOT caught
});
```

In the second one the handler registers the callback and **finishes
immediately**, returning `undefined`. 100ms later the callback fires from
the event loop, with the handler long gone from the call stack.

**Better fix — wrap the timer in a Promise:**
```ts
app.get('/', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  throw new Error('boom');   // caught — now part of the Promise chain
});
```

### res.locals

An object attached to `res` that lives for one request — a place to pass
data between handlers.

Same job as `req.user` from the auth middleware. Two conventions:
- **`req.something`** — needs declaration merging in a `.d.ts`
- **`res.locals.something`** — already typed as an open object, no setup

`req` is more common for meaningful data like the authenticated user;
`res.locals` is handier for throwaway per-request values.

### What this means in practice

Modern code uses `fs/promises` with `async`/`await`:

```ts
// callback version — all the ceremony above applies
fs.readFile(path, (err, data) => { if (err) next(err); else res.send(data); });

// promises version — Express catches it automatically
const data = await fs.readFile(path, 'utf-8');
res.send(data);
```

**The one rule to remember:** never `throw` inside a callback. Inside an
`(err, data) => {}` function, the only way out is `next(err)`.

---

## SECTION 6 — The Default Error Handler

An error-handling middleware Express adds **automatically** at the very
bottom of the stack. Never imported, never configured, can't be removed.

```
your routes
your middleware
your error handler (if written)
Express's default error handler   <- always here
```

### The four rules — all verified

| Rule | Test | Result |
|---|---|---|
| Status comes from `err.status` / `err.statusCode` | `err.status = 404` | **404** ✅ |
| Outside 4xx/5xx → forced to 500 | `err.status = 999` | **500** ✅ |
| No status → 500 | plain `Error` | **500** ✅ |
| `err.headers` applied to the response | `{ 'Retry-After': '30' }` | header appeared ✅ |

That `err.status` mechanism is exactly **why the `AppError` class has a
`status` property** — it's a convention Express itself understands.

Also: `res.statusMessage` is set automatically from the code (`404 Not
Found`, `500 Internal Server Error`).

### Body: development vs production

```
Without NODE_ENV:  <pre>Error: BROKEN<br> at file:///home/.../src/index.ts:6:9 ...</pre>
With production:   <pre>Internal Server Error</pre>
```

**What a stack trace is:** the list of function calls that led to the
error — file path, line number, column, and the chain beneath it.

**Why it's hidden in production:** it exposes the folder structure, file
names, line numbers, and which internal Node/library functions are in use.
Useful for debugging, equally useful to an attacker.

**Setting NODE_ENV:**
```bash
# Windows PowerShell
$env:NODE_ENV="production"; node src/index.ts

# Mac/Linux
NODE_ENV=production node src/index.ts
```
In real deployment this is never typed manually — Railway, Vercel, and
Docker set it, or it goes in their environment-variables panel.

It can be read directly too:
```ts
const isProduction = process.env.NODE_ENV === 'production';
```

### The res.headersSent check

```ts
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);      // delegate to Express's default
  }
  res.status(500).json({ error: err.message });
}
```

**The situation:** the response has already **started** going out — a large
file streaming, or `res.write()` was called — and *then* something fails.

**The problem:** HTTP sends headers first, then the body. Once headers are
on the wire they're gone; the status code is already set. Calling
`res.status(500)` now throws a *second* error on top of the first.

**The fix:** `res.headersSent` is a boolean. If `true`, respond is
impossible — hand off to Express's default handler, which closes the
connection and fails the request cleanly.

**Include these two lines in every error handler.** The streaming case may
never come up, but it costs nothing and prevents one error becoming two.

### Calling next(err) twice

If a bug fires `next(err)` twice for one request, the custom handler
responds to the first; the second finds the response already sent and falls
through to the default handler. The `headersSent` check covers this.

---

## SECTION 7 — Writing Error Handlers

Four arguments, defined **last**, after all routes and middleware.

```ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
```

**Express identifies error handlers by counting parameters.** Three =
normal middleware. Four = error handler. Drop `next` — even if unused in
the body — and the handler silently stops catching anything.

### Chaining multiple error handlers

Instead of one giant handler doing logging *and* formatting *and* status
codes, split it. Each asks "is this mine?" — respond if yes, `next(err)` if
no.

```
error thrown
    ↓
logErrors          -> logs it, next(err)        (never responds)
    ↓
validationHandler  -> mine? respond : next(err)
    ↓
appErrorHandler    -> mine? respond : next(err)
    ↓
catchAllHandler    -> always responds           (last resort)
```

```ts
// 1. LOGGER — handles nothing, logs everything, always passes along
function logErrors(err, req, res, next) {
  console.error(`[LOG] ${req.method} ${req.originalUrl} -> ${err.message}`);
  next(err);
}

// 2. SPECIFIC — only handles one error type
function validationHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, fields: err.fields });
    return;
  }
  next(err);
}

// 3. SPECIFIC — errors thrown deliberately
function appErrorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  next(err);
}

// 4. CATCH-ALL — must be last, must ALWAYS respond
function catchAllHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong' });
}

app.use(logErrors);
app.use(validationHandler);
app.use(appErrorHandler);
app.use(catchAllHandler);
```

**Verified:** three different errors each passed through `logErrors` first,
then landed on a different handler — 404, 400, and 500 respectively.

**`next(err)` inside an error handler means "pass to the next ERROR
handler."** Not the next normal middleware — errors stay in the error
chain.

### The warning

> *"when you do not call next in an error-handling function, you are
> responsible for writing (and ending) the response. Otherwise, those
> requests will 'hang'"*

Same rule as normal middleware: **respond, or pass it on. Never neither.**

### Two things in the docs that don't apply to a JSON API

- **`req.xhr`** — used to send JSON to AJAX requests and an HTML page to
  browser loads. A server-rendered-app pattern; a JSON API always returns
  JSON.
- **`res.render('error', ...)`** — template engine, not relevant.

### Should a chain be built now?

**Not yet.** One handler with `if (err instanceof AppError)` is plenty for
now. Split it when there are genuinely multiple error types worth handling
differently — Zod validation errors, database constraint violations, auth
failures. That's a later stage.

The concept worth keeping: **error handlers form a chain, and `next(err)`
moves along it.**

---

## SECTION 8 — The next() Variants, Complete

| Where | Call | Goes to |
|---|---|---|
| Normal middleware | `next()` | next middleware/handler in the stack |
| Normal middleware | `next('route')` | skip rest of this route, next matching route |
| Normal middleware | `next('router')` | skip the entire router, back to parent app |
| Normal middleware | `next(err)` | jump to the first error handler |
| Error handler | `next(err)` | next error handler |
| Error handler | `next()` | back to normal middleware (rarely useful) |

> *"Calls to next() and next(err) indicate that the current handler is
> complete and in what state."*

In short: calling `next` says "I'm done" — and what gets passed says
whether things went fine or broke. Once an error is in flight, **nothing
normal runs anymore.**

`next('route')` restriction: only works inside `app.METHOD()` or
`router.METHOD()` — not inside `app.use()`, since "skip to the next route"
is meaningless outside a route.

---

## SECTION 9 — The Production Pattern

Everything above, combined into what a real error setup looks like:

```ts
// A custom error type. isExpected marks errors thrown on purpose,
// so the handler knows the message is safe to show the client.
class AppError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---------- ROUTES: throw, never try/catch ----------

app.get('/products/:id', async (req: Request, res: Response) => {
  const product = await db.findProduct(req.params.id);

  // 404 = "you asked for something that isn't here" (NOT 500)
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.json(product);
});

app.post('/products', async (req: Request, res: Response) => {
  const { name, price } = req.body;

  // 400 = "your request was wrong" — the client's fault
  if (!name) {
    throw new AppError('Field "name" is required', 400);
  }

  const created = await db.createProduct({ name, price });
  res.status(201).json(created);
});

// ---------- 404 CATCH-ALL: after routes, before the error handler ----------

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------- ERROR HANDLER: four params, last ----------

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  // Log the real error for us — never shown to the client
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.message);

  // Thrown on purpose -> the message is safe to show
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Anything else is an unexpected bug -> generic message,
  // so internals like "Cannot read properties of undefined" don't leak
  res.status(500).json({ error: 'Something went wrong' });
});
```

**The key comparison, verified:**

| | Client sees | Server log sees |
|---|---|---|
| Deliberate `AppError` | `"Product not found"` | `Product not found` |
| Accidental bug | `"Something went wrong"` | `Cannot read properties of undefined` |

Real message kept for debugging. Nothing useful given to an attacker.

---

## SECTION 10 — Quick Reference

| Question | Answer |
|---|---|
| Sync throw | Caught automatically |
| Async throw | Caught automatically (Express 5) |
| Promise not returned | **Process crashes** |
| Callback error | Must call `next(err)` manually |
| Throw inside a callback | **Process crashes** |
| `setTimeout` throw, no try/catch | **Process crashes** |
| Why isn't setTimeout caught? | Express watches Promises, not "async code" |
| Do I need try/catch in async routes? | No — Express 5 handles it |
| `next('string')` | Treated as an error — always pass a real `Error` |
| Error handler param count | Exactly four, or it silently stops working |
| Where does the status come from? | `err.status` on the error object |
| Why hide stack traces? | They expose file paths and code structure |
| `res.headersSent` | Response already started — delegate to the default |
| `next(err)` in an error handler | Next **error** handler, not normal middleware |

---

## SECTION 11 — The Five Rules

1. **Never write try/catch in routes.** Sync and async throws are both
   caught automatically. It's noise.
2. **Throw `AppError` when you decide to stop the request**, with the right
   status — 404 for missing, 400 for bad input, 401 for unauthorised.
3. **Let unexpected errors fall through as 500** with a generic message,
   while logging the real one server-side.
4. **Never throw inside a callback or a timer.** Use `next(err)`. Better:
   avoid callbacks — use `fs/promises` and `async`/`await`.
5. **Set `NODE_ENV=production`** in deployment, and include the
   `res.headersSent` check in the error handler.