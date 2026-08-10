import express, { type Request, type Response, type NextFunction } from 'express';

const router = express.Router();

const checkingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('checking...');
  next();
};

const firstMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('first middleware');
  next();
};

const secondMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('second middleware');
  next();
};

// PER-ROUTE MIDDLEWARE — passed as arguments, not router.use().
// Scoped to this one route only.

// No middleware at all
router.get('/open', (req: Request, res: Response) => {
  res.json({ message: 'no middleware on this route' });
});

// One middleware
router.get('/checked', checkingMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'one middleware ran' });
});

// Two middleware — run left to right, in written order
router.get('/double', firstMiddleware, secondMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'two middleware ran' });
});

export default router;