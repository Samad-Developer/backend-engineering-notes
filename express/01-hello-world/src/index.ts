import express, { type Express, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// In ES Modules (__dirname does NOT exist), this is how we recreate it.
// Needed so static file paths are absolute, not dependent on where we run node from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();
const port = 3001;

// ---------- STATIC FILES ----------
// Serves everything inside the "public" folder automatically.
// path.join(__dirname, '..', 'public') makes it an ABSOLUTE path, so it works
// no matter which directory we launch the node process from.
// Note: "public" does NOT appear in the URL.
//   public/css/style.css  ->  http://localhost:3000/css/style.css
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- BASIC ROUTES ----------
// Formula: app.METHOD(PATH, HANDLER)

// GET /
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// POST / — same path as above, different method = a completely separate route
app.post('/', (req: Request, res: Response) => {
  res.send('Got a POST request');
});

// PUT /user
app.put('/user', (req: Request, res: Response) => {
  res.send('Got a PUT request at /user');
});

// DELETE /user
app.delete('/user', (req: Request, res: Response) => {
  res.send('Got a DELETE request at /user');
});

// Any path/method combination not registered above returns 404 automatically.
// Express handles this — no fallback block needed like in raw Node.

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});