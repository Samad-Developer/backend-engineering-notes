# Express — Security Best Practices

---

## SECTION 1 — What This Whole Page Is About

On a laptop, nobody is trying to break in. Once an app is live, real
people — some malicious — can send it anything: fake data, tricks, attacks
designed to steal information or crash the server.

**This page is a checklist of specific, real attacks that happen to
Express apps, and the specific fix for each one.** Not general advice —
each section is: "here's a real trick attackers use" -> "here's exactly
how to stop it."

---

## SECTION 2 — Don't Use Deprecated Express Versions

Old versions (2.x, 3.x) are unmaintained — a security hole found today in
them will never be fixed. Already on Express 5 (current), so nothing to
do here.

---

## SECTION 3 — Use TLS

**What it means:** when data travels from a browser to a server, it
passes through many computers in between — routers, ISPs, WiFi networks.
Without protection, anyone on that path can read everything as plain
text — passwords, card numbers, everything.

**TLS encrypts that data** before it leaves the browser, so an
interceptor only sees scrambled garbage.

**TLS vs SSL:** same idea, different era. SSL came first, TLS is its
modern replacement. "SSL certificate" today usually just means TLS — old
habit, same technology.

**What to actually do:** nothing personally — a reverse proxy (Nginx) or
the hosting platform (Railway/Vercel) handles the encryption
automatically on deploy.

**When self-setup is actually needed:**
- Self-hosting on a raw VPS (DigitalOcean, EC2) with no managed platform
- Working at a company with its own infrastructure, updating an existing
  Nginx config for a new service
- Running Docker directly, writing an Nginx container as reverse proxy
- A small company/startup with no dedicated DevOps person

None of these apply to the current deployment path (Railway/Vercel).

---

## SECTION 4 — Do Not Trust User Input

The umbrella rule every other section is a specific example of. Anything
from outside the server — body, params, query, headers, cookies — could
be malicious or malformed, regardless of what the frontend normally
sends. An attacker doesn't have to use the frontend at all — they can hit
the API directly with anything.

---

## SECTION 5 — Prevent Open Redirects

### The full attack story

**Setup:** a route redirects based on user input:
```ts
app.get('/redirect', (req, res) => {
  res.redirect(req.query.url as string);   // no check — trusts it blindly
});
```

**Step 1 — the attacker crafts a link:**
```
https://rollinn.com/redirect?url=https://roll-inn-login.com/fake-page
```
`rollinn.com` at the front is genuinely real — not faked. The hidden
`?url=` parameter points to a fake login page the attacker built.

**Step 2 — sent to victims** via email/SMS: "Your order is ready, click
here."

**Step 3 — victim inspects the link, sees the real domain, trusts it,
clicks.**

**Step 4 — without a fix:** the server blindly redirects to the fake
site. Verified live:
```
HTTP/1.1 302 Found
Location: https://roll-inn-login.com/fake-page
```
The victim's browser automatically travels there, sees a fake login page,
types their real password. The attacker now has it. **The damage happens
at the exact moment the server sends that Location header** — everything
after is just the natural consequence.

**Step 5 — the fix:**
```ts
app.use((req, res) => {
  try {
    if (new URL(req.query.url).host !== 'example.com') {
      return res.status(400).end(`Unsupported redirect to host: ${req.query.url}`);
    }
  } catch (e) {
    return res.status(400).end(`Invalid url: ${req.query.url}`);
  }
  res.redirect(req.query.url);
});
```

`req.query.url` is the **destination**, not the app's own domain (the
app's domain was never faked — that wasn't the attack). `new
URL(...).host` extracts just the destination's domain. If it isn't the
trusted one, reject with 400 before any redirect happens. The `try/catch`
exists because `new URL(...)` throws on a malformed string — caught
cleanly instead of crashing.

**Verified live, same attack link, hitting the fixed route:**
```
HTTP/1.1 400 Bad Request
```
Blocked. A genuinely legitimate redirect to the trusted domain still
passes through fine.

### Confusions resolved

**"We only check `.host`, not the parameter — how does that stop the
attack?"** The `.host` check IS a check on the parameter — `req.query.url`
is read, parsed with `new URL()`, and its `.host` is what gets compared.
The attacker's domain was never in question (they can't fake it); the
check is "is the place I'm about to send this person TO actually safe,"
not "does this link belong to my domain."

**"Will there always be a `?url=` parameter?"** No — this exact code only
works because it specifically checks `req.query.url`. A different
parameter name (`?redirectTo=`, `?next=`) would need the check written
against that field instead. The *pattern* is universal; the field name in
this example is just this docs page's chosen name.

**"Can a server actually redirect a browser?"** Not directly — a server
can't reach into a browser. `res.redirect()` sends a `3xx` status with a
`Location` header. The **browser** reads that header and automatically
makes a new request there. Two-step handoff: server says "go here
instead," browser obeys. Every login redirect ever seen works this way.

---

## SECTION 6 — Use Helmet

**What it is:** a pre-built middleware package that automatically sets
roughly a dozen security-related HTTP headers on every response — instead
of researching and configuring a dozen obscure settings manually.

**What happens without it:** nothing catastrophic immediately, but
several well-known, documented attack techniques (like clickjacking) have
no defense in place — doors left unlocked that a competent attacker knows
to check.

**How to use it:**
```bash
npm install helmet
```
```ts
import helmet from 'helmet';
app.use(helmet());
```

**Verified live — before:**
```
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
```

**Verified live — after adding `app.use(helmet())`, same route:**
```
Content-Security-Policy: default-src 'self'; ...
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 0
```
`X-Powered-By: Express` is gone automatically.

**The single easiest, highest-value item on the whole page.** One line,
real protection, essentially zero cost. Add on day one of any real
project.

---

## SECTION 7 — Reduce Fingerprinting

**What "fingerprinting" means:** like a human fingerprint identifies a
person without them announcing it, software fingerprinting identifies
*what a server is running* from small, incidental details in how it
responds — specific headers, error page formatting — even without an
explicit announcement.

**Why attackers want this:** once they know the exact framework/version,
they know exactly which known, documented vulnerabilities to try —
instead of guessing blindly.

**`X-Powered-By: Express`** is the most blatant example — verified gone
automatically with Helmet, or removable manually:
```ts
app.disable('x-powered-by');
```

**Honesty from the docs:** this doesn't hide Express usage from a truly
skilled attacker — just removes the laziest, most obvious signal.
Discourages casual attempts; costs nothing to do anyway.

**Custom 404/error pages** — already built on the error-handling day.
Express's default-looking error pages are themselves a fingerprint;
custom ones remove that signal too.

---

## SECTION 8 — Use Cookies Securely

**What a cookie is, briefly:** a small piece of data a server asks the
browser to store, sent back automatically on every future request to that
site — commonly used to remember a logged-in user.

**Two competing session tools:**
- **`express-session`** — session data lives on the **server**; the
  cookie only holds a random ID pointing to it. More secure by default.
- **`cookie-session`** — the entire session is stuffed directly **inside**
  the cookie, visible to the client. Simpler, only safe for small,
  non-sensitive data.

**Verdict: Auth-stage material, not implemented yet.**

---

## SECTION 9 — Don't Use the Default Session Cookie Name

Libraries like `express-session` use a predictable default name
(`connect.sid`) unless told otherwise — same fingerprinting problem as
`X-Powered-By`.

```ts
app.use(
  session({
    secret: 's3Cur3',
    name: 'sessionId',   // generic, not the library's default
  })
);
```

Auth-stage, not now.

---

## SECTION 10 — Set Cookie Security Options

- **`secure`** — cookie only sent over `https://`, never plain `http://`
- **`httpOnly`** — the one that matters most. Makes the cookie **invisible
  to JavaScript in the browser**. Without it, malicious injected
  JavaScript (XSS) could simply read and steal the cookie/session. With
  it, even injected JS can't touch it.
- **`domain` / `path`** — limit exactly which site(s) and URLs the cookie
  gets sent to
- **`expires`** — sets when the cookie stops being valid, so a stolen
  cookie doesn't work forever

Auth-stage, not now.

---

## SECTION 11 — Prevent Brute-Force Attacks Against Authorization

**The attack:** no clever password guessing needed — a program just tries
thousands of common passwords against a login endpoint, fast, until one
works.

**The defense:** track failed attempts by IP and by username; temporarily
block once the count gets suspiciously high.

**Direct connection to earlier learning:** IP-based blocking only works
correctly if `req.ip` shows the real visitor's IP, not the reverse
proxy's — which is exactly why the `trust proxy` setting matters. Get it
wrong, and every visitor behind the proxy shares one IP — either one
attacker gets everyone blocked, or the block never triggers.

**How to implement (Express has no built-in rate limiter):**
```bash
npm install express-rate-limit
```
```ts
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // max 5 attempts per window
  message: 'Too many login attempts, try again later',
});

app.post('/login', loginLimiter, (req, res) => { ... });
```

Same pattern as Helmet — install a package, apply as middleware. Tracks
requests by IP internally, which is why `trust proxy` must be correct
first.

Auth-stage material.

---

## SECTION 12 — Ensure Dependencies Are Secure

**What it means:** every `npm install`ed package is someone else's code,
trusted and run inside the app. A known flaw in a dependency becomes a
flaw in the app too, even without writing the vulnerable code directly.

**What to do — genuinely simple:**
```bash
npm audit
```
Checks every installed package against a known-vulnerability database.
Costs seconds, worth running periodically on any real project.

**Snyk** — a more thorough tool doing a similar job with GitHub
integration. Know the name; `npm audit` is enough for now.

---

## SECTION 13 — Avoid Other Known Vulnerabilities

General awareness advice — stay aware of security news relevant to
Node/Express (GitHub Advisory Database, Snyk advisories). Not an action
item, just general awareness.

---

## SECTION 14 — Additional Considerations

- **Sanitize input against XSS/injection** — closely related to what Zod
  (already on the roadmap) helps with, though validating shape and
  sanitizing malicious content are related but slightly different jobs.
- **Parameterized queries for SQL injection** — exactly why real
  PostgreSQL code looks like `pool.query('... WHERE id = $1', [orderId])`
  instead of gluing `orderId` directly into the SQL string. The `$1`
  placeholder pattern IS the defense.
- **`sqlmap`, `nmap`, `sslyze`, `safe-regex`** — specialized
  security-testing tools. Recognize the names, nothing to install now.

---

## SECTION 15 — Priority Summary: What to Actually Do, and When

### Day 1 of any real project — implement immediately
- `npm install helmet` -> `app.use(helmet())` — proven, one line, zero cost
- Confirm `NODE_ENV=production` set on the host once deployed
- Never trust user input, as a habit from line one — validate
  `req.body`/`req.params`/`req.query` always (Zod will systematize this
  later)
- `app.set('trust proxy', 1)` the moment deployed behind a managed
  platform
- Parameterized SQL queries from the very first query written — never
  string-concatenate user input into SQL

### When a redirect feature is built (if ever)
- Validate the destination's `.host` against an allow-list before calling
  `res.redirect()` — same day the feature is built, not retrofitted later

### Auth stage — implement together, one connected system
- Choose `express-session` or `cookie-session`
- Non-default session cookie name
- Cookie options: `secure`, `httpOnly`, `domain`, `path`, `expires`
- `express-rate-limit` on the login route specifically

### Ongoing habit, not one-time
```bash
npm audit
```
Run periodically on every real project.

### Never — owned by the hosting platform
TLS/HTTPS setup, reverse proxy configuration — Railway/Vercel handle this
automatically on deploy.

---

## SECTION 16 — Quick Reference

| Question | Answer |
|---|---|
| What is an open redirect? | Trusting a user-supplied URL and redirecting to it unchecked |
| Why does checking `.host` stop it? | It checks the destination the attacker controls, not the app's own (unfakeable) domain |
| What is fingerprinting? | Identifying server software from incidental response details, without it being announced |
| What does Helmet actually do? | Sets ~12 security headers automatically, one line |
| `express-session` vs `cookie-session`? | Server-side storage + ID cookie, vs entire session inside the cookie |
| What does `httpOnly` protect against? | Malicious JS (XSS) reading/stealing the cookie |
| Why does brute-force protection need `trust proxy`? | IP-based blocking is meaningless if `req.ip` shows the proxy's IP for every visitor |
| How to check dependency vulnerabilities? | `npm audit`, periodically |
| Who sets up TLS? | The hosting platform / reverse proxy — not the app code |