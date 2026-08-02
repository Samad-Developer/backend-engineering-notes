# Day 6 — `path` Module (Dedicated Deep Dive)

## Why this exists
Every OS represents file locations differently — `/users/joe/file.txt` on
Mac/Linux vs `C:\users\joe\file.txt` on Windows. Building paths by hand
(string concatenation with `/` or `\`) breaks the moment code runs on a
different OS than it was written on. `path` abstracts this away completely
— I never manually type a separator, the module always gets it right for
whatever OS is running the code.

## Every function used, explained simply

**`path.join(...)`**
Glues multiple path pieces together into one correct path, using whatever
separator the current OS actually uses. This is the one used constantly —
`path.join(__dirname, 'uploads')` — and it also cleans up messy input like
extra slashes automatically.

**`path.extname(filename)`**
Returns just the file extension (`.png`, `.txt`). Used for real validation
— checking an uploaded file is actually an allowed image type before
saving it.

**`path.basename(filename)`**
Returns just the filename part, stripping away any folder path in front of
it. Pass a second argument (an extension) and it strips that extension too
— useful for getting a clean name to build a new unique filename from.

**`path.dirname(filepath)`**
Returns the parent folder of a given path — everything except the
filename itself.

**`path.resolve(...)`**
Turns a relative path into a full absolute path, based on wherever the
script is currently being run FROM (`process.cwd()`) — not necessarily
where the file itself lives. Different from `__dirname` in that sense.

**`path.normalize(messyPath)`**
Cleans up a path containing `..`, `.`, or doubled slashes into its proper
form. Doesn't check if the path actually exists — it's a pure string
calculation, not a filesystem check.

**`path.parse(filepath)`**
Breaks a full path into every piece at once — root, dir, base, ext, name —
returned together as one object. Handy when multiple pieces are needed at
once instead of calling several separate functions.

**`path.sep`**
The actual separator character the current OS uses (`/` on Mac/Linux, `\`
on Windows) — rarely needed directly since `path.join` already handles
this, but good to know it's there.

## What I built
A server with three routes, each using `path` for a real reason instead of
an isolated example:
- `POST /api/files` — validates the file extension is allowed
  (`path.extname`), strips the extension to build a clean unique filename
  (`path.basename` with a second arg), and builds the final safe save
  location (`path.join`).
- `GET /api/files` — lists uploaded files with their name, extension, and
  containing folder parsed out for each one.
- `GET /api/files/:filename` — returns every piece of one file's path at
  once using `path.parse()`, combined with real file stats from `fs.stat`.

## A real bug I ran into
Using `Date.now()` alone for generating unique filenames isn't always
reliable — two calls fast enough back-to-back can land in the same
millisecond and produce an identical filename, causing a real collision.
Production systems either add a random suffix alongside the timestamp, or
use a proper UUID library, instead of relying on the timestamp alone.

## How to run it
```bash
node server.js
```

Test with Thunder Client / curl.exe:
- `POST http://127.0.0.1:3006/api/files` with JSON body
  `{"filename": "logo.png"}`
- `GET http://127.0.0.1:3006/api/files`
- `GET http://127.0.0.1:3006/api/files/<returned-filename>`