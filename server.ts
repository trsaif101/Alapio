import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("alapio.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    avatar TEXT,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT,
    content TEXT,
    type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'document'
    file_url TEXT,
    file_name TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
    maxHttpBufferSize: 1e8, // 100MB for file transfers
  });

  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { id, username, avatar } = req.body;
    try {
      db.prepare("INSERT OR REPLACE INTO users (id, username, avatar) VALUES (?, ?, ?)")
        .run(id, username, avatar);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/messages/:userId1/:userId2", (req, res) => {
    const { userId1, userId2 } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
      ORDER BY timestamp ASC
    `).all(userId1, userId2, userId2, userId1);
    res.json(messages);
  });

  // Socket.io Logic
  const onlineUsers = new Map<string, string>(); // socketId -> userId

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userId: string) => {
      onlineUsers.set(socket.id, userId);
      socket.join(userId);
      console.log(`User ${userId} joined`);
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("send_message", (data) => {
      const { id, sender_id, receiver_id, content, type, file_url, file_name } = data;
      
      // Save to DB
      db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, content, type, file_url, file_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, sender_id, receiver_id, content, type, file_url, file_name);

      // Emit to receiver
      io.to(receiver_id).emit("receive_message", data);
      // Emit back to sender for confirmation/sync if needed (though client usually handles optimistic update)
    });

    socket.on("typing", (data) => {
      io.to(data.receiver_id).emit("user_typing", { sender_id: data.sender_id });
    });

    socket.on("disconnect", () => {
      const userId = onlineUsers.get(socket.id);
      if (userId) {
        onlineUsers.delete(socket.id);
        io.emit("user_status", { userId, status: "offline" });
        db.prepare("UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
      }
      console.log("User disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
