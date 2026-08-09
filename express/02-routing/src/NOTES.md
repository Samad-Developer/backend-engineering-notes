# Express — Day 2: Routing

---

## SECTION 1 — Why This Page Exists

The basic routing page showed fixed, hardcoded paths like `/user`. Real
APIs can't hardcode every path — there's no writing a separate route for
user 1, user 2, user 3. What's needed is **one route that handles any ID**.

That's what this page adds:
- capturing values from the URL (route parameters)
- running several functions on one route
- organising routes across files once there are dozens instead of four

**Where it's used in real work:** every API ever built.
`GET /api/products/42`, `DELETE /api/orders/17`, `PUT /api/users/9` — the
number changes every request. Route parameters capture it. `express.Router`
is how one 2000-line file is avoided.

---

## SECTION 2 — Route Methods

`app.get()`, `app.post()`, `app.put()`, `app.delete()` — the HTTP verb
attached to the app.

**`app.all(path, handler)`** — runs for **every** HTTP method at that path.
Useful for logging or auth checks that apply regardless of method. It
typically calls `next()` rather than responding, doing its side job and
handing control onward.

Verified: with `app.all('/secret', ...)` logging and calling `next()`, plus
only a `GET /secret` handler after it — a `POST /secret` request **still
logs** but returns **404**, because no POST handler exists for that path.

**`app.use()`** — mentioned here as "specify middleware." It is the
general-purpose "attach something" method, unlike `.get()`/`.post()` which
are method-specific. Covered properly in the middleware topic.

---

## SECTION 3 — Route Paths

### String paths match exactly

**"Interpreted literally"** simply means "understood as the actual
character, nothing more." In some systems (regex) a dot means "any
character" — Express string paths do **not** do that.

| Route path | Matches |
|---|---|
| `/random.text` | `/random.text` only |
| `/my-page` | `/my-page` only |
| `/pricing.info` | `/pricing.info` only, **not** `/pricingXinfo` |

Verified: `/pricing.info` → 200, `/pricingXinfo` → 404.

Characters that are **not** literal (they have special meaning):
`:` makes a parameter, `{}` makes something optional, `*` is a wildcard.

### Query strings are NOT part of the route path

A request to `/search?q=shoes` matches the route `app.get('/search', ...)`.
The `?q=shoes` part never affects which route matches — read it from
`req.query`. Verified: `/search?q=tolkien&limit=10` →
`{"q":"tolkien","limit":"10"}`.

Note both values are **strings**, even `"10"` — same rule as `req.params`.

### Reserved characters

`?` `+` `*` `[]` `()` `!` cannot be used as literal characters in route
paths, and `{}` is reserved for optional segments. Escape with `\` if
genuinely needed. This is an Express 5 change — these were pattern syntax
in Express 4.

### Regular expressions as paths

Possible (`app.get(/.*fly$/, ...)`) but rarely needed. String paths plus
route parameters cover essentially everything in normal API work.

---

## SECTION 4 — Route Parameters (the core)

The colon `:` marks a named slot that captures whatever appears there. The
name chosen becomes the key in `req.params`.

```ts
app.get('/users/:userId/books/:bookId', (req, res) => res.json(req.params));
// /users/34/books/8989 -> { "userId": "34", "bookId": "8989" }
```

### CRITICAL: req.params values are ALWAYS strings

`"34"`, never `34`. Convert with `Number()` when a number is needed.
Forgetting this causes real bugs — `"34" + 1` is `"341"`, not `35`.

### Params with literal separators

Since `-` and `.` are literal, they work as separators inside one segment:

```
/flights/:from-:to     +  /flights/LAX-SFO      -> { from: 'LAX', to: 'SFO' }
/reports/:from-:to     +  /reports/2024-2025    -> { from: '2024', to: '2025' }
/plantae/:genus.:species + /plantae/Prunus.persica -> { genus, species }
```

### Regex constraints no longer work

`:userId(\d+)` worked in Express 4 and is **gone in Express 5**. To enforce
"digits only," validate inside the handler (or with Zod later), not in the
path.

### Wildcards give an ARRAY, not a string

```ts
app.get('/docs/*filepath', (req: Request<{ filepath: string[] }>, res) => {
  res.json({ params: req.params, path: req.params.filepath.join('/') });
});
// /docs/a/b/c.md -> filepath: ['a','b','c.md'], path: 'a/b/c.md'
```

This is the key difference from a named parameter: **named param = string,
wildcard = array of path segments.** That's why `.join('/')` is used to
rebuild a path.

To also match the root path, wrap in braces: `app.get('/{*splat}', ...)`.

### Optional segments — braces `{}`

New Express 5 syntax (Express 4 used `?`, now reserved).

```ts
app.get('/media/:name{.:extension}', ...)
// /media/cover.jpg -> { name: 'cover', extension: 'jpg' }
// /media/cover     -> { name: 'cover' }
```

When the optional part is absent, the key is **missing from req.params
entirely** — not undefined, just not there.

### The slash-position rule

**Everything inside the braces is optional.**

```ts
app.get('/user/{:id}', ...)   // slash OUTSIDE braces
// /user/42 -> { id: '42' }
// /user/   -> {}
// /user    -> 404  (slash still required)

app.get('/order{/:id}', ...)  // slash INSIDE braces
// /order/42 -> { id: '42' }
// /order    -> {}  (works — slash is optional too)
```

Put the slash **inside** the braces — almost always what's actually wanted.
Verified: `/invoice` → `{}` with `/invoice{/:id}`.

### TypeScript and params

When a handler is written **inline**, `@types/express` reads the path and
types params automatically — `req.params.userId` is known to be `string`,
and reading a name not in the path is a type error.

When the handler is **defined separately** (or the param comes from a
router's mount path), TypeScript can no longer see the path and the params
must be declared explicitly:

```ts
function ordersHandler(
  req: Request<{ orderId: string; itemId: string }>,
  res: Response,
) { ... }

app.get('/orders/:orderId/items/:itemId', ordersHandler);
```

This is not an edge case — handlers move into separate files as a project
grows, so this is what real code looks like.

---

## SECTION 5 — Multiple Handlers Per Route

Several functions can be passed to one route. They run **strictly left to
right, in the order written.** Arrays are flattened — `[a, b]` behaves
identically to `a, b`.

```ts
app.get('/chain', [firstHandler, secondHandler], thirdHandler, finalHandler);
```
Verified log order: `First → Second → Third → Final`.

### The rule that must be internalised

Each function either **sends a response** (ending the cycle) or **calls
`next()`** (passing control onward). Doing neither leaves the request
hanging forever — the client waits and eventually times out. The docs state
this in the Response methods section.

### Why many handlers instead of one

Each does one small, reusable job:

```ts
app.post('/api/orders',
  authenticate,        // logged in?
  checkPermissions,    // allowed?
  validateOrderBody,   // valid data?
  rateLimit,           // too many requests?
  createOrder          // do the work
);
```

`authenticate` is written **once** and reused across every protected route.
Without this, the same login check gets copy-pasted into 40 handlers.

Note: the docs' `cb0`/`cb1`/`cb2` examples only `console.log` — they
demonstrate the **mechanism** (four ways to pass handlers), not a real use
case. Real code looks like the example above.

---

## SECTION 6 — Confusion Points and Answers

### Q: Why not use reusable utility functions instead of many handlers?
It works for simple cases, but three things are lost:

1. **Repetition.** Middleware: `app.post('/x', authenticate, handler)`.
   Utilities: every handler starts with
   `const user = await authenticate(req, res); if (!user) return;` —
   forget that `return` once out of forty and it's a security hole.
2. **Attaching data to the request.** Middleware can set `req.user = found`
   and every later function sees it. Utilities require passing values
   manually.
3. **Applying to whole groups.** `app.use('/api/admin', authenticate)`
   protects every route under that prefix, including ones added later by
   someone else. A utility must be remembered and called every time.

Utilities are better for logic specific to one route, or pure helpers with
no request/response involvement.

### Q: Why two routes with the SAME method and path? Isn't that a bug?
Express **allows** it and tries them in registration order. Normally the
first wins and the second is never reached. `next('route')` is the
mechanism that lets the first say "not me — try the next one."

### Q: What does `next('route')` actually do?
- **`next()`** — go to the next function **in this route**
- **`next('route')`** — abandon **this whole route** and find the next
  *matching route*

"Bypass the remaining route callbacks" means if the route had several
functions chained, `next('route')` skips **all of them**, not just the next
one:

```ts
app.get('/user/:id', fnOne,   // calls next('route') here
                     fnTwo,   // skipped
                     fnThree);// skipped
app.get('/user/:id', fnFour); // this runs instead
```

Verified: `/product/55` → normal handler, `/product/legacy` → legacy
handler.

**Honest note:** uncommon in real code — most developers use one handler
with an `if`. Know it so it isn't confusing when read.

### Q: Why `return next('route')` but sometimes just `next()`?
`return` has nothing to do with `next` — Express ignores whatever a handler
returns. It exists purely to **stop the rest of the function from running**.

```ts
if (id === 'legacy') {
  return next('route');
}
res.json(...);   // must NOT run for legacy
```
Without `return`, `next('route')` fires **and then** `res.json()` also runs
— two responses, "headers already sent" crash.

Where `next()` appears without `return`, it's the **last line**, so there's
nothing after it to skip.

**Rule:** if any code follows `next()`, use `return`. If it's the last
statement, either is fine — adding `return` anyway is a harmless safe
habit.

### Q: `res.json()` vs `res.send()` — what's the difference?

Verified with real responses:

| Call | Content-Type | Body |
|---|---|---|
| `res.send('Hello')` | `text/html` | `Hello` |
| `res.send({ a: 1 })` | `application/json` | `{"a":1}` |
| `res.send([1,2,3])` | `application/json` | `[1,2,3]` |
| `res.json({ a: 1 })` | `application/json` | `{"a":1}` |
| `res.json('Hello')` | `application/json` | `"Hello"` (with quotes) |

**`res.send()` guesses** based on the argument. String → `text/html`.
Object/array → JSON.
**`res.json()` always sends JSON**, no guessing.

**Use `res.json()` for API work, essentially always:**
1. Explicit — anyone reading knows it's a JSON API
2. No surprises — with `send()`, a variable that's usually an object but
   sometimes a string silently changes the Content-Type and breaks the
   frontend
3. Correct — a string via `send()` gets `text/html`, wrong for an API, and
   a frontend calling `.json()` on it may fail

`res.send()` is fine for a quick health check (`res.send('OK')`).

### Q: Should `app.route()` be used everywhere?
It only helps when several methods share the **exact same** path. In real
APIs, related routes usually have different paths:

```ts
router.get('/', getAll);          // GET  /books
router.post('/', create);         // POST /books
router.get('/:id', getOne);       // different path
router.put('/:id', update);       // different path
router.delete('/:id', remove);    // different path
```

Only two of five share a path — mixing two styles in one file reads worse
than picking one. And `express.Router` already solves the repetition better:
once routes live in a router mounted at `/books`, the paths inside are
already short (`'/'`, `'/:id'`).

Legitimate tool, not wrong to use, but don't build a habit around it.

---

## SECTION 7 — Response Methods

| Method | Use |
|---|---|
| `res.json()` | **Used constantly** — practically every route in a JSON API |
| `res.send()` | Various types, Express guesses Content-Type |
| `res.status()` | Chained: `res.status(404).json({...})` |
| `res.sendStatus()` | Sets status + sends its text name as body |
| `res.redirect()` | Send a redirect |
| `res.sendFile()` / `res.download()` | Send a file; `download` prompts save dialog |
| `res.render()` | **Not relevant** — server-rendered HTML templates |
| `res.jsonp()` | Legacy cross-origin technique, superseded by CORS — ignore |

**Critical:** these **end the request-response cycle**. Calling a second
one causes "headers already sent."

---

## SECTION 8 — express.Router

A Router is a **mini, self-contained Express app** — its own routes and its
own middleware — that gets **mounted** into the main app at a path prefix.

**In `routes/books.ts`:**
```ts
const router = express.Router();

router.use(booksMiddleware);        // middleware for THIS router only
router.get('/', ...);               // becomes /api/books
router.get('/:bookId', ...);        // becomes /api/books/:bookId

export default router;
```

**In `index.ts`:**
```ts
import books from './routes/books.ts';
app.use('/api/books', books);
```

### Q: The docs import `birds` but the file only exports `router` — why?
`export default router;` exports a value **without a name**. Whatever the
importing file calls it becomes its name there:

```ts
import birds from './routes/birds.ts';        // named "birds"
import anyNameIWant from './routes/birds.ts'; // same thing, different name
```
Verified — both work. The docs used `birds` because the *file* is
`birds.js` — pure convention, nothing enforces it. (Contrast named exports
— `export { router }` — which must be imported by that exact name.)

### Q: `router.use()` vs `app.use()` — both are `.use()`?
Yes, same method, same job: **register something not tied to one specific
method+path.**

- **`router.use(timeLog)`** — no path given, so it applies to every request
  reaching this router
- **`app.use('/birds', router)`** — path given, so: "for anything starting
  with `/birds`, hand it to this router"

Verified: router middleware logged for `/birds` and `/birds/about` but
**not** for the main app's `/` — proving it's scoped to that router only.

### Q: Why are paths inside the router written without the prefix?
```ts
router.get('/', ...)       // actually /birds
router.get('/about', ...)  // actually /birds/about
```
The prefix is applied **once**, at the mount point. Same idea as
`express.static('public')` — the folder name isn't in the URL.

**Why designed this way:** the router file doesn't know or care where it
gets mounted. Change one line to `app.use('/api/v2/birds', router)` and
every route moves — without editing the router file. That's what "modular,
mountable" means.

### Q: "A complete middleware and routing system" — both capabilities?
Yes. A Router has `.get()`/`.post()`/`.put()`/`.delete()` (routing) **and**
`.use()` (middleware). That's why it's called a "mini-app." The difference
from `app`: only `app` can start a server with `app.listen()` — a router
must be mounted to do anything.

### mergeParams — required for nested params

If the mount path itself has a parameter, the child router **cannot see it
by default**:

```ts
app.use('/api/publishers/:publisherId/authors', authors);
```

Inside `authors.ts`, `req.params.publisherId` would be `undefined` without:

```ts
const router = express.Router({ mergeParams: true });
```

Also, since the param comes from the mount path, TypeScript can't infer it
— it must be declared: `Request<{ publisherId: string; authorId: string }>`.

Verified: `/api/publishers/penguin/authors/tolkien` →
`{"publisherId":"penguin","authorId":"tolkien"}`.

### Why routers matter enormously

```
src/
├── index.ts              (app setup, mounts routers)
└── routes/
    ├── users.ts          -> app.use('/api/users', usersRouter)
    ├── products.ts       -> app.use('/api/products', productsRouter)
    └── orders.ts         -> app.use('/api/orders', ordersRouter)
```

Each file only knows about its own resource. This is the standard structure
of essentially every real Express codebase.

---

## SECTION 9 — Mistakes Made During Practice (worth remembering)

### Mistake 1: `{.extension}` instead of `{.:extension}`
Missing colon means `extension` is a **literal string**, not a parameter.
The route then means "optionally match the literal text `.extension`".

Proven side by side:
```
WRONG  /wrong/:name{.extension}
  /wrong/cover.jpg       -> {"name":"cover.jpg"}   (ext not captured)
  /wrong/cover.extension -> {"name":"cover"}       (matched literally)

RIGHT  /right/:name{.:ext}
  /right/cover.jpg       -> {"name":"cover","ext":"jpg"}
  /right/cover           -> {"name":"cover"}
```

Why the wrong version still returned 200: `:name` has no reason to stop at
a dot (dots are ordinary characters), so it swallowed the whole thing.

**Lesson: a 200 response doesn't mean the route is right.** Always check
the *shape* of what came back, not just that something came back.

### Mistake 2: Duplicate route silently shadowing another
Two routes with the same method and path — the first registered wins, and
the second becomes dead code. **No error, no warning.**

This is a nasty bug class as files grow: edit a handler, restart, nothing
changes, because a duplicate registered earlier is winning. One more reason
`express.Router` matters — a duplicate would sit next to its twin, obvious
at a glance.

### Mistake 3: Two routes responding identically
When testing `next('route')`, both handlers originally sent the same
message. Make the two paths **visibly different** — otherwise a broken
`next('route')` looks identical to a working one.

### Mistake 4: Types prevent typos, not wrong logic
```ts
res.send(`${req.params.orderId} and ${req.params.orderId}`)  // second should be itemId
```
TypeScript couldn't catch this — both are valid keys and both are strings.

---

## SECTION 10 — Quick Reference

| Thing | Answer |
|---|---|
| `req.params` values | Always **strings** — convert with `Number()` |
| Query strings (`?q=x`) | **Not** part of route matching — read `req.query` |
| Named param vs wildcard | Named = **string**; wildcard = **array** of segments |
| Missing optional param | Key is **absent** from `req.params` |
| Slash inside vs outside braces | Everything inside `{}` is optional — put the slash inside |
| `next()` vs `next('route')` | Next function in this route vs abandon this route entirely |
| `return next(...)` | Only to stop the rest of the function running |
| Router paths | Written **without** the mount prefix |
| Nested params in a router | Needs `mergeParams: true` + explicit `Request<{...}>` |
| Regex param constraints | `:id(\d+)` **no longer works** in Express 5 |
| Duplicate routes | Allowed, first wins, silently shadows — watch for this |

---

## SECTION 11 — What's Next

`app.use()`, `router.use()`, and every `next()` call in this file all point
to the same topic: **middleware**. It has now appeared three separate times
without a proper explanation — that's the next thing to cover, and it's
what makes Express click as a whole rather than a set of separate tricks.

---

## How to Run

```bash
npm install
npm run typecheck    # should print nothing
npm run start
```

Key things to test:
- `POST /secret` → logs "Secret accessed" but returns **404**
- `/media/cover.jpg` → `{"name":"cover","extension":"jpg"}`
- `/media/cover` → `{"name":"cover"}`
- `/invoice` → `{}` (no trailing slash needed)
- `/docs/a/b/c.md` → array of segments plus joined path
- `/chain` → check server log order: First, Second, Third, Final
- `/product/legacy` → "Legacy product handler" (proves `next('route')`)
- `/api/publishers/penguin/authors/tolkien` → both params (proves
  `mergeParams`)
- `/search?q=x&limit=10` → query values, all strings
- `/pricingXinfo` → 404 (proves the dot is literal)