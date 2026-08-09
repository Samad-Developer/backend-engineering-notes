import express, { type Request, type Response, type NextFunction } from 'express';

const router = express.Router();

// Router-level middleware — runs for EVERY request that reaches this router,
// but not for routes outside it.
const booksMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`Books router hit: ${req.method} ${req.path}`);
  next();
};

router.use(booksMiddleware);

// Paths here are written WITHOUT the mount prefix.
// Mounted at /api/books, so '/' below becomes /api/books
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'All books' });
});

router.post('/', (req: Request, res: Response) => {
  res.json({ message: 'Create a new book' });
});

router.get('/:bookId', (req: Request, res: Response) => {
  res.json({ message: 'Get book', bookId: req.params.bookId });
});

router.put('/:bookId', (req: Request, res: Response) => {
  res.json({ message: 'Update book', bookId: req.params.bookId });
});

router.delete('/:bookId', (req: Request, res: Response) => {
  res.json({ message: 'Delete book', bookId: req.params.bookId });
});

export default router;