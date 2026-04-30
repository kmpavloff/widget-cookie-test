const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  let filePath = req.url === "/" ? "/index.html" : req.url;
  const ext = path.extname(filePath);
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "application/javascript",
  };

  fs.readFile(path.join("/app", filePath), (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
    res.end(data);
  });
});

server.listen(3000, "0.0.0.0", () => {
  console.log(`${process.env.SITE_NAME} serving on port 3000`);
});
