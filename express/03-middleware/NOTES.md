# Express — Day 3: Middleware

Covers two docs pages: **Writing middleware** (how to build one) and
**Using middleware** (where to put one).

---

## SECTION 1 — The Base: There Is No Difference

The biggest source of confusion is the docs' own diagram, which labels
`app.get('/', function(req, res, next) {...})` as a **middleware function**
— even though it looks exactly like a route handler.

**That is not a mistake. A route handler IS a middleware.**

Express has exactly **one** concept, not two. A middleware is any function
shaped `(req, res, next)`. That's the entire definition.

What people call a "route handler" is just a middleware that:
- was registered with a method and path (`app.get('/users', fn)`) rather
  than `app.use(fn)`
- happens to call `res.json()` instead of `next()`

The docs confirm this in the first line of the *Using middleware* page:

> "an Express application is essentially a series of middleware function
> calls executed during the request-response cycle"

**Proven:** the exact same function was registered via `app.use()` AND as
an `app.get()` handler in the same app. It ran in both positions with no
complaint.

```
Express has ONE thing: functions of shape (req, res, next)

app.use(fn)            -> runs on every request
app.use('/path', fn)   -> runs on any method, matching path
app.get('/path', fn)   -> runs on GET only, exact path

Inside any of them:
  next()      -> keep going
  res.json()  -> stop, respond
```

---

## SECTION 2 — Interview-Ready Definitions

**Route handler:** a function attached to a specific route that defines how
the app responds when a client hits that endpoint. Inside it you can run
any code, and you **must** end the request-response cycle with a response
method (`res.json`, `res.send`) — otherwise the request hangs forever.

**Middleware:** a function that runs at a chosen point in the request
chain. It can execute code, modify `req` and `res`, end the cycle, or pass
control onward with `next()`. It must do **one of two things** — send a
response OR call `next()`. Never both, never neither.

**Best one-liner:** *"An Express app is essentially a chain of middleware
functions, and a route handler is just the last one in the chain that sends
the response."*

**Important correction to the common mental model:** middleware is not only
"before the route handler." It runs at whatever point it is registered —
before routes, between routes, or **after all routes** (404 catch-alls and
error handlers are middleware placed at the end).

**The capability that makes middleware powerful:** it can attach data to
`req` for later functions to use. This is how auth actually works —
`requireAuth` finds the user, sets `req.user = user`, and every handler
downstream reads `req.user`.

---

## SECTION 3 — Why Not Just Use Utility Functions?

A fair question — utilities *can* do the same work. Four real differences:

**1. Silent security failure.** With a utility, the auth check is opt-in:
```ts
const user = await getUser(req);
if (!user) return res.status(401).json({ error: 'Unauthorized' });
```
Forget those two lines in one handler out of forty and that endpoint is
publicly accessible. No error, no warning, tests probably still pass.

**2. Group application — utilities genuinely cannot do this:**
```ts
app.use('/api/admin', requireAuth, requireAdmin);
```
Every route under that prefix is protected, including one a teammate adds
next month who never read the file. A utility requires every developer to
remember to call it, forever.

**3. Ordering and composition:**
```ts
app.post('/api/orders', rateLimit, requireAuth, validateBody, createOrder);
```
The utility version is five awaits and five guard clauses inside every
handler, in the right order, every time.

**4. The whole ecosystem works this way.** `express.json()`, `cors()`,
`helmet()`, `morgan()`, `multer` — all middleware. The pattern has to be
understood regardless.

**When utilities are genuinely better:** logic used by one route only; pure
helpers with no `req`/`res` involvement (formatting, calculations);
anything needing a return value mid-handler.

**Honest summary:** middleware makes cross-cutting concerns *declarative
and enforceable at the route definition*, instead of *imperative and
forgettable inside the handler*.

---

## SECTION 4 — Writing Middleware

### The shape

```ts
const myLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log('LOGGED');
  next();
};
```

### `next` is NOT built in

The docs' caution, unpacked:

> "The next() function is not a part of the Node.js or Express API, but is
> the third argument that is passed to the middleware function."

`next` is **not a global**. It cannot be typed randomly anywhere. Express
calls the function and hands it a function as the third argument. It could
be named `keepGoing` and work identically. Named `next` purely by universal
convention.

### Four things middleware can do
1. Execute any code
2. Modify `req` and `res`
3. End the request-response cycle
4. Call the next middleware

The important pair is #2 and #4 — together they are how data flows down the
chain.

### Order is everything

> "middleware functions that are loaded first are also executed first"

**Verified:** with `app.use(myLogger)` placed *after* `app.get('/')`, a
request to `/` never logged anything — the route responded and ended the
cycle first.

This is why `app.use(express.json())` goes at the top of the file. Placed
after routes it never runs, and `req.body` is undefined everywhere.

**Also verified in practice:** moving `logRequest` to the FRONT of a
middleware array made it print `undefined - undefined`, because
`addRequestId` and `addTimestamp` had not run yet. Middleware can only see
data attached by middleware that ran before it.

### Attaching data to req (the pattern that matters most)

```ts
const requestTime = (req, res, next) => {
  req.requestTime = Date.now();
  next();
};
```

### The TypeScript requirement — declaration merging

`Request` is a fixed type; adding a property to it is a type error. Fix:

```ts
// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      requestTime?: number;
      user?: { id: string; name: string };
    }
  }
}

export {};
```

**Verified:** without this file, two type errors. With it, clean.

- **What it technically does:** it does not create a new type — it MERGES
  these properties into the same `Request` interface that `@types/express`
  defines. That is why `import { type Request } from 'express'` gives the
  extended version everywhere with no extra imports.
- **Why `declare global { namespace Express { ... } }`:** it must reach
  into the exact namespace `@types/express` uses, or it would create an
  unrelated interface that merges with nothing.
- **Why `?` (optional):** the middleware may not run for every request, so
  the property may genuinely be absent.
- **Why `export {}`:** makes the file a module, which `declare global`
  requires. Looks pointless, is mandatory.
- **Anything attached to `req` must be declared here** — `req.user`,
  `req.requestId`, `req.tenantId`, all of it.

### Async errors — the Express 5 change

> "Starting with Express 5, middleware functions that return a Promise will
> call next(value) when they reject or throw an error."

**Verified:** an `async` middleware that throws, with no try/catch, was
caught automatically and returned 500 via the error handler. In Express 4
this would have crashed the process — which is why older tutorials wrap
every async handler in try/catch. That boilerplate is no longer needed.

### Configurable middleware (the factory pattern)

This answers: **why does `express.json()` have parentheses but `myLogger`
does not?**

```ts
app.use(myLogger);          // no parens — IS a middleware
app.use(express.json());    // parens — RETURNS a middleware
```

`express.json` is a **function that returns a middleware**:

```ts
export function createLogger(options: LoggerOptions = {}) {
  const { prefix = 'LOG' } = options;
  return function (req, res, next) {   // <- the actual middleware
    console.log(`[${prefix}] ${req.method} ${req.path}`);
    next();
  };
}
```

**Verified:** the same factory used twice with different options produced
two independently configured middleware.

Every configurable package uses this — `cors({ origin: '...' })`,
`rateLimit({ max: 100 })`, `helmet({...})`.

---

## SECTION 5 — Using Middleware: The Five Types

| Type | Meaning |
|---|---|
| Application-level | Attached to `app` |
| Router-level | Attached to a `router` |
| Error-handling | Four params instead of three |
| Built-in | Ships with Express |
| Third-party | Installed from npm |

Four of the five are the same thing in different places. Only
error-handling is structurally different.

### Application-level — three levels of filtering

```ts
app.use(fn)                   // every request
app.use('/path', fn)          // any method, matching path
app.get('/path', fn)          // GET only, exact path
```

`app.use('/user/:id', fn)` accepts route parameters too, and runs for
**every** HTTP method — that is the difference from `app.get`.

### Middleware sub-stacks

```ts
app.use('/user/:id',
  (req, res, next) => { console.log(req.originalUrl); next(); },
  (req, res, next) => { console.log(req.method); next(); }
);
```

### Multiple route handlers — the silent-shadowing warning

> "The second route will not cause any problems, but it will never get
> called because the first route ends the request-response cycle."

This is exactly the duplicate-route bug hit during routing practice. No
error, no warning — it just silently never runs.

### Reusable middleware arrays

```ts
const requestContext = [addRequestId, addTimestamp, logRequest];

app.get('/', requestContext, handler);
app.get('/other', requestContext, handler);
```

Arrays get flattened — `[a, b]` behaves identically to `a, b`. They earn
their place when the **group is reused**; for a one-off, listing the
functions as separate arguments is the more common style.

### `next('route')` — the restriction

> "next('route') will work only in middleware functions that were loaded by
> using the app.METHOD() or router.METHOD() functions."

It works inside `app.get(...)` / `router.post(...)`, but **not** inside
`app.use(...)` — "skip to the next route" is meaningless outside a route.

### Router-level middleware

Same as application-level, bound to a router instead. Two valid placements
for protecting a router:

```ts
// A: inside the router — the router protects itself, and stays protected
//    wherever it is mounted
router.use(blockIfBanned);

// B: at the mount point — the mounting file decides
app.use('/api/shop', blockIfBanned, shopRouter);
```

Both work identically. **A** is generally safer for auth (protection cannot
be accidentally dropped when someone mounts it somewhere new). **B** is
better when the same router needs different treatment in different places.

### The public-route-before-the-gate pattern

```ts
router.get('/', publicHandler);   // 1. public route FIRST

router.use(requireAuth);          // 2. the gate

router.post('/', handler);        // 3. everything below is protected
router.delete('/:id', handler);
```

Because middleware runs in registration order, a `GET /` request matches at
step 1, responds, and the cycle **ends** — it never reaches `requireAuth`.
Everything else falls through to the gate.

`requireAuth` is written **once**, and any protected route added later just
goes below the gate — no extra work, impossible to forget.

### `next('router')` — skipping out of a whole router

```ts
router.use((req, res, next) => {
  if (!req.headers['x-auth']) return next('router');
  next();
});

router.get('/user/:id', (req, res) => res.send('hello, user!'));

app.use('/admin', router, (req, res) => res.sendStatus(401));
```

**Verified:** with the header → router route ran, 200. Without → the entire
router was skipped and the fallthrough handler returned 401. The router's
own route never executed at all.

### The four `next` variants — each skips a bigger chunk

| Call | Meaning | Scope |
|---|---|---|
| `next()` | Next function in the stack | One step |
| `next('route')` | Skip rest of this route, find next matching route | One route |
| `next('router')` | Skip the entire router, return to parent app | Whole router |
| `next(err)` | Error — jump to the error handler | Everything until an error handler |

---

## SECTION 6 — 404 Handler vs Error Handler

The two look similar and are easy to confuse. They are completely
different.

```ts
// 404 — THREE parameters = NORMAL middleware
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ERROR — FOUR parameters = ERROR middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

### Verified with three requests

| Request | What ran | Result |
|---|---|---|
| `/works` (route exists) | route only | 200 — neither bottom handler reached |
| `/nothing-here` (no match) | **404 handler** | 404 — error handler skipped, no error |
| `/crash` (route throws) | route, then **error handler** | 500 — **404 handler skipped entirely** |

### The rule that explains all three

**404 handler = "nobody handled this request."** Normal middleware at the
bottom. Reached only when nothing above responded.

**Error handler = "something went wrong."** Reached only when an error is
in flight (thrown, or passed via `next(err)`).

**Key mechanic:** when an error occurs, Express **skips every normal
middleware** and jumps to the first error handler. That is why the 404
sitting physically above the error handler never fired for `/crash`.

### Why the order must be this way

```
routes...
404 handler      <- three params
error handler    <- four params
```

- **404 after routes:** above them it would respond to everything before
  any route was reached.
- **Error handler last:** an error skips normal middleware anyway, so it
  would be found regardless — but convention puts it at the very bottom.

### The four-argument trap

> "Even if you don't need to use the next object, you must specify it to
> maintain the signature. Otherwise, the next object will be interpreted as
> regular middleware and will fail to handle errors."

Express identifies error handlers **by counting parameters**. Drop `next`
— even though it is unused in the body — and the error handler silently
becomes normal middleware that never catches anything.

**An error handler catches errors from anything registered above it** —
routes, middleware, `express.json()` failing on malformed JSON, a rejected
database call. It is the safety net under everything.

---

## SECTION 7 — Built-in and Third-Party Middleware

### Built-in (five)

| Middleware | Purpose |
|---|---|
| `express.static` | Serve static files |
| `express.json` | Parse JSON bodies -> `req.body` |
| `express.urlencoded` | Parse HTML form submissions -> `req.body` |
| `express.raw` | Parse body as a raw Buffer |
| `express.text` | Parse body as plain text |

**`express.json()` is the one used constantly.** It is exactly the manual
work done in raw Node — collecting chunks, `Buffer.concat`, `.toString()`,
`JSON.parse` in a try/catch — reduced to one line.

**`express.raw`** matters for webhook signature verification (Stripe,
GitHub), which needs the unmodified raw body.

### Third-party

```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```
```ts
app.use(cookieParser());   // note the parens — factory pattern
```

Ones that will come up: `cors`, `helmet`, `morgan`, `express-rate-limit`,
`multer`, `cookie-parser`. Many need `@types/*` installed separately.

---

## SECTION 8 — What Each Docs Page Covered

- **Writing middleware** = how to BUILD one. The `(req, res, next)` shape,
  `next()`, attaching properties to `req` with declaration merging, async
  error handling, the factory pattern.
- **Using middleware** = where to PUT one. App vs router, mount paths,
  arrays and sub-stacks, error handlers, built-in and third-party.

**Short version: Writing = the function. Using = the placement.**

Only one genuinely new mechanism appeared on the Using page:
`next('router')`.

---

## SECTION 9 — Quick Reference

| Question | Answer |
|---|---|
| Middleware vs route handler | Same thing. Handler = middleware that ends the cycle |
| Is `next` built in? | No — it's the third parameter Express passes in |
| Can `next` be renamed? | Technically yes. Don't — universal convention |
| Why `express.json()` but not `myLogger()`? | `express.json` is a factory that RETURNS a middleware |
| Why four params on error handlers? | Express identifies them by counting parameters |
| Need try/catch in async middleware? | Not in Express 5 — caught automatically |
| Why does `req.user` fail in TypeScript? | Extend `Request` via declaration merging in a `.d.ts` |
| Where does `express.json()` go? | Before routes — after them it never runs |
| Middleware sees `undefined` data | It ran before the middleware that set it |
| 404 vs error handler | 404 = nothing matched. Error = something threw |
| Duplicate routes | First wins, second silently never runs |

---

## SECTION 10 — What Was Built

```
src/
├── index.ts
├── types/express.d.ts          declaration merging
├── middleware/
│   ├── context.ts              addRequestId, addTimestamp, logRequest, grouped array
│   ├── blockIfBanned.ts        ends the cycle instead of continuing
│   └── createLogger.ts         configurable factory pattern
└── routes/
    ├── shop.ts                 router-level middleware (router.use)
    ├── status.ts               per-route middleware (as arguments)
    └── books.ts                public route before an auth gate
```

Note this folder layout — `middleware/`, `routes/`, `types/` as separate
directories — is the standard Express project structure. It starts making
sense exactly at this point, when there is more than one middleware to
organise.

---

## How to Run

```bash
npm install
npm run typecheck    # should print nothing
npm run start
```

Key things to verify:
- `GET /` → requestId and timestamp both present (chain order works)
- `/api/shop?banned=true` → 403, but `/public?banned=true` → 200 (scoping)
- `/api/status/double` → log shows `first middleware` then `second middleware`
- `GET /api/books` → 200 without a token; `POST` → 401 without one
- `POST /api/books` with `Authorization: Bearer secret123` → 201 with `user`
- `/crash` → 500 via the error handler, no try/catch anywhere
- `/unknown` → 404, not 500

### Things worth breaking deliberately
- Remove `next` from the error handler → errors stop being caught
- Move `router.use(requireAuth)` above the public GET → it becomes protected
- Move `logRequest` to the front of `requestContext` → prints `undefined`
- Delete `types/express.d.ts` → typecheck fails with two errors
- Move the 404 handler above the routes → everything returns 404