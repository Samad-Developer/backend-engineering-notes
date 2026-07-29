 import { createServer } from "node:http"

 const hostname = "127.0.0.1";
 const port = 3000;

 const server = createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("This is my first nodejs code!");
 });

 server.listen(port, hostname, () => {
    console.log(`server is running at http://${hostname}:${port}/`)
 })