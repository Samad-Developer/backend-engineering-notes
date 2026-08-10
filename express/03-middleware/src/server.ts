import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { requestContext } from './middleware/context.ts';
import { createLogger } from './middleware/createLogger.ts';
import shopRouter from './routes/shop.ts';
import statusRouter from './routes/status.ts';
import booksRouter from './routes/books.ts';

const app: Express = express();
const port = 3000;

// ============================================================
// APPLICATION-LEVEL MIDDLEWARE (no mount path — runs for everything)
// ============================================================

// BUILT-IN middleware. Must come BEFORE routes, or req.body is undefined
// everywhere. This one line replaces all the manual chunk collection,
// Buffer.concat, toString and JSON.parse from raw Node.
app.use(express.json());

// CONFIGURABLE middleware — note the parentheses. createLogger() runs and
// RETURNS a middleware, which is what app.use() receives.
app.use(createLogger({ prefix: 'APP' }));

// ============================================================
// ROUTES
// ============================================================

// Middleware group applied to one route. Order inside the array matters:
// logRequest reads what addRequestId and addTimestamp attached, so it must
// come last. Move it first and both values are undefined.
app.get('/', requestContext, (req: Request, res: Response) => {
  res.json({ requestId: req.requestId, timestamp: req.timestamp });
});

// Router with its own internal middleware (blockIfBanned)
app.use('/api/shop', shopRouter);

// Router with per-route middleware
app.use('/api/status', statusRouter);

// Router with an auth gate placed mid-file
app.use('/api/books', booksRouter);

// Unaffected by the shop router's middleware — proves scoping works
app.get('/public', (req: Request, res: Response) => {
  res.json({ message: 'public route, never blocked' });
});

// Async throw with NO try/catch. Express 5 catches thrown errors and
// rejected promises automatically and passes them to next(err).
// Express 4 would have crashed the process here.
app.get('/crash', async (req: Request, res: Response) => {
  throw new Error('Something went wrong');
});

// ============================================================
// FINAL HANDLERS — order matters
// ============================================================

// 404 CATCH-ALL — three parameters, so it is NORMAL middleware.
// Reached only when nothing above responded. When an error is in flight,
// Express SKIPS all normal middleware, so this is bypassed and the error
// handler below runs instead.
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ERROR HANDLER — FOUR parameters, always. Express identifies error
// handlers by counting parameters. Remove `next` (even though it is unused)
// and this silently becomes normal middleware that never catches anything.
// Catches errors from ANY route or middleware registered above it.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error caught:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});