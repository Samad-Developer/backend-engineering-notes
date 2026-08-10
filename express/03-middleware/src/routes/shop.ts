import express, { type Request, type Response } from 'express';
import { blockIfBanned } from '../middleware/blockIfBanned.ts';

const router = express.Router();

// ROUTER-LEVEL MIDDLEWARE
// Applies to every route in this router, and ONLY this router.
// Routes outside it (e.g. /public) are unaffected.
//
// Alternative placement: app.use('/api/shop', blockIfBanned, shopRouter)
// Both work. Inside the router = the router protects itself and stays
// protected wherever it is mounted. Outside = the mounting file decides.
router.use(blockIfBanned);

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Shop home' });
});

router.get('/items', (req: Request, res: Response) => {
  res.json({ message: 'Shop items' });
});

export default router;