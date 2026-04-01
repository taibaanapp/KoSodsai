import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import * as line from "@line/bot-sdk";
import Database from "better-sqlite3";
import Fuse from "fuse.js";
import fs from "fs";

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
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    type TEXT, -- income/expense
    category TEXT,
    amount REAL,
    note TEXT,
    cowName TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    rawText TEXT,
    status TEXT DEFAULT 'pending' -- pending/confirmed
  );

  CREATE TABLE IF NOT EXISTS cows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    name TEXT,
    UNIQUE(userId, name)
  );
`);

// LINE config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: lineConfig.channelAccessToken,
});

// Load Keywords
let masterData: any = { categories: [], cows: [], synonyms: {} };
try {
  const data = fs.readFileSync("./keywords.json", "utf-8");
  masterData = JSON.parse(data);
} catch (err) {
  console.error("Error loading keywords.json", err);
}

// Setup Fuse.js for fuzzy matching
const allKeywords = masterData.categories.flatMap((cat: any) => 
  cat.keywords.map((kw: string) => ({ word: kw, categoryId: cat.id, type: cat.type, label: cat.label }))
);
const fuse = new Fuse(allKeywords, { keys: ["word"], threshold: 0.4 });

function parseMessage(text: string, userId: string) {
  const result: any = {
    type: "unknown",
    category: "ทั่วไป",
    amount: 0,
    cowName: "โดยรวม",
    note: text,
    date: new Date().toISOString()
  };

  // 1. Extract Amount (Regex)
  const amountMatch = text.match(/(\d+([.,]\d+)?)/);
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[0].replace(",", ""));
  }

  // 2. Stage 1 & 2: Category Search (Exact & Fuzzy)
  const words = text.split(/\s+|ให้|กับ|ค่า|ของ/);
  let bestMatch: any = null;

  for (const word of words) {
    if (!word || word.length < 2) continue;
    
    // Fuzzy search
    const matches = fuse.search(word);
    if (matches.length > 0) {
      bestMatch = matches[0].item;
      break;
    }
  }

  if (bestMatch) {
    result.type = bestMatch.type;
    result.category = bestMatch.label;
  }

  // 3. User-specific Cow Search
  const userCows = db.prepare("SELECT name FROM cows WHERE userId = ?").all(userId) as { name: string }[];
  if (userCows.length > 0) {
    const cowNames = userCows.map(c => c.name);
    const userCowFuse = new Fuse(cowNames, { threshold: 0.3 });
    
    for (const word of words) {
      const matches = userCowFuse.search(word);
      if (matches.length > 0) {
        result.cowName = matches[0].item;
        break;
      }
    }
  }

  return result;
}

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

  // Cow Management API
  app.get("/api/cows", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const cows = db.prepare("SELECT * FROM cows WHERE userId = ?").all(userId);
    res.json(cows);
  });

  app.post("/api/cows", (req, res) => {
    const { userId, name } = req.body;
    if (!userId || !name) return res.status(400).json({ error: "userId and name are required" });
    try {
      db.prepare("INSERT INTO cows (userId, name) VALUES (?, ?)").run(userId, name);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Cow already exists or database error" });
    }
  });

  app.delete("/api/cows/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM cows WHERE id = ?").run(id);
    res.json({ success: true });
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

  // 1. Parse Message
  const parsed = parseMessage(userMessage, userId);

  // 2. Save to Database
  try {
    db.prepare(`
      INSERT INTO transactions (userId, type, category, amount, note, cowName, rawText)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, parsed.type, parsed.category, parsed.amount, parsed.note, parsed.cowName, userMessage);
  } catch (err) {
    console.error("Error saving transaction", err);
  }

  // 3. Sync user profile
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

  const typeLabel = parsed.type === "income" ? "🟢 รายรับ" : parsed.type === "expense" ? "🔴 รายจ่าย" : "❓ ไม่ระบุ";
  
  const replyText = `บันทึกข้อมูลแล้วครับ! 📝\n\n` +
    `📌 เรื่อง: ${parsed.category}\n` +
    `💰 ประเภท: ${typeLabel}\n` +
    `🐮 วัว: ${parsed.cowName}\n` +
    `💵 ยอดเงิน: ${parsed.amount.toLocaleString()} บาท\n\n` +
    `หากข้อมูลไม่ถูกต้อง คุณสามารถแก้ไขได้ที่หน้าเว็บ KoSodsai ครับ`;

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: "text", text: replyText } as any],
  });
}

startServer();
