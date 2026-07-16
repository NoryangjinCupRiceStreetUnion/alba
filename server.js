import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "localhost";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  globalThis.__socketIo = io;

  io.on("connection", (socket) => {
    socket.on("join-chat", (chatId) => {
      if (typeof chatId === "string" && chatId.trim()) {
        socket.join(chatId);
      }
    });

    socket.on("leave-chat", (chatId) => {
      if (typeof chatId === "string" && chatId.trim()) {
        socket.leave(chatId);
      }
    });

    socket.on("send-message", ({ chatId, message }) => {
      if (typeof chatId !== "string" || !chatId.trim() || !message || typeof message !== "object") {
        return;
      }

      io.to(chatId).emit("new-message", message);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
