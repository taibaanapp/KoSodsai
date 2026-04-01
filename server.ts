import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import * as line from "@line/bot-sdk";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Database
const db = new Database("kosodsai.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    displayName TEXT,
    pictureUrl TEXT,
    firstJoined DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// LINE config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: lineConfig.channelAccessToken,
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

  app.use(cors());

  // LINE Webhook (MUST be before express.json())
  app.post("/api/webhook", line.middleware(lineConfig), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error("Webhook Error:", err);
        res.status(500).end();
      });
  });

  app.use(express.json());

  // Root route for health check
  app.get("/", (req, res) => {
    res.send("<h1>KoSodsai Server is Online!</h1><p>Webhook is at /api/webhook</p>");
  });

  // Auth/User API
  app.post("/api/user/sync", (req, res) => {
    const { userId, displayName, pictureUrl } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const user = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId) as any;
    
    if (user) {
      db.prepare("UPDATE users SET lastLogin = CURRENT_TIMESTAMP, displayName = ?, pictureUrl = ? WHERE userId = ?")
        .run(displayName, pictureUrl, userId);
    } else {
      db.prepare("INSERT INTO users (userId, displayName, pictureUrl) VALUES (?, ?, ?)")
        .run(userId, displayName, pictureUrl);
    }

    const updatedUser = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
    res.json(updatedUser);
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "KoSodsai API is running" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

async function handleEvent(event: any) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const userMessage = event.message.text;

  // Sync user on message
  try {
    const profile = await client.getProfile(userId);
    const user = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId) as any;
    if (user) {
      db.prepare("UPDATE users SET lastLogin = CURRENT_TIMESTAMP, displayName = ? WHERE userId = ?")
        .run(profile.displayName, userId);
    } else {
      db.prepare("INSERT INTO users (userId, displayName, pictureUrl) VALUES (?, ?, ?)")
        .run(userId, profile.displayName, profile.pictureUrl);
    }
  } catch (err) {
    console.error("Error fetching profile during webhook", err);
  }

  const replyText = `สวัสดีคุณ ${userId}\nคุณส่งข้อความว่า: "${userMessage}"\nเราบันทึกการใช้งานของคุณแล้ว!`;

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: "text", text: replyText } as any],
  });
}

startServer();
