# Day 3 — Reading POST Request Bodies Manually

## Why this exists
The POST route on Day 2 ignored whatever data was actually sent — it just
pushed a placeholder. A real API needs to read the actual JSON a client
sends (e.g. a new order's item name) and use it. In Express or Next.js,
`req.body` is available instantly — in raw Node, there's no such shortcut.

## What's actually happening
The request body doesn't arrive all at once — it arrives as a stream of
small chunks over time, the same way data physically travels across a
network (broken into packets, arriving incrementally). Node exposes this
directly through events:

- `req.on('data', chunk => {...})` — fires every time a new piece of the
  body arrives
- `req.on('end', () => {...})` — fires once, after the full body has arrived

This is Node's EventEmitter pattern in real code — not just a concept,
something I'm now listening for directly.

## Key things I learned
- Each `chunk` is a `Buffer` — raw binary data, not text. A Buffer is just
  raw bytes in memory before deciding what they mean (text, image, JSON,
  etc).
- `Buffer.concat(bodyChunks)` joins all the chunks into one Buffer.
  `.toString()` interprets those raw bytes as text (UTF-8 by default).
  `JSON.parse()` then converts that text into a usable JS object. Three
  separate, deliberate conversion steps.
- Wrapping `JSON.parse()` in try/catch matters — if the body isn't valid
  JSON, `JSON.parse` throws, and an uncaught throw here would crash the
  entire server process if not handled.
- Basic manual validation (checking `if (!parsedBody.item)`) before using
  the data — real validation with Zod comes later in the roadmap, but the
  underlying need (don't trust incoming data blindly) starts here.
- The response only gets sent inside the `'end'` callback — the outer
  function keeps running and Node moves on to handle other requests while
  waiting for the full body to arrive. First real look at async control
  flow on the server side.

## Where this is used
This exact stream-based body reading is what body-parsing middleware
(`express.json()`, Next.js's built-in body parsing) does automatically
under the hood. Doing it manually once means I now know exactly what that
one line of middleware saves me from writing every single route.

## Terminal note (Windows/PowerShell)
PowerShell's built-in `curl` is actually an alias for `Invoke-WebRequest`,
which uses different syntax (doesn't support `-H`/`-d` the same way real
curl does). Fix: use `curl.exe` explicitly, or switch to Postman/Thunder
Client for testing going forward.

## How to run it
```bash
node server.js
```

Test with curl.exe (or Postman):
```bash
curl.exe -X POST http://127.0.0.1:3000/api/orders -H "Content-Type: application/json" -d '{"item":"Chicken Karahi"}'
```

Expected: `{"id":3,"item":"Chicken Karahi"}`, status `201`.

Also test:
- Missing `item` field → `400` with `{"error": "\"item\" field is required"}`
- Invalid JSON body → `400` with `{"error": "Invalid JSON body"}`