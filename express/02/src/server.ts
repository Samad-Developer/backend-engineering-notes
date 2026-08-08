import express, { type Request, type Response, type Express, type NextFunction } from 'express';

const app: Express = express();
const port = 3002;

// part 1 : basic routes
app.get('/', (req: Request, res: Response) => {
  res.send('Bookstore API');
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/', (req: Request, res: Response) => {
  res.send('Got a POST at root');
});

app.all('/secret', (req: Request, res: Response, next: NextFunction) => {
    console.log('Secret accessed');
    next();
});

app.get('/secret', (req: Request, res: Response) => {
    res.send('Secret page');
});

// part 2 : route parameters
app.get('/orders/:orderId/items/:itemId', (req: Request, res: Response) => {
    res.json(req.params);
});

app.get('/reports/:from-:to', (req: Request, res: Response) => {
    res.json(req.params);
});

app.get('/docs/*filepath', (req: Request<{filepath: string[]}>, res: Response) => {
    const filepath = req.params.filepath.join('/')
    res.json({ params: req.params, path: filepath });
});

app.get('/media/:name{.:extension}', (req: Request, res: Response) => {
    res.json(req.params);
});

app.get('/invoice{/:id}', (req: Request, res: Response) => {
    res.json(req.params);
});

// server is running on port 3002
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});