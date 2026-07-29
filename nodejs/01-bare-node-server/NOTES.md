# Stage 1.1 — Bare Node.js Server (`http` module)

## The idea

A server is just a program that stays alive and listens on a port. No framework,
no Express, no Next.js — just Node's built-in `http` module.

`http.createServer(callback)` creates the server. The `callback` runs **every time**
a request comes in. It receives two objects:

- `req` (request) — has `req.method` (GET/POST/etc), `req.url` (the path), `req.headers`
- `res` (response) — used to send data back: `res.writeHead(statusCode, headers)`, `res.end(body)`

`.listen(port)` tells the server which "door" (port) to stand behind and start
accepting connections.

That's the entire raw API. Express, Next.js API routes, NestJS — all of them are
convenience layers built on top of exactly this.

## What I built

A server that responds with plain text to any request, running on port 3000.

## Run it

```bash
node server.js
```

Then visit `http://localhost:3000` in the browser, or:

```bash
curl http://localhost:3000
```