# Express — Health Checks & Graceful Shutdown

---

## SECTION 1 — The Base: What Problem This Solves

Deploying a new version of an app means replacing the old running process
with a new one. The naive way: kill the old process immediately.

**The problem:** at that exact moment, real users might be mid-request —
placing an order, mid-checkout. Killing the process instantly cuts them off
with no response at all.

**This page is about swapping cleanly** — telling the old process "you're
about to be replaced, finish what you're doing first" instead of yanking
it away instantly.

---

## SECTION 2 — Graceful Shutdown

```ts
const server = app.listen(port);

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

**`SIGTERM`** — a signal the operating system, hosting platform, or Docker
sends to a process meaning "please shut down." A *polite request*, not a
violent kill — different from `SIGKILL`, which forces immediate
termination with no chance to clean up.

**`process.on('SIGTERM', ...)`** — the same pattern already known from
`process` (Day 5 deep-dive) and `.on()` (the EventEmitter pattern from
`req.on('data', ...)`). Listening for an event — just the source is the OS
instead of a network stream.

**`server.close(callback)`** — the key mechanic. Tells the server: stop
accepting brand-new connections, but let any request already in progress
finish naturally. The callback only fires once every in-flight request has
actually completed. This is what "graceful" means — nobody gets cut off
mid-request.

**`process.exit(0)`** — added beyond the docs' version. Once
`server.close()` finishes, explicitly tell Node to exit. `0` means
"exited cleanly, no error" — the same status-code convention learned back
in Node core (`process.exit(code)`).

### Confusion resolved: does this code run at startup?

**No.** It does nothing when the file starts — it just registers a
listener and waits silently. Nothing runs until `SIGTERM` actually
arrives, exactly like a route handler doesn't run until a matching
request arrives.

**Verified live:** sent a real `SIGTERM` to a running process using
`kill -TERM`. Output:
```
SIGTERM received: closing server gracefully
Server closed
```
Confirmed the exact sequence runs only when the signal is received, not
before.

### Who actually sends SIGTERM, and when

**Not the app's own code, and not done manually.** The hosting platform's
infrastructure (Railway, Docker, Kubernetes) sends it automatically during
a deploy, following roughly this sequence:

1. New code is pushed
2. Platform builds and starts a **new** process with the updated code
3. Waits for the new one to report "ready" (this is where health checks
   matter)
4. Switches incoming traffic to the new process
5. Sends `SIGTERM` to the **old** process
6. Old process finishes in-flight requests, then fully exits
7. Old container is removed

The app's only job is to **listen** for the signal and react properly —
never to send it or manage the swap itself.

### Why Vercel never showed this

Vercel's Next.js hosting is largely **serverless** — each request can spin
up a short-lived function invocation rather than one long-running process.
There's no persistent process to gracefully shut down in the same sense.
An Express app deployed to Railway is the opposite: one long-running
process alive the whole time, handling many requests over its lifetime —
exactly why it needs explicit shutdown handling that serverless doesn't.

---

## SECTION 3 — Health Checks

**The question this answers:** how does a load balancer know if a running
app instance is actually working, versus frozen, crashed, or still
starting up?

### Liveness vs Readiness

**Liveness** = "are you alive at all?" A basic pulse check. If it fails
repeatedly, the instance is assumed stuck or dead, and the orchestrator
**restarts** it.

**Readiness** = "are you alive AND ready to accept real traffic right
now?" An app can be alive (process running) but not yet ready (still
connecting to the database, still warming up). If not ready, the system
**pauses traffic** to it — no restart, just waits until it reports ready.

**Key difference in one line:** liveness failing -> restart the app.
Readiness failing -> just pause traffic, no restart, since it's not
broken, just not ready yet.

**Analogy:** liveness is checking if a restaurant is open at all.
Readiness is checking if the kitchen has finished prepping and can
actually take orders right now, even though the doors are open.

### What this looks like in code

```ts
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});
```

The load balancer pings this route periodically. A `200` means healthy; no
response or an error means something's wrong, and traffic gets rerouted
away from this instance.

**Verified live:**
```
GET /health -> {"status":"ok"}
```

A more thorough version would check a real dependency (e.g. the database
connection) before answering — reporting "ready" only once that connection
is actually established.

---

## SECTION 4 — What to Actually Do

**Nothing right now.** Both pieces of code are complete, tested, and ready
to paste in — but they do nothing useful while running only on a local
machine, since nothing is sending a local process a real `SIGTERM`, and no
load balancer exists yet to check `/health`.

**Add both at the actual deployment stage** of the roadmap (Docker/
Railway), directly in `src/index.ts`:

```ts
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

---

## SECTION 5 — Quick Reference

| Question | Answer |
|---|---|
| What does SIGTERM mean? | "Please shut down" — a polite request, not a force-kill |
| Who sends it? | The hosting platform/orchestrator, during a deploy or shutdown — never the app itself |
| Does the SIGTERM code run at startup? | No — it only registers a listener; runs later when the signal arrives |
| What does server.close() actually do? | Stops new connections, lets in-flight requests finish, then fires its callback |
| Liveness vs readiness? | Liveness failing = restart. Readiness failing = pause traffic, no restart |
| Why didn't Vercel ever show this? | Serverless — short-lived function invocations, no persistent process to shut down |
| When to add this code? | At actual deployment (Docker/Railway stage) — does nothing useful locally |