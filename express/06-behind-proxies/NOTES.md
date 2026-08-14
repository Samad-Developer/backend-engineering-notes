# Express — Day 6: Behind Proxies

---

## SECTION 1 — The Picture Before Today

Going in, the known chain was: **client → API → backend → database.**

That's correct, but it's the simplified version — the one drawn when learning
to code. Real production systems have one more layer sitting between
"client" and "backend" that almost no tutorial mentions, because it isn't
part of the application code itself. It's infrastructure sitting around it.

---

## SECTION 2 — What a Reverse Proxy Actually Is

**A reverse proxy is a separate piece of software that sits between the
internet and the actual app, receiving every request first and deciding
what to do with it — usually, forwarding it to the real app running behind
it.**

```
Before:  Client → Express app directly
After:   Client → reverse proxy → Express app
```

### Why it exists — four real problems it solves

1. **HTTPS is annoying to manage per-service.** Certificates expire and
   need renewing. The proxy holds the certificate once; the app behind it
   runs plain HTTP internally — one less thing for every individual
   service to manage.

2. **One server isn't enough at scale.** If traffic grows, multiple copies
   of the app run behind the proxy, and the proxy distributes requests
   between them (load balancing).

3. **The app shouldn't be directly exposed to the internet.** A raw
   Express server taking connections straight from anyone has no
   protection — no rate limiting, nothing standing between an attacker and
   the actual code. The proxy can filter and block malicious traffic
   before the app ever sees it.

4. **Multiple services can share one domain.** `rollinn.com` needs to
   reach the Next.js frontend; `api.rollinn.com` needs to reach the
   Express backend. Something has to look at the incoming address and
   route accordingly — that's the proxy.

### Why "reverse"

A **forward proxy** sits in front of *clients* (e.g. a company's internet
filter, hiding who the employees are from the outside world). A **reverse
proxy** sits in front of *servers*, hiding which actual server handled the
request. Same idea — "something in the middle" — protecting the opposite
side.

### Real examples encountered without knowing it

- **Nginx** — most widely used, open source, common in traditional
  deployments
- **Cloudflare** — acts as a reverse proxy, plus a CDN and DDoS protection
- **Traefik** — common in Docker/Kubernetes setups
- **AWS ALB (Application Load Balancer)** — Amazon's managed version
- **Caddy** — newer, simpler configuration

Every deployment to Railway or Vercel has had one of these in front of the
app automatically — it was just never configured manually, because the
platform already set it up.

### Does a reverse proxy sit in front of frontend apps too?

**Yes — both.** A reverse proxy sits in front of whatever server is
running, regardless of what it serves. A deployed Next.js app also runs
behind one. Often a single proxy routes to both at once, by domain:

```
rollinn.com       -> reverse proxy -> Next.js frontend
api.rollinn.com   -> reverse proxy -> Express backend
```

---

## SECTION 3 — The Actual Problem This Docs Page Solves

When the proxy forwards a request, **it's the proxy's own network
connection that the Express app actually receives — not the original
visitor's.** So anything read directly off the raw connection, like the IP
address, is now wrong.

```ts
app.get('/', (req, res) => {
  console.log(req.ip);   // expected: the visitor's real IP
});
```

Without a proxy: correct.
Behind a reverse proxy, without configuration: shows the **proxy's**
internal IP — every single visitor looks like they're coming from the same
address.

### What happens after the connection is "lost" — the header mechanism

The client's real IP isn't actually lost. The proxy writes it into a
**header** as plain text before forwarding the request:

```
Client (real IP: 203.0.113.5)
    -> connects to
Reverse Proxy
    -> forwards to Express, adding a header:
       X-Forwarded-For: 203.0.113.5
    ->
Express app receives:
    - a raw connection from the PROXY's IP
    - a header saying "the real client was 203.0.113.5"
```

Two separate pieces of information arrive:
1. **The raw connection** — always from the proxy. `req.socket.remoteAddress`
   reads this.
2. **A header** — where the proxy tells the app who the real client was,
   since the connection itself can no longer show it.

**`req.ip` is Express deciding which of the two to trust and report.** By
default (`trust proxy: false`), it trusts only the raw connection — the
proxy's IP. Setting `trust proxy: true` switches it to read the header
instead — the real client's IP.

No magic — just an agreed convention: "the proxy honestly writes the real
IP here if it's forwarding on someone's behalf."

### Verified live — the entire mechanism in one comparison

Same request, same `X-Forwarded-For: 203.0.113.5, 70.41.3.18` header sent:

| Setting | `req.ip` result |
|---|---|
| `trust proxy` not set (default `false`) | `127.0.0.1` — header ignored |
| `trust proxy: true` | `203.0.113.5` — left-most entry read correctly |

---

## SECTION 4 — Why the Real Client IP Matters at All

The whole point of this mechanism, made concrete:

- **Rate limiting** — "this IP made 200 requests in a minute, block it."
  Without the real IP, every visitor looks identical — either everyone
  gets blocked or no one does.
- **Security/abuse tracking** — identifying and blocking a real attacker,
  not the proxy standing in front of every visitor.
- **Geolocation** — "show PKR prices because this visitor is in Pakistan"
  needs the real IP.
- **Analytics** — unique visitor counts, rough locations.
- **Audit trails** — "which IP placed this order," useful for fraud
  investigation.

### The concrete failure if this is wrong

With basic rate limiting ("max 5 login attempts per IP per minute")
deployed behind a proxy, without `trust proxy` configured correctly:
- every visitor shares the proxy's IP
- one attacker hitting the login endpoint triggers the limit
- that limit now blocks **every legitimate user too**

Or the opposite failure — trusting the header blindly with no
verification, letting an attacker fake `X-Forwarded-For` themselves and
bypass rate limiting entirely.

---

## SECTION 5 — The Security Warning (proven by accident)

> "it is important to ensure that the last reverse proxy trusted is
> removing/overwriting [these headers], otherwise it may be possible for
> the client to provide any value"

This was demonstrated directly: `X-Forwarded-For` was sent straight from
curl — not an actual proxy, just "the client" adding the header itself. If
`trust proxy: true` is set in a real deployment but nothing strips this
header before the client-facing edge, **anyone can fake their IP** just by
adding a header, exactly as done in testing.

This is a real vulnerability class — spoofed IP-based rate limiting,
geo-restrictions, or audit logs. The setting is only safe when the actual
proxy setup is known to strip/overwrite client-supplied versions of these
headers before they reach the app.

---

## SECTION 6 — The Four Configuration Types (table, condensed)

| Type | What it means | Use for |
|---|---|---|
| **Boolean** | `true` trusts the header entirely; `false` (default) never trusts it | Recognize — `true` alone is risky |
| **IP/subnet** | Name exactly which IPs count as "the proxy" (`'loopback'`, `'uniquelocal'`, etc.) | Self-hosted, specific known proxy — not the current setup |
| **Number** | Trust exactly N hops back | **The one to actually use** — see below |
| **Function** | Fully custom trust logic per IP | Rare escape hatch |

### What "hop" means

A hop = one server the request passes through on its way to the app.

```
client -> proxy -> Express app
          ^
        1 hop
```

`1` hop = one proxy in front (Railway/Vercel's standard setup). If there
were two stacked proxies (`client -> Cloudflare -> own Nginx -> app`),
that would be `2`.

### The line to actually use, for deployment

```ts
app.set('trust proxy', 1);
```

**Why `1`, not `true`:** `true` trusts the header unconditionally — the
exact risk demonstrated above. `1` trusts exactly one hop back, matching
the real, standard single-proxy deployment on Railway/Vercel — specific
instead of unconditional.

**The one thing to verify when deploying:** that the platform actually
strips/overwrites `X-Forwarded-For` before it reaches the app, so a client
can't fake it. On managed platforms this is already handled — not
something to configure manually, just something to know is the reason the
setting is safe there.

---

## SECTION 7 — What Enabling trust proxy Actually Changes

Three `req` properties, verified live:

| Property | Comes from | What it means |
|---|---|---|
| `req.ip` / `req.ips` | `X-Forwarded-For` | The real client IP |
| `req.hostname` | `X-Forwarded-Host` | The real requested hostname |
| `req.protocol` | `X-Forwarded-Proto` | Whether the *original* connection was https, even though the app only sees plain http from the proxy |

The `req.protocol` one is easy to miss and worth remembering: a security
check like `if (req.protocol === 'https')` will silently misbehave without
`trust proxy` set, since the app talks to the proxy over plain http
internally, regardless of what the visitor actually used.

---

## SECTION 8 — What a CDN Is (a related but separate thing)

A follow-up question surfaced this distinction, worth keeping separate:

- **Reverse proxy** — one entry point in front of an app; routing,
  HTTPS, rate limiting. Doesn't inherently care about geography.
- **CDN (Content Delivery Network)** — copies of **static content**
  (images, CSS, JS, sometimes full cached pages) distributed across many
  physical data centers worldwide, so a visitor gets served from a nearby
  location instead of one distant server.

Cloudflare does **both** — acts as a reverse proxy *and* caches/serves
static content from its global network. "Getting a response from your
nearest server" is specifically the CDN half of what it does, not a
universal property of every reverse proxy. A plain self-hosted Nginx
reverse proxy does not give this — it's just one server, wherever it was
deployed.

---

## SECTION 9 — What Happens If the Proxy Itself Goes Down

**Yes, the site goes down too** — genuinely, since 100% of traffic passes
through the proxy first. If it crashes, the app becomes unreachable even
if it's perfectly healthy itself.

**How real companies handle this:** multiple proxy instances, with
something in front of them (another load balancer, or DNS-level failover)
routing around a dead one. For managed services like Cloudflare, this
redundancy is their responsibility, run across many data centers so one
failure doesn't take every site down. On Railway/Vercel, this is already
handled by the platform.

---

## SECTION 10 — CAPTCHA / "Are You Human" Checks

These are the reverse proxy layer doing security filtering — **before the
actual Express app ever receives the request.**

Cloudflare (or similar) inspects incoming traffic for bot-like patterns
(too many requests too fast, suspicious headers, known bad IP ranges). If
suspicious, it **intercepts the request itself** and shows the challenge —
the backend code never runs, never even knows the request happened, until
the visitor passes the check.

This is the "protecting from malicious traffic" job, made concrete and
visible from the visitor's side.

---

## SECTION 11 — What's Actually the Job Right Now (and What Isn't)

### Not the job right now
Setting up or configuring an actual reverse proxy is infrastructure/DevOps
work — a separate skill. Most companies have dedicated people for this, or
use a managed platform that handles it automatically. Writing Nginx config
files, managing SSL certificates by hand, setting up load balancing rules
— none of this is expected at this stage.

### The actual job
1. Deploy to Railway/Vercel/similar — they provide a correctly configured
   reverse proxy automatically.
2. Set the one Express-side line that responds to it:
   ```ts
   app.set('trust proxy', 1);
   ```
3. Know *why* it's needed, so `req.ip`, `req.hostname`, and `req.protocol`
   behave correctly in production instead of silently returning wrong
   values — a bug that is invisible locally and only appears after
   deployment.
4. Recognize the term "reverse proxy" and related names (Nginx,
   Cloudflare, load balancer) in job descriptions and system design
   discussions — expected baseline knowledge for any backend engineer,
   even without configuring one personally.

---

## SECTION 12 — Quick Reference

| Question | Answer |
|---|---|
| What is a reverse proxy? | Software sitting between the internet and the app, forwarding requests |
| Why does it exist? | HTTPS handling, load balancing, security filtering, multi-service routing |
| Why is `req.ip` wrong behind one? | The app receives the proxy's connection, not the client's |
| How is the real IP recovered? | The proxy writes it into the `X-Forwarded-For` header |
| What does `trust proxy` do? | Tells Express to read that header instead of the raw connection |
| `true` vs `1`? | `true` trusts unconditionally (risky); `1` trusts exactly one hop (matches real setup) |
| What is a "hop"? | One server the request passes through on the way to the app |
| Security risk of `true`? | A client can fake the header themselves if nothing strips it first |
| Do I set up a reverse proxy myself? | No — hosting platforms (Railway/Vercel) provide one automatically |
| Reverse proxy vs CDN? | Proxy = routing/security entry point. CDN = geographically distributed static content copies. Cloudflare does both |
| What if the proxy crashes? | The site goes down too — real deployments run multiple proxy instances for this reason |
| What are CAPTCHA checks? | The reverse proxy filtering bot traffic before the backend ever runs |
| Does a proxy sit in front of frontends too? | Yes — any deployed server, frontend or backend |

---

## SECTION 13 — The One Line to Remember

```ts
app.set('trust proxy', 1);
```

Set this before deploying behind any managed hosting platform. Everything
else in the official docs table (subnet names, custom functions, multi-hop
numbers) is for more advanced, self-hosted proxy setups not in use yet —
recognize them, don't memorize them.