# Interview Answers — Server, Port, Hostname

## What is a Server?

> A server is a program that starts once and stays running, listening for
> incoming network requests. Unlike a normal script that runs and exits, a
> server keeps a process alive indefinitely, reacting to requests as they
> arrive. When a client — like a browser or a mobile app — sends a request,
> the server processes it (reads a database, runs some logic) and sends back
> a response. In Node.js, `http.createServer()` is the simplest example: it
> takes a callback that runs every time a request comes in, and I control
> what response gets sent back using the `req` and `res` objects.

## What is a Port?

> A port is a 16-bit number (0–65535) that the operating system uses to route
> incoming network traffic to the correct running process on a machine. Since
> a single computer can have many programs wanting network access at once —
> a browser, Slack, a database, my Node server — the OS needs a way to know
> *which* program a piece of incoming data is meant for. The IP address
> identifies the machine; the port identifies the specific program on that
> machine. Together, IP + port form the full address, like `127.0.0.1:3000`.
> When I call `server.listen(3000)`, I'm not creating port 3000 — I'm asking
> the OS to reserve it and forward matching traffic to my process. That's
> also why you get an `EADDRINUSE` error if another process already holds
> that port — the OS won't hand the same port to two processes at once.

## What is a Hostname?

> A hostname is a human-friendly name that represents a machine on a network,
> which gets resolved to an actual IP address before any connection happens —
> IP addresses are the only thing computers use to actually route traffic.
> For example, `localhost` resolves to `127.0.0.1`, the reserved loopback
> address meaning "this same machine" — useful for local development since it
> never leaves the machine or touches a real network. In production,
> `rollinn.com` would resolve via DNS to the real public IP of the server
> hosting it. Whether I type a friendly hostname or a raw IP directly, the
> underlying mechanism is identical — DNS (or a local hosts file for
> `localhost`) is just the lookup step that happens first.

## Quick Analogy (good for wrapping up any of these answers)

> Think of it like an apartment building: the IP address is the building's
> street address, the port is the specific apartment number inside it, and
> the hostname is just the nickname people use instead of memorizing the
> street address directly.