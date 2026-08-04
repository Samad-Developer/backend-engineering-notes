const { createServer } = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const hostname = '127.0.0.1';
const port = 3006;

// path.join — build a folder path safely, works on Mac/Linux/Windows alike
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Extensions we actually accept — used with path.extname() below
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR);
  }
}

async function sendJSON(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const { method, url } = req;

  // GET /api/files -> list uploaded files with parsed path info for each
  if (method === 'GET' && url === '/api/files') {
    const filenames = await fs.readdir(UPLOADS_DIR);

    const files = filenames.map((filename) => {
      const fullPath = path.join(UPLOADS_DIR, filename);
      return {
        // path.basename — just the filename
        name: path.basename(filename),
        // path.extname — just the extension
        extension: path.extname(filename),
        // path.dirname — the folder it lives in
        folder: path.dirname(fullPath),
      };
    });

    await sendJSON(res, 200, files);
    return;
  }

  // POST /api/files -> "upload" a file (simulated with a JSON body containing
  // a filename, since we haven't covered real multipart uploads yet)
  if (method === 'POST' && url === '/api/files') {
    let bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));

    req.on('end', async () => {
      try {
        const { filename } = JSON.parse(Buffer.concat(bodyChunks).toString());

        if (!filename) {
          await sendJSON(res, 400, { error: '"filename" is required' });
          return;
        }

        // path.extname — validate the extension is actually allowed
        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          await sendJSON(res, 400, { error: `File type not allowed: ${ext}` });
          return;
        }

        // path.basename with second arg — strip the extension to get a clean name
        const nameOnly = path.basename(filename, ext);

        // Build a unique filename so two uploads never collide
        const uniqueName = `${nameOnly}-${Date.now()}${ext}`;

        // path.join — build the final safe save location
        const savePath = path.join(UPLOADS_DIR, uniqueName);

        // Simulate saving actual file content
        await fs.writeFile(savePath, `Simulated content for ${filename}`);

        await sendJSON(res, 201, {
          savedAs: uniqueName,
          fullPath: savePath,
        });
      } catch (err) {
        await sendJSON(res, 400, { error: 'Invalid JSON body' });
      }
    });

    return;
  }

  // GET /api/files/:filename -> get parsed path details for one specific file
  // Manual routing trick: url looks like /api/files/logo.png
  if (method === 'GET' && url.startsWith('/api/files/')) {
    const filename = url.replace('/api/files/', '');
    const fullPath = path.join(UPLOADS_DIR, filename);

    try {
      const stats = await fs.stat(fullPath);

      // path.parse — get every piece of the path at once, in one object
      const parsed = path.parse(fullPath);

      await sendJSON(res, 200, {
        ...parsed,
        sizeBytes: stats.size,
        lastModified: stats.mtime,
        directoryName: path.dirname(fullPath),
      });
    } catch (err) {
      await sendJSON(res, 404, { error: 'File not found' });
    }
    return;
  }

  await sendJSON(res, 404, { error: 'Route not found' });
});

ensureUploadsDir().then(() => {
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
});