import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import books from './routes/books.ts';
import authors from './routes/authors.ts';

const app: Express = express();
const port = 3002;

// ============================================================
// PART 1 — Basic routes
// ============================================================

app.get('/', (req: Request, res: Response) => {
  res.send('Bookstore API');
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Same path as above, different method = a completely separate route
app.post('/', (req: Request, res: Response) => {
  res.send('Got a POST at root');
});

// app.all runs for EVERY HTTP method at this path.
// It calls next() instead of responding, so control passes onward.
app.all('/secret', (req: Request, res: Response, next: NextFunction) => {
  console.log('Secret accessed');
  next();
});

// Only GET is handled. POST /secret still logs above, then 404s
// because no POST handler exists for this path.
app.get('/secret', (req: Request, res: Response) => {
  res.send('Secret page');
});

// ============================================================
// PART 2 — Route parameters
// ============================================================

// Named params. req.params values are ALWAYS strings.
app.get('/orders/:orderId/items/:itemId', ordersHandler);

// Hyphen is literal, so it works as a separator inside one segment.
// /reports/2024-2025 -> { from: '2024', to: '2025' }
app.get('/reports/:from-:to', (req: Request, res: Response) => {
  res.json(req.params);
});

// Wildcard captures everything after the prefix as an ARRAY of segments,
// not a string. Type must be declared as string[].
app.get('/docs/*filepath', (req: Request<{ filepath: string[] }>, res: Response) => {
  res.json({
    params: req.params,
    path: req.params.filepath.join('/'),
  });
});

// Optional segment. Note BOTH colons: :name and :extension.
// Writing {.extension} without the colon makes it a literal string, not a param.
// /media/cover.jpg -> { name: 'cover', extension: 'jpg' }
// /media/cover     -> { name: 'cover' }
app.get('/media/:name{.:extension}', (req: Request, res: Response) => {
  res.json(req.params);
});

// Slash INSIDE the braces, so the whole segment is optional.
// /invoice/99 -> { id: '99' }
// /invoice    -> {}
app.get('/invoice{/:id}', (req: Request, res: Response) => {
  res.json(req.params);
});

// ============================================================
// PART 3 — Multiple handlers
// ============================================================

const firstHandler = (req: Request, res: Response, next: NextFunction) => {
  console.log('First handler');
  next();
};

const secondHandler = (req: Request, res: Response, next: NextFunction) => {
  console.log('Second handler');
  next();
};

// Arrays are flattened — [a, b] behaves identically to a, b.
// Execution is strictly left to right.
app.get(
  '/chain',
  [firstHandler, secondHandler],
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Third handler');
    next();
  },
  (req: Request, res: Response) => {
    console.log('Final handler');
    res.json({ message: 'Final handler' });
  },
);

// next('route') abandons THIS route entirely and looks for the next
// matching route. `return` is needed so res.json below doesn't also run.
app.get('/product/:id', (req: Request, res: Response, next: NextFunction) => {
  if (req.params.id === 'legacy') {
    return next('route');
  }
  res.json({ message: 'Normal product', productId: req.params.id });
});

// Only reached when the route above calls next('route').
// Response is deliberately DIFFERENT so the two paths are distinguishable.
app.get('/product/:id', (req: Request, res: Response) => {
  res.json({ message: 'Legacy product handler', productId: req.params.id });
});

// ============================================================
// PART 4 — app.route()
// ============================================================

// Path written once instead of three times. Behaviourally identical
// to three separate app.get/post/delete calls.
app
  .route('/cart')
  .get((req: Request, res: Response) => {
    res.json({ message: 'Get cart' });
  })
  .post((req: Request, res: Response) => {
    res.json({ message: 'Add to cart' });
  })
  .delete((req: Request, res: Response) => {
    res.json({ message: 'Delete cart' });
  });

// ============================================================
// PART 5 — Routers
// ============================================================

app.use('/api/books', books);

// Mount path contains a param, so the router needs mergeParams: true
app.use('/api/publishers/:publisherId/authors', authors);

// ============================================================
// PART 6 — Gotchas
// ============================================================

// Query strings are NOT part of route matching.
// /search?q=x matches this route; read values from req.query.
// Like req.params, all values are strings.
app.get('/search', (req: Request, res: Response) => {
  res.json(req.query);
});

// Handler defined separately from the route, so TypeScript cannot see
// the path — params must be declared explicitly in Request<{...}>.
function ordersHandler(
  req: Request<{ orderId: string; itemId: string }>,
  res: Response,
) {
  res.json({
    orderId: req.params.orderId,
    itemId: req.params.itemId,
  });
}

// Dot is literal in a string path — matches /pricing.info exactly,
// NOT /pricingXinfo.
app.get('/pricing.info', (req: Request, res: Response) => {
  res.json({ message: 'Literal dot in path' });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});