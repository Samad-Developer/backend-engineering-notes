import express, { type Request, type Response, type NextFunction } from 'express';

// mergeParams: true is REQUIRED here.
// Without it, a param from the MOUNT PATH (:publisherId) is invisible
// inside this router — req.params.publisherId would be undefined.
const router = express.Router({ mergeParams: true });

const authorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`Authors router hit: ${req.method} ${req.path}`);
  next();
};

router.use(authorsMiddleware);

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'All authors' });
});

router.post('/', (req: Request, res: Response) => {
  res.json({ message: 'Create a new author' });
});

// Handler is inline but the param comes from the mount path, so TypeScript
// cannot infer it — it must be declared explicitly in Request<{...}>.
router.get('/:authorId', (req: Request<{ publisherId: string; authorId: string }>, res: Response) => {
  res.json({
    publisherId: req.params.publisherId,
    authorId: req.params.authorId,
  });
});

router.put('/:authorId', (req: Request<{ publisherId: string; authorId: string }>, res: Response) => {
  res.json({ message: 'Update author', authorId: req.params.authorId });
});

router.delete('/:authorId', (req: Request<{ publisherId: string; authorId: string }>, res: Response) => {
  res.json({ message: 'Delete author', authorId: req.params.authorId });
});

export default router;