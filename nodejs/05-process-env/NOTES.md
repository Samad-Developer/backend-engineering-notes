# Day 5 — `process` and Environment Variables

## Why this exists
Sensitive values (DB passwords, API keys, JWT secrets) should never be
hardcoded directly into source files, because those files get committed to
Git and pushed to GitHub — a public repo would expose real credentials to
anyone browsing it. Environment variables solve this by keeping secrets
outside the code entirely, injected at runtime instead.

## The core idea: separate config from code
1. Real secret values live in a `.env` file, on the machine only.
2. `.env` is added to `.gitignore` — Git never tracks or commits it.
3. The actual code contains no secrets — just references like
   `process.env.DB_PASSWORD`, which read whatever value is currently set.

This makes code portable: the exact same `server.js` can run on my laptop,
a teammate's laptop, or a production server — each with different secret
values — without changing a single line of code.

## What `process` actually is
A global object Node automatically creates the instant a program starts
running — I never `require` it, same as `__dirname`. "Program" here just
means whatever code is currently being executed — running `node server.js`
tells the OS to start a new process, and Node populates that process's
`process` object automatically (env vars, argv, etc.) for as long as it's
alive. The process — and `process` — ends when the program stops.

## Why plain Node needs `dotenv` (unlike Next.js/CRA/Vite)
Next.js, CRA, and Vite each have a build tool (webpack/Turbopack/etc.) that
scans `.env` files and rewrites the bundled JS at build time — that's why
`process.env.X` (or `import.meta.env.X` in Vite) "just works" there with no
extra setup. Plain Node has no build tool running before execution — nobody
reads `.env` automatically. `require('dotenv').config()` is a small package
that manually reads `.env` and copies its values into `process.env`,
replicating what those frontend tools do invisibly.

Alternative (Node v20.6+, no package needed):
```bash
node --env-file=.env server.js
```

## What happens in production (Railway/Vercel)
Same underlying mechanism, different infrastructure:
- **Railway** — spins up a container and runs essentially `node server.js`
  on their servers. Environment variables set in their dashboard get
  injected into that process exactly like a local `.env` file would.
- **Vercel** — uses serverless functions: a short-lived Node process starts
  per request (or reuses a "warm" one), executes the code, then may shut
  down. Same mechanism underneath — Node still starts a process, still
  populates `process.env` from whatever was configured in the dashboard —
  just a much shorter, more elastic lifespan than an always-on server.

No `.env` file exists on either platform in production — the same variable
names are set directly in the platform's settings UI instead.

## What `process` provides
- `process.env` — object of all environment variables (system + custom)
- `process.argv` — command-line arguments passed at startup
- `process.exit(code)` — force-stop the program
- `process.platform` — `'win32'` / `'darwin'` / `'linux'`
- `process.cwd()` — folder the command was *run from* (different from
  `__dirname`, which is where the *file* lives)

## What I built
A server reading `PORT`, `APP_NAME`, and a `SECRET_MESSAGE` from a `.env`
file via `dotenv`, proving the value loads correctly without ever exposing
the actual secret in the response — the same safe pattern I'd use for a
real database password.

## How to run it
```bash
npm install
node server.js
```

Try removing `.env` entirely and re-running — `port` falls back to `3000`
via the `process.env.PORT || 3000` default pattern, and `APP_NAME` would
print `undefined`.