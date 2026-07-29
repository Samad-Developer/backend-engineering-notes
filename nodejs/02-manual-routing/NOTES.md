# Day 2 — Manual Routing

## Why this exists
Right now (Day 1), the server responds the same way no matter what URL is
requested or what method is used. A real API needs different behavior for
`GET /api/orders` vs `POST /api/orders` vs an unknown route. Before Express
gives me a clean way to do this (`app.get(...)`, `app.post(...)`), I wanted to
do it manually — because that tedium is exactly why Express exists.

## What routing actually is
Routing = matching a `(method, path)` pair to a specific block of logic.
`GET /api/orders` → return the orders list.
`POST /api/orders` → create a new order.
Anything else → 404.

## Where this is used
This exact pattern — inspect the incoming request, decide what to do — is the
foundation of every backend framework's routing system, just automated.
Express's `app.get('/api/orders', handler)` is doing this same
`if (req.method === 'GET' && req.url === '/api/orders')` check internally,
just hidden from me.

## Key details I learned
- `req.method` and `req.url` are the two things every route check needs.
- Each `if` block needs an explicit `return` after `res.end(...)`. Without it,
  execution falls through to the next `if` block, which could try to send a
  second response and crash Node with "headers already sent."
- Status codes matter and should match intent: `200` for a successful GET,
  `201 Created` for a successful POST that creates something new, `404` for
  routes that don't exist.
- A fallback block (no `if` condition, just runs if nothing matched) is the
  manual version of what Express calls a catch-all / default route.
- `JSON.stringify(orders)` converts my in-memory JS array into a string to
  send over HTTP — the server-side half of what `response.json()` does on the
  frontend when reading a fetch response.
- The POST route here doesn't actually read the request body yet — it just
  pushes a placeholder. Reading a POST body manually (no framework) is a whole
  extra step in raw Node, covered next on Day 3.

## Why this matters for Roll Inn / real backend work
A real Orders API has many routes: list orders, get one order, create,
update, delete. Writing this by hand with `if` blocks for even 4 routes
already feels repetitive — with 15+ routes across menu, orders, auth, tenants,
this approach would become unmanageable. That felt tedium is the direct
motivation for Express's routing system, which I'll switch to right after
finishing raw Node fundamentals.

## How to run it
```bash
node server.js
```

Test each route:
```bash
curl http://127.0.0.1:3000/
curl http://127.0.0.1:3000/api/orders
curl -X POST http://127.0.0.1:3000/api/orders
curl -i http://127.0.0.1:3000/unknown-route
```

Expected:
- `/` → `Server is running`
- `GET /api/orders` → JSON array of orders
- `POST /api/orders` → JSON of the newly created order, status `201`
- unknown route → `404` with `{"error": "Route not found"}`