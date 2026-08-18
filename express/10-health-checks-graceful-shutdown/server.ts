import express, { type Express, type Request, type Response } from 'express';

const app: Express = express();
const port = 3700;

// A tiny route the load balancer/host pings periodically to check health.
// Liveness: "is this process alive at all?"
// Readiness: "is it actually ready to serve real traffic right now?"
// This simple version answers both with one 200 — a real app might check
// a database connection before answering "ready".
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// server.listen() returns a real Server object — keep a reference to it,
// since we need to call .close() on it later.
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// SIGTERM is a signal the hosting platform (Railway, Docker, Kubernetes)
// sends when it's about to replace this process during a deploy, or shut
// it down. It's a POLITE request, not a force-kill (that's SIGKILL).
//
// This does NOT run at startup — it just registers a listener and waits.
// It only fires later, whenever the platform actually sends the signal.
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server gracefully');

  // server.close() stops accepting NEW connections, but lets any request
  // already in progress finish naturally before the callback fires.
  // Nobody mid-request gets cut off.
  server.close(() => {
    console.log('Server closed');
    process.exit(0); // 0 = exited cleanly, no error
  });
});