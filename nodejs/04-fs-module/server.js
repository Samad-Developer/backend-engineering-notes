const { createServer } = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const hostname = '127.0.0.1';
const port = 3001;

// All our "storage" lives in one dedicated folder, not scattered loose files.
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const LOG_FILE = path.join(DATA_DIR, 'requests.log');

// Ensure the data folder exists before we ever try to read/write inside it.
// Runs once, when the server starts.
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR);
    console.log('Created data directory:', DATA_DIR);
  }
}

// Log every request to a file — using APPEND, since a log is a growing
// history, not a single current state (unlike orders, which we overwrite).
async function logRequest(method, url, statusCode) {
  const line = `[${new Date().toISOString()}] ${method} ${url} -> ${statusCode}\n`;
  await fs.appendFile(LOG_FILE, line);
}

// Read orders from disk. Starts empty if the file doesn't exist yet.
async function readOrders() {
  try {
    const raw = await fs.readFile(ORDERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// Write the full orders array back to disk — OVERWRITE, since this
// represents the current full state of the data, not a history.
async function writeOrders(orders) {
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// Send a JSON response and log the request in one place, so every route
// logs consistently instead of repeating logRequest() calls everywhere.
async function sendJSON(req, res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
  await logRequest(req.method, req.url, statusCode);
}

const server = createServer(async (req, res) => {
  const { method, url } = req;

  // GET /api/orders -> list all orders
  if (method === 'GET' && url === '/api/orders') {
    const orders = await readOrders();
    await sendJSON(req, res, 200, orders);
    return;
  }

  // GET /api/orders/stats -> file size + last modified info about orders.json
  if (method === 'GET' && url === '/api/orders/stats') {
    try {
      const stats = await fs.stat(ORDERS_FILE);
      await sendJSON(req, res, 200, {
        sizeBytes: stats.size,
        lastModified: stats.mtime,
        isFile: stats.isFile(),
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        await sendJSON(req, res, 404, { error: 'No orders file yet' });
      } else {
        await sendJSON(req, res, 500, { error: 'Could not read file stats' });
      }
    }
    return;
  }

  // POST /api/orders -> create a new order
  if (method === 'POST' && url === '/api/orders') {
    let bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));

    req.on('end', async () => {
      try {
        const parsedBody = JSON.parse(Buffer.concat(bodyChunks).toString());

        if (!parsedBody.item) {
          await sendJSON(req, res, 400, { error: '"item" field is required' });
          return;
        }

        const orders = await readOrders();
        const newOrder = { id: orders.length + 1, item: parsedBody.item };
        orders.push(newOrder);
        await writeOrders(orders);

        await sendJSON(req, res, 201, newOrder);
      } catch (err) {
        await sendJSON(req, res, 400, { error: 'Invalid JSON body' });
      }
    });

    return;
  }

  // Fallback: unknown route
  await sendJSON(req, res, 404, { error: 'Route not found' });
});

// Make sure the data folder exists BEFORE the server starts accepting requests.
ensureDataDir().then(() => {
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
});