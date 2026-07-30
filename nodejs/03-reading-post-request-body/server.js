const { createServer } = require('node:http');

const hostname = '127.0.0.1';
const port = 3000;

let orders = [
  { id: 1, item: 'Zinger Burger' },
  { id: 2, item: 'Fries' },
];

const server = createServer((req, res) => {
  const { method, url } = req;

  if (method === 'GET' && url === '/api/orders') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(orders));
    return;
  }

  if (method === 'POST' && url === '/api/orders') {
    // The body doesn't arrive all at once — it streams in as chunks.
    let bodyChunks = [];

    // Fires every time a new piece of the request body arrives.
    req.on('data', (chunk) => {
      bodyChunks.push(chunk);
    });

    // Fires once, after all chunks have arrived.
    req.on('end', () => {
      try {
        // Buffer.concat joins all chunks into one Buffer, then we convert
        // it to a string, then parse that string as JSON.
        const rawBody = Buffer.concat(bodyChunks).toString();
        const parsedBody = JSON.parse(rawBody);

        // Basic validation — real validation (Zod) comes later in the roadmap.
        if (!parsedBody.item) {
          res.statusCode = 400; // Bad Request
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: '"item" field is required' }));
          return;
        }

        const newOrder = {
          id: orders.length + 1,
          item: parsedBody.item,
        };
        orders.push(newOrder);

        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(newOrder));
      } catch (err) {
        // JSON.parse throws if the body isn't valid JSON at all.
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });

    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Route not found' }));
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});