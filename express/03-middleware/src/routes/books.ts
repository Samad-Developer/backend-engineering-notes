import express, { type Request, type Response, type NextFunction } from 'express';

const router = express.Router();

// A gate that either ends the cycle or attaches data and continues.
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization !== 'Bearer secret123') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.user = { id: '1', name: 'Samad' };
  next();
};

// PUBLIC — registered BEFORE the gate. A GET / request matches here,
// responds, and the cycle ends — it never reaches requireAuth below.
router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'All books (public)' });
});

// THE GATE — everything registered after this line is protected.
// Written once. New protected routes added below inherit it automatically.
router.use(requireAuth);

router.post('/', (req: Request, res: Response) => {
  res.status(201).json({ message: 'Book created', user: req.user });
});

router.delete('/:id', (req: Request, res: Response) => {
  res.json({ message: 'Book deleted', bookId: req.params.id, user: req.user });
});

export default router;