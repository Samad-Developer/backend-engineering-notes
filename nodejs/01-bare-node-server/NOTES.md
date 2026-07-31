# Day 1 — Bare Node.js Server (`http` module)

## Why this exists
Every backend framework (Express, Next.js API routes, NestJS) is built on top of
Node's built-in `http` module. Before using any framework, I wanted to see what's
actually happening underneath — no hidden magic, just the raw API.

## What a server actually is
A server is a program that starts once and stays alive, listening on a network
port for incoming requests. It doesn't "finish" like a script — it just reacts,
forever, until you stop it.

## The core API
- `createServer(callback)` — creates the server. The callback runs every time a
  request arrives, and receives two objects:
  - `req` (request) — has `req.method`, `req.url`, `req.headers`
  - `res` (response) — used to send data back
- `.listen(port, hostname, callback)` — starts the server listening on a specific
  port and host address, and runs the callback once it's ready.

## Key details I learned
- `node:http` (with the prefix) explicitly marks this as a Node built-in module,
  as opposed to an npm package. `require('http')` still works, but `node:http`
  is the current recommended style.
- Setting `hostname = '127.0.0.1'` restricts the server to only accept
  connections from my own machine (the "loopback" address). If I omit it, Node
  listens on all available network interfaces by default.
- `res.statusCode = 200` and `res.setHeader(...)` set the response status and
  headers as separate steps. This is functionally identical to
  `res.writeHead(200, { ... })`, which sets both in one call — just two valid
  styles for the same thing.
- `res.end(body)` sends the response body and closes the connection. Without
  calling `.end()`, the client would hang waiting forever — the response is
  never considered "finished."

## Why this matters for Roll Inn / real backend work
Every API route Roll Inn's backend will ever expose — `/api/menu`, `/api/orders`
— is, underneath any framework, this exact same cycle: request arrives, callback
runs, response goes out. Frameworks just automate routing and parsing on top of
this.

## How to run it
\`\`\`bash
node server.js
\`\`\`

Then visit `http://127.0.0.1:3000` in the browser, or:

\`\`\`bash
curl http://127.0.0.1:3000
\`\`\`

Expected output: `Hello from my first server`