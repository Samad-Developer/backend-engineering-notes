# Day 4 — File System (`fs`) Module

## Why this exists
Every server so far stored data in a plain JS array in memory — meaning
every restart wiped everything back to whatever was hardcoded. That's not
a real database, just runtime memory. `fs` lets data survive by writing it
to an actual file on disk — the exact problem persistence solves, felt
firsthand before Postgres replaces this properly in Stage 3.

## Why frontend can't do this but backend can
Browsers deliberately sandbox JavaScript away from the file system — if a
website's JS could freely read/write files on a visitor's machine, any
malicious site could steal data or plant malware. The backend runs on a
server I control and trust, so this restriction doesn't apply — and there's
a constant real need: persisting data, reading config/.env files, logging,
handling file uploads, serving static files.

## The core API
- `fs.readFile()` / `fs.writeFile()` / `fs.appendFile()` — each has 3
  flavors: callback (`node:fs`), sync/blocking (`fs.xSync`), and
  promise-based (`node:fs/promises`, used throughout — fits async/await).
- `fs.stat()` — metadata about a file (not its content): `.isFile()`,
  `.isDirectory()`, `.size`, `.mtime` (last modified).
- `path` module — `path.join()`, `dirname`, `basename`, `extname`,
  `resolve`, `normalize` — handles path differences across OS safely.
- Folder operations — `fs.access()` (check existence), `fs.mkdir()`
  (create), `fs.readdir()` (list contents), `fs.rename()`, `fs.rm()` with
  `{ recursive: true, force: true }` (delete non-empty folder safely).

## Key details I learned
- **`node:fs` vs `node:fs/promises`** — same module, different result style:
  callbacks vs Promises. Used the Promise version throughout to match
  async/await style already used for HTTP body reading.
- **`__dirname`** is not something I declare — Node automatically injects
  it into every CommonJS file (it secretly wraps my file in a function with
  `__dirname`, `__filename`, `require`, `module`, `exports` as parameters).
  It holds the absolute path of the folder the current file lives in — used
  with `path.join(__dirname, ...)` so file paths work regardless of which
  folder I run `node server.js` from.
- **Why stringify/parse even though it's not going over a network**:
  serialization isn't just a network concept — it's a memory-vs-storage
  concept. RAM can hold live JS objects; a file on disk can only store raw
  bytes/text. `JSON.stringify()` converts the in-memory object into text
  before it can be saved; `JSON.parse()` converts it back after reading.
  Same underlying limitation as POST body parsing on Day 3, just for disk
  instead of network.
- **Overwrite vs append, and when to use which**: `writeFile` replaces the
  entire file's content by default — correct for "current full state" data
  like `orders.json`. `appendFile` adds to the end without erasing history —
  correct for logs, where every past entry should be preserved.
- **File descriptors** exist (a number/reference to an open file, from
  `fs.open()`) but `readFile`/`writeFile`/`appendFile` already manage this
  internally — rarely need to touch this directly in typical API work.
- **Filesystem differences across OS**: case sensitivity differs (Linux is
  case-sensitive, Windows/Mac often aren't) — a real bug source when a
  mismatched-case import works locally but fails after deploying to a Linux
  production server. Practical habit: keep filenames consistently cased.

## What I built
A complete order-management server using `fs` properly:
- `data/` folder auto-created on server startup if missing (`fs.access` +
  `fs.mkdir` fallback)
- `data/orders.json` — orders persisted via overwrite (`writeFile`)
- `data/requests.log` — every request logged via append (`appendFile`),
  showing overwrite vs append side-by-side in one real app
- `GET /api/orders/stats` — returns live file size and last-modified time
  via `fs.stat()`, the kind of info a real admin dashboard might show
- `fs-full-demo.js` — a standalone script exercising every fs/path/folder
  operation covered this stage, self-cleaning after it runs

## How to run it
```bash
node server.js
```

Test with Thunder Client / curl.exe:
- `GET http://127.0.0.1:3001/api/orders`
- `POST http://127.0.0.1:3001/api/orders` with JSON body `{"item": "..."}`
- `GET http://127.0.0.1:3001/api/orders/stats`

Restart the server and GET again — orders persist because they're read from
`data/orders.json` on disk, not from a variable reset in memory.

Run the standalone demo separately:
```bash
node fs-full-demo.js
```