
// Load .env file contents into process.env — must happen before anything
// else that reads process.env
require('dotenv').config();

const { createServer } = require('node:http');

const hostname = '127.0.0.1';

// Read from process.env instead of hardcoding — falls back to 3000 if
// PORT isn't set at all, a common safe-default pattern
const port = process.env.PORT || 3000;

console.log('App name from .env:', process.env.APP_NAME);
console.log('Node platform:', process.platform);
console.log('Command-line args:', process.argv);

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      message: `Hello from ${process.env.APP_NAME}`,
      // NEVER actually send secrets back in a real response —
      // this is just to prove process.env is working
      secretLoaded: Boolean(process.env.SECRET_MESSAGE),
    })
  );
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});