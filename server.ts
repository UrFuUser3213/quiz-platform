import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { initSocket } from "./src/server/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  initSocket(server);

  server.listen(port, () => {
    console.log(`> QuizLive ready on http://${hostname}:${port}`);
  });
});
