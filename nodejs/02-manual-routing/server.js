const { createServer } = require('node:http');

const hostname = '127.0.0.1';
const port = 3000;

// Fake in-memory "database" of orders — just an array for now.
// (This gets replaced by fs on Day 4, and by Postgres in Stage 3)
let orders = [
  { id: 1, item: 'Zinger Burger' },
  { id: 2, item: 'Fries' },
];

const server = createServer((req, res) => {
  const { method, url } = req;

  // Route 1: GET / -> simple health check
  if (method === 'GET' && url === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Server is running');
    return;
  }

  // Route 2: GET /api/orders -> return the list of orders
  if (method === 'GET' && url === '/api/orders') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(orders));
    return;
  }

  // Route 3: POST /api/orders -> add a new order (body handling comes Day 3)
  if (method === 'POST' && url === '/api/orders') {
    const newOrder = { id: orders.length + 1, item: 'New Item (placeholder)' };
    orders.push(newOrder);
    res.statusCode = 201; // 201 = Created
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newOrder));
    return;
  }

  // Fallback: anything else -> 404 Not Found
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Route not found' }));
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});