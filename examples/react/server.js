import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import * as nodeURL from "node:url";

import handler from "./build/entry.server.js";

const server = http.createServer(async (req, res) => {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`
  );

  if (url.pathname.match(/\.(js|map)$/)) {
    const fsPath = path.join(process.cwd(), "public", url.pathname.slice(1));
    if (fs.existsSync(fsPath)) {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.write(fs.readFileSync(fsPath));
      res.end();
      return;
    }
  }

  try {
    await handler({ res, url });
  } catch (error) {
    console.error("Uncaught error:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  }
});

server.listen(3000, () => {
  console.log("\nListening on http://localhost:3000");
});
